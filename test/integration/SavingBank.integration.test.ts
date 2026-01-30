import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { advanceTimeByDays } from "../helpers/time";
import { ONE_USDC } from "../helpers/constants";

/**
 * @title SavingBank Integration Tests
 * @notice Full flow integration tests covering complete user journeys
 * @dev Tests multi-contract interactions: SavingBank <-> Vault <-> DepositCertificate
 */
describe("SavingBank Integration Tests", function () {
  
  // Deploy fixture that creates all contracts and saving plan
  async function deployIntegrationFixture() {
    const [deployer, admin, pauser, user1, user2, feeReceiver] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();

    // Deploy DepositCertificate
    const DepositCertificate = await ethers.getContractFactory("DepositCertificate");
    const depositCertificate = await DepositCertificate.deploy(
      "SavingBank Deposit Certificate",
      "SBDC"
    );

    // Deploy Vault
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(mockUSDC.target);

    // Deploy SavingBank with vault separation
    const SavingBank = await ethers.getContractFactory("SavingBank");
    const savingBank = await SavingBank.deploy(
      mockUSDC.target,
      depositCertificate.target,
      vault.target
    );

    // Setup roles for vault separation
    const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
    const WITHDRAW_ROLE = await vault.WITHDRAW_ROLE();
    const MINTER_ROLE = await depositCertificate.MINTER_ROLE();
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    const PAUSER_ROLE = await savingBank.PAUSER_ROLE();

    // Grant roles
    await vault.grantRole(LIQUIDITY_MANAGER_ROLE, savingBank.target);
    await vault.grantRole(LIQUIDITY_MANAGER_ROLE, deployer.address);
    await vault.grantRole(WITHDRAW_ROLE, savingBank.target);
    await depositCertificate.grantRole(MINTER_ROLE, savingBank.target);
    await savingBank.grantRole(ADMIN_ROLE, admin.address);
    await savingBank.grantRole(PAUSER_ROLE, pauser.address);

    // Mint test tokens to users
    await mockUSDC.mint(user1.address, 1000000n * ONE_USDC);
    await mockUSDC.mint(user2.address, 1000000n * ONE_USDC);
    await mockUSDC.mint(deployer.address, 10000000n * ONE_USDC);

    // Create default saving plan
    await savingBank.createSavingPlan({
      name: "Default Plan",
      minDepositAmount: 100n * ONE_USDC,
      maxDepositAmount: 0n,
      minTermInDays: 1,
      maxTermInDays: 365,
      annualInterestRateInBasisPoints: 800n,
      penaltyRateInBasisPoints: 100n
    });

    // Add initial vault liquidity
    const liquidityAmount = 100000n * ONE_USDC;
    await mockUSDC.connect(deployer).approve(vault.target, liquidityAmount);
    await vault.connect(deployer).depositLiquidity(liquidityAmount);

    return {
      mockUSDC,
      depositCertificate,
      vault,
      savingBank,
      deployer,
      admin,
      pauser,
      user1,
      user2,
      feeReceiver
    };
  }

  // Helper to get deposit/certificate ID from transaction
  async function getDepositIdFromTx(tx: any) {
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => 
      log.fragment && log.fragment.name === 'DepositCreated'
    );
    return {
      depositId: event.args[0],
      certificateId: event.args[6]
    };
  }
  
  /**
   * =====================================================
   * FULL FLOW TESTS - Complete User Journeys
   * =====================================================
   */
  describe("Full Flow Tests", function () {
    
    it("should complete full deposit-maturity-withdraw flow", async function () {
      const { savingBank, mockUSDC, depositCertificate, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const termDays = 30;
      const planId = 1;
      
      // User approves and creates deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, termDays);
      const { depositId, certificateId } = await getDepositIdFromTx(tx);
      
      // Verify NFT ownership
      expect(await depositCertificate.ownerOf(certificateId)).to.equal(user1.address);
      
      // Advance time to maturity
      await advanceTimeByDays(termDays + 1);
      
      // Withdraw at maturity
      const userBalanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingBank.connect(user1).withdrawDeposit(depositId);
      const userBalanceAfter = await mockUSDC.balanceOf(user1.address);
      
      // Verify user received principal + interest (using BigInt comparison)
      const totalReceived = userBalanceAfter - userBalanceBefore;
      expect(totalReceived > depositAmount).to.be.true; // Received more than principal
      
      // Verify deposit is no longer active
      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.status).to.not.equal(0n); // Not Active status
    });

    it("should complete early withdrawal flow with penalty", async function () {
      const { savingBank, mockUSDC, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const termDays = 90;
      const planId = 1;
      
      // Create deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, termDays);
      const { depositId } = await getDepositIdFromTx(tx);
      
      // Early withdrawal after 30 days (before 90-day maturity)
      await advanceTimeByDays(30);
      
      const userBalanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingBank.connect(user1).withdrawDeposit(depositId);
      const userBalanceAfter = await mockUSDC.balanceOf(user1.address);
      
      // User should receive less than principal due to penalty (using BigInt comparison)
      const amountReceived = userBalanceAfter - userBalanceBefore;
      expect(amountReceived < depositAmount).to.be.true; // Penalty applied
    });

    it("should complete renew flow at maturity", async function () {
      const { savingBank, mockUSDC, depositCertificate, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const initialTerm = 30;
      const renewTerm = 60;
      const planId = 1;
      
      // Create deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, initialTerm);
      const { depositId, certificateId } = await getDepositIdFromTx(tx);
      
      // Advance to maturity
      await advanceTimeByDays(initialTerm + 1);
      
      // Renew deposit (newPlanId = 1, newTermInDays = 60)
      const depositBefore = await savingBank.getDeposit(depositId);
      const renewTx = await savingBank.connect(user1).renewDeposit(depositId, planId, renewTerm);
      
      // Get new deposit ID from event
      const renewReceipt = await renewTx.wait();
      const renewEvent = renewReceipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'DepositRenewed'
      );
      const newDepositId = renewEvent?.args[1];
      const depositAfter = await savingBank.getDeposit(newDepositId);
      
      // Verify new principal includes interest (compound)
      expect(depositAfter.amount > depositBefore.amount).to.be.true;
      
      // Verify new term (compare as numbers)
      expect(Number(depositAfter.termInDays)).to.equal(renewTerm);
    });
  });

  /**
   * =====================================================
   * MULTI-USER SCENARIOS
   * =====================================================
   */
  describe("Multi-User Scenarios", function () {
    
    it("should handle multiple users with concurrent deposits", async function () {
      const { savingBank, mockUSDC, depositCertificate, user1, user2 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // User1 deposits
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx1 = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { certificateId: cert1 } = await getDepositIdFromTx(tx1);
      
      // User2 deposits
      await mockUSDC.connect(user2).approve(savingBank.target, depositAmount * 2n);
      const tx2 = await savingBank.connect(user2).createDeposit(planId, depositAmount * 2n, 60);
      const { certificateId: cert2 } = await getDepositIdFromTx(tx2);
      
      // Verify separate NFTs
      expect(await depositCertificate.ownerOf(cert1)).to.equal(user1.address);
      expect(await depositCertificate.ownerOf(cert2)).to.equal(user2.address);
    });

    it("should handle user1 withdrawing while user2 continues", async function () {
      const { savingBank, mockUSDC, depositCertificate, user1, user2 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // Both users deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx1 = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId: dep1 } = await getDepositIdFromTx(tx1);
      
      await mockUSDC.connect(user2).approve(savingBank.target, depositAmount);
      const tx2 = await savingBank.connect(user2).createDeposit(planId, depositAmount, 90);
      const { depositId: dep2, certificateId: cert2 } = await getDepositIdFromTx(tx2);
      
      // User1's deposit matures and withdraws
      await advanceTimeByDays(31);
      await savingBank.connect(user1).withdrawDeposit(dep1);
      
      // User1's deposit is now withdrawn
      const deposit1 = await savingBank.getDeposit(dep1);
      expect(deposit1.status).to.equal(1n); // Withdrawn status (enum: 0=Active, 1=Withdrawn, 2=Renewed)
      
      // User2's deposit still active
      expect(await depositCertificate.ownerOf(cert2)).to.equal(user2.address);
      const deposit2 = await savingBank.getDeposit(dep2);
      expect(deposit2.status).to.equal(0n); // Active status
    });
  });

  /**
   * =====================================================
   * VAULT LIQUIDITY SCENARIOS
   * =====================================================
   */
  describe("Vault Liquidity Scenarios", function () {
    
    it("should track vault liquidity correctly through deposit/withdraw cycles", async function () {
      const { savingBank, mockUSDC, vault, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      const vaultBalanceBefore = await vault.getBalance();
      
      // User deposits - funds go to vault
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId } = await getDepositIdFromTx(tx);
      
      const vaultBalanceAfterDeposit = await vault.getBalance();
      expect(vaultBalanceAfterDeposit).to.equal(vaultBalanceBefore + depositAmount);
      
      // Advance to maturity
      await advanceTimeByDays(31);
      
      // User withdraws with interest
      await savingBank.connect(user1).withdrawDeposit(depositId);
      
      const vaultBalanceAfterWithdraw = await vault.getBalance();
      
      // Vault should have less than after deposit (interest paid out)
      expect(vaultBalanceAfterWithdraw < vaultBalanceAfterDeposit).to.be.true;
    });
  });

  /**
   * =====================================================
   * ADMIN OPERATIONS INTEGRATION
   * =====================================================
   */
  describe("Admin Operations Integration", function () {
    
    it("should pause and resume operations affecting all users", async function () {
      const { savingBank, mockUSDC, user1, pauser } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // User can deposit normally
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount * 2n);
      await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      
      // Pauser pauses the contract
      await savingBank.connect(pauser).pause();
      
      // User cannot create new deposit while paused
      let failed = false;
      try {
        await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      } catch (error: any) {
        failed = true;
        expect(error.message).to.include("EnforcedPause");
      }
      expect(failed).to.be.true;
      
      // Unpause
      await savingBank.connect(pauser).unpause();
      
      // User can deposit again
      await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
    });

    it("should update saving plan affecting new deposits only", async function () {
      const { savingBank, mockUSDC, user1, admin } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // Get original plan rate
      const originalPlan = await savingBank.getSavingPlan(planId);
      const originalRate = originalPlan.annualInterestRateInBasisPoints;
      
      // Create deposit with original rate
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount * 2n);
      const tx1 = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId: dep1 } = await getDepositIdFromTx(tx1);
      const depositWithOriginalRate = await savingBank.getDeposit(dep1);
      
      // Verify deposit captured the plan rate at time of creation
      // Note: The deposit stores expectedInterest, not the rate directly
      const originalExpectedInterest = depositWithOriginalRate.expectedInterest;
      
      // Admin updates plan rate
      const newRate = originalRate * 2n; // Double the rate
      await savingBank.connect(admin).updateSavingPlan(planId, {
        name: "Updated Plan",
        minDepositAmount: 100n * ONE_USDC,
        maxDepositAmount: 0n,
        minTermInDays: 1,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: newRate,
        penaltyRateInBasisPoints: 100n
      });
      
      // Create new deposit with updated rate
      const tx2 = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId: dep2 } = await getDepositIdFromTx(tx2);
      const depositWithNewRate = await savingBank.getDeposit(dep2);
      
      // Verify new deposit has higher expected interest (due to higher rate)
      expect(depositWithNewRate.expectedInterest > originalExpectedInterest).to.be.true;
    });

    it("should deactivate saving plan preventing new deposits", async function () {
      const { savingBank, mockUSDC, user1, admin } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // Create deposit with active plan
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount * 2n);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId } = await getDepositIdFromTx(tx);
      
      // Admin deactivates plan
      await savingBank.connect(admin).deactivateSavingPlan(planId);
      
      // Cannot create new deposit on deactivated plan
      let failed = false;
      try {
        await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      } catch (error: any) {
        failed = true;
        expect(error.message).to.include("PlanNotActive");
      }
      expect(failed).to.be.true;
      
      // Existing deposit can still be withdrawn
      await advanceTimeByDays(31);
      await savingBank.connect(user1).withdrawDeposit(depositId);
    });
  });

  /**
   * =====================================================
   * EDGE CASES & STRESS TESTS
   * =====================================================
   */
  describe("Edge Cases & Stress Tests", function () {
    
    it("should handle minimum deposit amount correctly", async function () {
      const { savingBank, mockUSDC, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const planId = 1;
      const plan = await savingBank.getSavingPlan(planId);
      const minDeposit = plan.minDepositAmount;
      
      // Minimum deposit should succeed
      await mockUSDC.connect(user1).approve(savingBank.target, minDeposit);
      await savingBank.connect(user1).createDeposit(planId, minDeposit, 30);
      
      // Below minimum should fail
      await mockUSDC.connect(user1).approve(savingBank.target, minDeposit - 1n);
      let failed = false;
      try {
        await savingBank.connect(user1).createDeposit(planId, minDeposit - 1n, 30);
      } catch (error: any) {
        failed = true;
        // Check for revert - error message format may vary
        expect(error.message.includes("Insufficient") || error.message.includes("revert")).to.be.true;
      }
      expect(failed).to.be.true;
    });

    it("should handle maximum term correctly", async function () {
      const { savingBank, mockUSDC, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      const plan = await savingBank.getSavingPlan(planId);
      const maxTerm = plan.maxTermInDays;
      
      // Max term should succeed
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount * 2n);
      await savingBank.connect(user1).createDeposit(planId, depositAmount, maxTerm);
      
      // Above max term should fail
      let failed = false;
      try {
        await savingBank.connect(user1).createDeposit(planId, depositAmount, Number(maxTerm) + 1);
      } catch (error: any) {
        failed = true;
        // Check for revert
        expect(error.message.includes("Term") || error.message.includes("revert")).to.be.true;
      }
      expect(failed).to.be.true;
    });

    it("should handle rapid sequential deposits", async function () {
      const { savingBank, mockUSDC, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 100n * ONE_USDC;
      const planId = 1;
      const numDeposits = 10;
      
      // Rapid sequential deposits
      const totalAmount = depositAmount * BigInt(numDeposits);
      await mockUSDC.connect(user1).approve(savingBank.target, totalAmount);
      
      const depositIds = [];
      for (let i = 0; i < numDeposits; i++) {
        const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
        const { depositId } = await getDepositIdFromTx(tx);
        depositIds.push(depositId);
      }
      
      // Verify all deposits created with unique IDs
      const uniqueIds = [...new Set(depositIds.map(id => id.toString()))];
      expect(uniqueIds.length).to.equal(numDeposits);
    });

    it("should handle exact maturity timestamp withdrawal", async function () {
      const { savingBank, mockUSDC, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const termDays = 30;
      const planId = 1;
      
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, termDays);
      const { depositId } = await getDepositIdFromTx(tx);
      
      // Advance to exactly maturity
      await advanceTimeByDays(termDays);
      
      // Should be able to withdraw at maturity (no penalty)
      const userBalanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingBank.connect(user1).withdrawDeposit(depositId);
      const userBalanceAfter = await mockUSDC.balanceOf(user1.address);
      
      // Should receive principal + interest (no penalty) - use BigInt comparison
      const received = userBalanceAfter - userBalanceBefore;
      expect(received > depositAmount).to.be.true;
    });
  });

  /**
   * =====================================================
   * CROSS-CONTRACT INTERACTION TESTS
   * =====================================================
   */
  describe("Cross-Contract Interactions", function () {
    
    it("should correctly sync state between SavingBank, Vault and DepositCertificate", async function () {
      const { savingBank, mockUSDC, depositCertificate, vault, user1 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // Before deposit
      const vaultBalanceBefore = await vault.getBalance();
      const certificateCountBefore = await depositCertificate.totalSupply();
      
      // Create deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId, certificateId } = await getDepositIdFromTx(tx);
      
      // Verify cross-contract state after deposit
      expect(await vault.getBalance()).to.equal(vaultBalanceBefore + depositAmount);
      expect(await depositCertificate.totalSupply()).to.equal(certificateCountBefore + 1n);
      expect(await depositCertificate.ownerOf(certificateId)).to.equal(user1.address);
      
      // Withdraw
      await advanceTimeByDays(31);
      await savingBank.connect(user1).withdrawDeposit(depositId);
      
      // Verify deposit status changed
      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.status).to.equal(1n); // Withdrawn (enum: 0=Active, 1=Withdrawn, 2=Renewed)
    });

    it("should allow certificate transfer and new owner can withdraw", async function () {
      const { savingBank, mockUSDC, depositCertificate, user1, user2 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // User1 creates deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId, certificateId } = await getDepositIdFromTx(tx);
      
      // User1 transfers NFT to User2
      await depositCertificate.connect(user1).transferFrom(
        user1.address, 
        user2.address, 
        certificateId
      );
      
      // Verify ownership transferred
      expect(await depositCertificate.ownerOf(certificateId)).to.equal(user2.address);
      
      // User2 can now withdraw since they own the certificate
      await advanceTimeByDays(31);
      
      // User1 cannot withdraw (no longer owns certificate)
      let user1WithdrawFailed = false;
      try {
        await savingBank.connect(user1).withdrawDeposit(depositId);
      } catch (error) {
        user1WithdrawFailed = true;
      }
      expect(user1WithdrawFailed).to.be.true;
      
      // User2 can withdraw since they own the certificate
      const user2BalanceBefore = await mockUSDC.balanceOf(user2.address);
      await savingBank.connect(user2).withdrawDeposit(depositId);
      const user2BalanceAfter = await mockUSDC.balanceOf(user2.address);
      
      // User2 received funds
      expect(user2BalanceAfter > user2BalanceBefore).to.be.true;
      
      // Verify deposit is now withdrawn
      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.status).to.equal(1n); // Withdrawn
    });

    it("should enforce 24-hour cooldown after NFT transfer", async function () {
      const { savingBank, mockUSDC, depositCertificate, user1, user2 } = 
        await loadFixture(deployIntegrationFixture);

      const depositAmount = 1000n * ONE_USDC;
      const planId = 1;
      
      // User1 creates deposit
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 30);
      const { depositId, certificateId } = await getDepositIdFromTx(tx);
      
      // Advance to maturity
      await advanceTimeByDays(31);
      
      // User1 transfers NFT to User2
      await depositCertificate.connect(user1).transferFrom(
        user1.address, 
        user2.address, 
        certificateId
      );
      
      // Verify NFT is in cooldown
      expect(await depositCertificate.isInCooldown(certificateId)).to.be.true;
      
      // User2 cannot withdraw immediately (24-hour cooldown)
      let cooldownBlockedWithdrawal = false;
      try {
        await savingBank.connect(user2).withdrawDeposit(depositId);
      } catch (error: any) {
        expect(error.message).to.include("CertificateInCooldown");
        cooldownBlockedWithdrawal = true;
      }
      expect(cooldownBlockedWithdrawal).to.be.true;
      
      // Advance past cooldown (24 hours)
      await advanceTimeByDays(1);
      
      // Verify cooldown expired
      expect(await depositCertificate.isInCooldown(certificateId)).to.be.false;
      
      // Now User2 can withdraw
      const user2BalanceBefore = await mockUSDC.balanceOf(user2.address);
      await savingBank.connect(user2).withdrawDeposit(depositId);
      const user2BalanceAfter = await mockUSDC.balanceOf(user2.address);
      
      expect(user2BalanceAfter > user2BalanceBefore).to.be.true;
    });
  });
});
