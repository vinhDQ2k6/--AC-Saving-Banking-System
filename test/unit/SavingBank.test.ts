import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("SavingBank Core Logic", function () {
  let savingBank: any;
  let mockUSDC: any;
  let depositCertificate: any;
  let vault: any;
  let deployer: Signer, admin: Signer, pauser: Signer, user1: Signer, user2: Signer;
  let ADMIN_ROLE: string, PAUSER_ROLE: string;

  beforeEach(async function () {
    const fixture = await loadFixture(deployFullFixture);
    savingBank = fixture.savingBank;
    mockUSDC = fixture.mockUSDC;
    depositCertificate = fixture.depositCertificate;
    vault = fixture.vault;
    [deployer, admin, pauser, user1, user2] = fixture.signers;
    
    ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    PAUSER_ROLE = await savingBank.PAUSER_ROLE();

    // Setup vault liquidity for user operations
    const liquidityAmount = 100000_000000n; // 100k USDC
    await mockUSDC.connect(admin).transfer(deployer.address, liquidityAmount);
    await mockUSDC.connect(deployer).approve(vault.target, liquidityAmount);
    await vault.connect(deployer).depositLiquidity(liquidityAmount);
  });

  describe("Saving Plan Management", function () {
    it("should create saving plan with valid parameters", async function () {
      const planInput = {
        name: "Premium Plan",
        minDepositAmount: 1000_000000n, // 1000 USDC
        maxDepositAmount: 100000_000000n, // 100k USDC
        minTermInDays: 30,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 1200n, // 12%
        penaltyRateInBasisPoints: 300n // 3%
      };

      const tx = await savingBank.connect(admin).createSavingPlan(planInput);
      const receipt = await tx.wait();
      
      // Check event emission
      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'SavingPlanCreated'
      );
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(2n); // Plan ID (1 exists from fixtures)
      expect(event.args[1]).to.equal("Premium Plan");

      // Verify plan was created correctly
      const plan = await savingBank.getSavingPlan(2);
      expect(plan.name).to.equal("Premium Plan");
      expect(plan.minDepositAmount).to.equal(1000_000000n);
      expect(plan.annualInterestRateInBasisPoints).to.equal(1200n);
      expect(plan.isActive).to.be.true;
    });

    it("should reject invalid saving plan parameters", async function () {
      // Test zero min term
      try {
        await savingBank.connect(admin).createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0n,
          minTermInDays: 0, // Invalid
          maxTermInDays: 30,
          annualInterestRateInBasisPoints: 500n,
          penaltyRateInBasisPoints: 100n
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTermDays");
      }

      // Test max term <= min term
      try {
        await savingBank.connect(admin).createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0n,
          minTermInDays: 30,
          maxTermInDays: 30, // Invalid: should be > min
          annualInterestRateInBasisPoints: 500n,
          penaltyRateInBasisPoints: 100n
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTermDays");
      }

      // Test zero interest rate
      try {
        await savingBank.connect(admin).createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0n,
          minTermInDays: 1,
          maxTermInDays: 30,
          annualInterestRateInBasisPoints: 0n, // Invalid
          penaltyRateInBasisPoints: 100n
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidInterestRate");
      }

      // Test excessive penalty rate
      try {
        await savingBank.connect(admin).createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0n,
          minTermInDays: 1,
          maxTermInDays: 30,
          annualInterestRateInBasisPoints: 500n,
          penaltyRateInBasisPoints: 10001n // Invalid: > 100%
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidPenaltyRate");
      }
    });

    it("should update existing saving plan", async function () {
      const updatedPlan = {
        name: "Updated Default Plan",
        minDepositAmount: 200_000000n, // Updated
        maxDepositAmount: 50000_000000n, // Updated
        minTermInDays: 7, // Updated
        maxTermInDays: 180, // Updated
        annualInterestRateInBasisPoints: 1000n, // Updated to 10%
        penaltyRateInBasisPoints: 150n // Updated to 1.5%
      };

      const tx = await savingBank.connect(admin).updateSavingPlan(1, updatedPlan);
      const receipt = await tx.wait();

      // Check event emission
      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'SavingPlanUpdated'
      );
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(1n);

      // Verify plan was updated
      const plan = await savingBank.getSavingPlan(1);
      expect(plan.name).to.equal("Updated Default Plan");
      expect(plan.minDepositAmount).to.equal(200_000000n);
      expect(plan.annualInterestRateInBasisPoints).to.equal(1000n);
    });

    it("should activate and deactivate saving plans", async function () {
      // Deactivate plan
      let tx = await savingBank.connect(admin).deactivateSavingPlan(1);
      let receipt = await tx.wait();
      
      let event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'SavingPlanDeactivated'
      );
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(1n);

      let plan = await savingBank.getSavingPlan(1);
      expect(plan.isActive).to.be.false;

      // Activate plan
      tx = await savingBank.connect(admin).activateSavingPlan(1);
      receipt = await tx.wait();
      
      event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'SavingPlanActivated'
      );
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(1n);

      plan = await savingBank.getSavingPlan(1);
      expect(plan.isActive).to.be.true;
    });

    it("should only allow admin to manage plans", async function () {
      const planInput = {
        name: "Unauthorized Plan",
        minDepositAmount: 100_000000n,
        maxDepositAmount: 0n,
        minTermInDays: 1,
        maxTermInDays: 30,
        annualInterestRateInBasisPoints: 500n,
        penaltyRateInBasisPoints: 100n
      };

      try {
        await savingBank.connect(user1).createSavingPlan(planInput);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("AccessControlUnauthorizedAccount");
      }
    });
  });

  describe("User Deposit Operations", function () {
    beforeEach(async function () {
      // Ensure users have tokens
      await mockUSDC.mint(user1.address, 10000_000000n);
      await mockUSDC.mint(user2.address, 10000_000000n);
    });

    it("should allow valid user deposit", async function () {
      const depositAmount = 1000_000000n;
      const planId = 1;
      const termDays = 90;

      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      
      const initialUserBalance = await mockUSDC.balanceOf(user1.address);
      const initialVaultBalance = await vault.getBalance();

      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, termDays);
      const receipt = await tx.wait();

      // Check event emission
      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'DepositCreated'
      );
      expect(event).to.not.be.undefined;
      const depositId = event.args[0];
      expect(event.args[1]).to.equal(user1.address);
      expect(event.args[2]).to.equal(BigInt(planId));
      expect(event.args[3]).to.equal(depositAmount);
      expect(event.args[4]).to.equal(BigInt(termDays));

      // Verify deposit was created
      const deposit = await savingBank.getDeposit(depositId);
      expect(deposit.user).to.equal(user1.address);
      expect(deposit.amount).to.equal(depositAmount);
      expect(deposit.termInDays).to.equal(BigInt(termDays));
      expect(deposit.status).to.equal(0n); // Active status

      // Verify funds transferred
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(initialUserBalance - depositAmount);
      expect(await vault.getBalance()).to.equal(initialVaultBalance + depositAmount);

      // Verify certificate was minted
      const certificateId = event.args[6];
      expect(await depositCertificate.ownerOf(certificateId)).to.equal(user1.address);
    });

    it("should validate deposit parameters", async function () {
      const depositAmount = 1000_000000n;
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);

      // Test non-existent plan
      try {
        await savingBank.connect(user1).createDeposit(999, depositAmount, 30);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("SavingPlanNotFound");
      }

      // Test inactive plan
      await savingBank.connect(admin).deactivateSavingPlan(1);
      try {
        await savingBank.connect(user1).createDeposit(1, depositAmount, 30);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("SavingPlanNotActive");
      }

      // Reactivate for further tests
      await savingBank.connect(admin).activateSavingPlan(1);

      // Test insufficient deposit amount
      try {
        await savingBank.connect(user1).createDeposit(1, 50_000000n, 30); // Less than 100 USDC min
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientDepositAmount");
      }

      // Test term too short
      try {
        await savingBank.connect(user1).createDeposit(1, depositAmount, 0); // Less than 1 day min
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTermDays");
      }

      // Test term too long
      try {
        await savingBank.connect(user1).createDeposit(1, depositAmount, 400); // More than 365 days max
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTermDays");
      }
    });

    it("should calculate expected interest correctly", async function () {
      const depositAmount = 10000_000000n; // 10k USDC
      const termDays = 180; // 6 months
      
      // Get the plan to check interest rate
      const plan = await savingBank.getSavingPlan(1);
      const expectedInterest = await savingBank.calculateExpectedInterest(depositAmount, 1, termDays);
      
      // Manual calculation: (10000 * 800 * 180) / (10000 * 365) = ~394.52 USDC
      const manualCalculation = (depositAmount * plan.annualInterestRateInBasisPoints * BigInt(termDays)) / (10000n * 365n);
      expect(expectedInterest).to.equal(manualCalculation);
    });

    it("should handle multiple deposits from same user", async function () {
      await mockUSDC.connect(user1).approve(savingBank.target, 3000_000000n);

      // First deposit
      const tx1 = await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'DepositCreated');
      const depositId1 = event1.args[0];

      // Second deposit
      const tx2 = await savingBank.connect(user1).createDeposit(1, 2000_000000n, 60);
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find((log: any) => log.fragment && log.fragment.name === 'DepositCreated');
      const depositId2 = event2.args[0];

      expect(depositId2).to.not.equal(depositId1);

      // Verify both deposits exist
      const deposit1 = await savingBank.getDeposit(depositId1);
      const deposit2 = await savingBank.getDeposit(depositId2);
      
      expect(deposit1.amount).to.equal(1000_000000n);
      expect(deposit2.amount).to.equal(2000_000000n);
      expect(deposit1.termInDays).to.equal(30n);
      expect(deposit2.termInDays).to.equal(60n);
    });
  });

  describe("Vault Integration", function () {
    it("should integrate with vault for admin liquidity management", async function () {
      const amount = 5000_000000n;
      
      // Admin deposits to vault through SavingBank
      await mockUSDC.connect(admin).approve(savingBank.target, amount);
      const initialVaultBalance = await vault.getBalance();

      const tx = await savingBank.connect(admin).depositToVault(amount);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'LiquidityDeposited'
      );
      expect(event).to.not.be.undefined;

      expect(await vault.getBalance()).to.equal(initialVaultBalance + amount);

      // Admin withdraws from vault
      const withdrawAmount = 2000_000000n;
      const initialAdminBalance = await mockUSDC.balanceOf(admin.address);

      await savingBank.connect(admin).withdrawFromVault(withdrawAmount);
      
      expect(await vault.getBalance()).to.equal(initialVaultBalance + amount - withdrawAmount);
      expect(await mockUSDC.balanceOf(admin.address)).to.equal(initialAdminBalance + withdrawAmount);
    });
  });

  describe("Emergency Controls", function () {
    it("should pause and unpause contract", async function () {
      // Pause contract
      await savingBank.connect(pauser).pause();
      
      // Verify operations are blocked
      await mockUSDC.mint(user1.address, 1000_000000n);
      await mockUSDC.connect(user1).approve(savingBank.target, 1000_000000n);
      
      try {
        await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("EnforcedPause");
      }

      // Unpause contract
      await savingBank.connect(pauser).unpause();
      
      // Verify operations work again
      await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
    });

    it("should only allow pauser role to pause/unpause", async function () {
      try {
        await savingBank.connect(user1).pause();
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("AccessControlUnauthorizedAccount");
      }
    });
  });
});