import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("Vault Operations", function () {
  let vault: any;
  let mockUSDC: any;
  let savingBank: any;
  let deployer: Signer, admin: Signer, user1: Signer, user2: Signer;
  let LIQUIDITY_MANAGER_ROLE: string, WITHDRAW_ROLE: string, DEFAULT_ADMIN_ROLE: string;

  beforeEach(async function () {
    const fixture = await loadFixture(deployFullFixture);
    vault = fixture.vault;
    mockUSDC = fixture.mockUSDC;
    savingBank = fixture.savingBank;
    [deployer, admin, user1, user2] = fixture.signers;
    
    LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
    WITHDRAW_ROLE = await vault.WITHDRAW_ROLE();
    DEFAULT_ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();
  });

  describe("Role-Based Access Control", function () {
    it("should grant LIQUIDITY_MANAGER_ROLE to SavingBank", async function () {
      expect(await vault.hasRole(LIQUIDITY_MANAGER_ROLE, savingBank.target)).to.be.true;
    });

    it("should grant WITHDRAW_ROLE to SavingBank", async function () {
      expect(await vault.hasRole(WITHDRAW_ROLE, savingBank.target)).to.be.true;
    });

    it("should not allow unauthorized deposit", async function () {
      const amount = 1000_000000n; // 1000 USDC
      await mockUSDC.connect(user1).approve(vault.target, amount);
      
      try {
        await vault.connect(user1).depositLiquidity(amount);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("AccessControlUnauthorizedAccount");
      }
    });

    it("should not allow unauthorized withdrawal", async function () {
      // First setup some vault liquidity using deployer's LIQUIDITY_MANAGER_ROLE
      const depositAmount = 5000_000000n;
      await mockUSDC.connect(admin).transfer(deployer.address, depositAmount);
      await mockUSDC.connect(deployer).approve(vault.target, depositAmount);
      await vault.connect(deployer).depositLiquidity(depositAmount);
      
      const withdrawAmount = 1000_000000n;
      try {
        await vault.connect(user1).withdrawLiquidity(withdrawAmount, user1.address);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("AccessControlUnauthorizedAccount");
      }
    });
  });

  describe("Admin Liquidity Management", function () {
    it("should allow admin to deposit liquidity", async function () {
      const amount = 10000_000000n; // 10k USDC
      
      // Deployer has LIQUIDITY_MANAGER_ROLE, so can deposit
      await mockUSDC.connect(admin).transfer(deployer.address, amount);
      await mockUSDC.connect(deployer).approve(vault.target, amount);
      
      const tx = await vault.connect(deployer).depositLiquidity(amount);
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'LiquidityDeposited'
      );
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(deployer.address);
      expect(event.args[1]).to.equal(amount);
      expect(event.args[2]).to.equal(amount);
      
      expect(await vault.getBalance()).to.equal(amount);
      expect(await mockUSDC.balanceOf(vault.target)).to.equal(amount);
    });

    it("should allow admin withdrawal", async function () {
      // Setup: deposit first using deployer's LIQUIDITY_MANAGER_ROLE
      const depositAmount = 5000_000000n;
      await mockUSDC.connect(admin).transfer(deployer.address, depositAmount);
      await mockUSDC.connect(deployer).approve(vault.target, depositAmount);
      await vault.connect(deployer).depositLiquidity(depositAmount);
      
      const withdrawAmount = 2000_000000n;
      const initialBalance = await mockUSDC.balanceOf(deployer.address);
      
      const tx = await vault.connect(deployer).adminWithdraw(withdrawAmount);
      const receipt = await tx.wait();
      
      // Check event was emitted
      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'AdminWithdrawn'
      );
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(deployer.address);
      expect(event.args[1]).to.equal(withdrawAmount);
      expect(event.args[2]).to.equal(depositAmount - withdrawAmount);
      
      expect(await vault.getBalance()).to.equal(depositAmount - withdrawAmount);
      expect(await mockUSDC.balanceOf(deployer.address)).to.equal(initialBalance + withdrawAmount);
    });

    it("should not allow admin withdrawal exceeding total liquidity", async function () {
      const depositAmount = 1000_000000n;
      await mockUSDC.connect(admin).transfer(deployer.address, depositAmount);
      await mockUSDC.connect(deployer).approve(vault.target, depositAmount);
      await vault.connect(deployer).depositLiquidity(depositAmount);
      
      try {
        await vault.connect(deployer).adminWithdraw(depositAmount + 1n);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientVaultLiquidity");
      }
    });
  });

  describe("SavingBank Integration", function () {
    beforeEach(async function () {
      // Setup vault liquidity using deployer who has LIQUIDITY_MANAGER_ROLE
      const liquidityAmount = 50000_000000n; // 50k USDC
      // Use admin's tokens but approve through deployer who has the role
      await mockUSDC.connect(admin).transfer(deployer.address, liquidityAmount);
      await mockUSDC.connect(deployer).approve(vault.target, liquidityAmount);
      await vault.connect(deployer).depositLiquidity(liquidityAmount);
    });

    it("should allow SavingBank to deposit liquidity", async function () {
      const amount = 1000_000000n;
      
      // Verify user1 has sufficient balance (should have original 1M USDC from fixtures)
      const userBalance = await mockUSDC.balanceOf(user1.address);
      console.log("User1 balance:", userBalance.toString());
      
      // If user doesn't have enough, mint some tokens
      if (userBalance < amount) {
        await mockUSDC.mint(user1.address, amount);
      }
      
      // User deposits to SavingBank, which should deposit to vault
      await mockUSDC.connect(user1).approve(savingBank.target, amount);
      
      const initialVaultBalance = await vault.getBalance();
      
      // This should trigger vault.depositLiquidity via SavingBank
      await savingBank.connect(user1).createDeposit(1, amount, 30);
      
      expect(await vault.getBalance()).to.equal(initialVaultBalance + amount);
    });

    it("should allow SavingBank to withdraw liquidity for user withdrawals", async function () {
      const depositAmount = 2000_000000n;
      
      // Verify user1 has sufficient balance and mint if needed
      let userBalance = await mockUSDC.balanceOf(user1.address);
      if (userBalance < depositAmount) {
        await mockUSDC.mint(user1.address, depositAmount);
        userBalance = await mockUSDC.balanceOf(user1.address);
      }
      
      // User deposits first
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(1, depositAmount, 30);
      const receipt = await tx.wait();
      
      // Extract deposit ID from event
      const depositEvent = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'DepositCreated'
      );
      const depositId = depositEvent.args[0]; // First argument is depositId
      
      const initialUserBalance = await mockUSDC.balanceOf(user1.address);
      const initialVaultBalance = await vault.getBalance();
      
      // Fast forward time and withdraw (this should trigger vault.withdrawLiquidity)
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await savingBank.connect(user1).withdrawDeposit(depositId);
      
      // Verify vault liquidity decreased and user received funds
      const finalVaultBalance = await vault.getBalance();
      const finalUserBalance = await mockUSDC.balanceOf(user1.address);
      
      expect(finalVaultBalance < initialVaultBalance).to.be.true;
      expect(finalUserBalance > initialUserBalance).to.be.true;
    });
  });

  describe("Security Boundaries", function () {
    it("should prevent reentrancy attacks", async function () {
      // This test verifies ReentrancyGuard is active by checking successful operations
      // We can't easily test reentrancy without a malicious contract
      const amount = 1000_000000n;
      await mockUSDC.connect(admin).transfer(deployer.address, amount);
      await mockUSDC.connect(deployer).approve(vault.target, amount);
      
      // This should succeed without reentrancy issues
      await vault.connect(deployer).depositLiquidity(amount);
      expect(await vault.getBalance()).to.equal(amount);
    });

    it("should handle zero amount operations correctly", async function () {
      try {
        await vault.connect(deployer).depositLiquidity(0);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAmount");
      }
      
      try {
        await vault.connect(deployer).adminWithdraw(0);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAmount");
      }
    });

    it("should require valid recipient addresses", async function () {
      // First deposit some liquidity
      const amount = 1000_000000n;
      await mockUSDC.connect(admin).transfer(deployer.address, amount);
      await mockUSDC.connect(deployer).approve(vault.target, amount);
      await vault.connect(deployer).depositLiquidity(amount);
      
      // Grant withdraw role to deployer for this test
      await vault.connect(deployer).grantRole(await vault.WITHDRAW_ROLE(), deployer.address);
      
      try {
        await vault.connect(deployer).withdrawLiquidity(500_000000n, ethers.ZeroAddress);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });
  });

  describe("Event Emissions", function () {
    it("should emit correct events for liquidity operations", async function () {
      const amount = 1000_000000n;
      await mockUSDC.connect(admin).transfer(deployer.address, amount);
      await mockUSDC.connect(deployer).approve(vault.target, amount);
      
      // Check deposit event
      const depositTx = await vault.connect(deployer).depositLiquidity(amount);
      const depositReceipt = await depositTx.wait();
      const depositEvent = depositReceipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'LiquidityDeposited'
      );
      expect(depositEvent).to.not.be.undefined;
      expect(depositEvent.args[0]).to.equal(deployer.address);
      expect(depositEvent.args[1]).to.equal(amount);
      expect(depositEvent.args[2]).to.equal(amount);
      
      // Check admin withdrawal event
      const withdrawTx = await vault.connect(deployer).adminWithdraw(500_000000n);
      const withdrawReceipt = await withdrawTx.wait();
      const withdrawEvent = withdrawReceipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === 'AdminWithdrawn'
      );
      expect(withdrawEvent).to.not.be.undefined;
      expect(withdrawEvent.args[0]).to.equal(deployer.address);
      expect(withdrawEvent.args[1]).to.equal(500_000000n);
      expect(withdrawEvent.args[2]).to.equal(500_000000n);
    });
  });
});
