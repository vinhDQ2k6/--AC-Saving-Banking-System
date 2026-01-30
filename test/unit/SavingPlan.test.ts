import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SavingBank, MockUSDC, DepositCertificate, Vault } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SavingPlan Advanced Management", function () {
  let savingBank: SavingBank;
  let mockUSDC: MockUSDC;
  let depositCertificate: DepositCertificate;
  let vault: Vault;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let admin: HardhatEthersSigner;

  async function deploySavingPlanFixture() {
    const [owner, user1, admin] = await ethers.getSigners();

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

    // Deploy SavingBank
    const SavingBank = await ethers.getContractFactory("SavingBank");
    const savingBank = await SavingBank.deploy(
      mockUSDC.target,
      depositCertificate.target,
      vault.target
    );

    // Setup roles
    await vault.grantRole(await vault.LIQUIDITY_MANAGER_ROLE(), savingBank.target);
    await vault.grantRole(await vault.WITHDRAW_ROLE(), savingBank.target);
    await depositCertificate.grantRole(await depositCertificate.MINTER_ROLE(), savingBank.target);

    // Mint tokens
    await mockUSDC.mint(user1.address, 100000_000000n);

    return { savingBank, mockUSDC, depositCertificate, vault, owner, user1, admin };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deploySavingPlanFixture);
    savingBank = fixture.savingBank;
    mockUSDC = fixture.mockUSDC;
    depositCertificate = fixture.depositCertificate;
    vault = fixture.vault;
    owner = fixture.owner;
    user1 = fixture.user1;
    admin = fixture.admin;
  });

  describe("Plan Creation and Validation", function () {
    it("should create multiple saving plans with different characteristics", async function () {
      // Create Basic Plan
      await savingBank.createSavingPlan({
        name: "Basic Saver",
        minDepositAmount: 100_000000n, // 100 USDC
        maxDepositAmount: 10000_000000n, // 10,000 USDC
        minTermInDays: 30,
        maxTermInDays: 180,
        annualInterestRateInBasisPoints: 600, // 6%
        penaltyRateInBasisPoints: 50 // 0.5%
      });

      // Create Premium Plan
      await savingBank.createSavingPlan({
        name: "Premium Saver",
        minDepositAmount: 5000_000000n, // 5,000 USDC
        maxDepositAmount: 100000_000000n, // 100,000 USDC
        minTermInDays: 90,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 1000, // 10%
        penaltyRateInBasisPoints: 200 // 2%
      });

      // Create VIP Plan
      await savingBank.createSavingPlan({
        name: "VIP Wealth",
        minDepositAmount: 50000_000000n, // 50,000 USDC
        maxDepositAmount: 0, // No maximum
        minTermInDays: 180,
        maxTermInDays: 730, // 2 years
        annualInterestRateInBasisPoints: 1500, // 15%
        penaltyRateInBasisPoints: 300 // 3%
      });

      // Verify all plans created successfully
      const basicPlan = await savingBank.getSavingPlan(1);
      const premiumPlan = await savingBank.getSavingPlan(2);
      const vipPlan = await savingBank.getSavingPlan(3);

      expect(basicPlan.name).to.equal("Basic Saver");
      expect(basicPlan.annualInterestRateInBasisPoints).to.equal(600n);
      expect(basicPlan.isActive).to.be.true;

      expect(premiumPlan.name).to.equal("Premium Saver");
      expect(premiumPlan.minDepositAmount).to.equal(5000_000000n);
      expect(premiumPlan.annualInterestRateInBasisPoints).to.equal(1000n);

      expect(vipPlan.name).to.equal("VIP Wealth");
      expect(vipPlan.maxDepositAmount).to.equal(0n); // No maximum
      expect(Number(vipPlan.maxTermInDays)).to.equal(730);
    });

    it("should enforce plan parameter boundaries", async function () {
      // Test minimum term validation
      try {
        await savingBank.createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0,
          minTermInDays: 0, // Invalid: zero minimum term
          maxTermInDays: 365,
          annualInterestRateInBasisPoints: 800,
          penaltyRateInBasisPoints: 100
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTermDays");
      }

      // Test interest rate boundary
      try {
        await savingBank.createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0,
          minTermInDays: 30,
          maxTermInDays: 365,
          annualInterestRateInBasisPoints: 0, // Invalid: zero interest rate
          penaltyRateInBasisPoints: 100
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidInterestRate");
      }

      // Test penalty rate boundary (should not exceed 100%)
      try {
        await savingBank.createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0,
          minTermInDays: 30,
          maxTermInDays: 365,
          annualInterestRateInBasisPoints: 800,
          penaltyRateInBasisPoints: 15000 // Invalid: > 100%
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidPenaltyRate");
      }
    });

    it("should validate term range consistency", async function () {
      // Test that max term is greater than min term
      try {
        await savingBank.createSavingPlan({
          name: "Invalid Plan",
          minDepositAmount: 100_000000n,
          maxDepositAmount: 0,
          minTermInDays: 365,
          maxTermInDays: 180, // Invalid: max < min
          annualInterestRateInBasisPoints: 800,
          penaltyRateInBasisPoints: 100
        });
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTermDays");
      }
    });
  });

  describe("Plan Lifecycle Management", function () {
    beforeEach(async function () {
      // Create a test plan for lifecycle tests
      await savingBank.createSavingPlan({
        name: "Test Plan",
        minDepositAmount: 500_000000n,
        maxDepositAmount: 50000_000000n,
        minTermInDays: 60,
        maxTermInDays: 360,
        annualInterestRateInBasisPoints: 900,
        penaltyRateInBasisPoints: 150
      });
    });

    it("should allow updating plan parameters", async function () {
      // Update the plan
      await savingBank.updateSavingPlan(1, {
        name: "Updated Test Plan",
        minDepositAmount: 1000_000000n, // Increased minimum
        maxDepositAmount: 100000_000000n, // Increased maximum
        minTermInDays: 90, // Increased minimum term
        maxTermInDays: 540, // Increased maximum term
        annualInterestRateInBasisPoints: 1200, // Increased interest rate
        penaltyRateInBasisPoints: 200 // Increased penalty rate
      });

      const updatedPlan = await savingBank.getSavingPlan(1);
      expect(updatedPlan.name).to.equal("Updated Test Plan");
      expect(updatedPlan.minDepositAmount).to.equal(1000_000000n);
      expect(updatedPlan.annualInterestRateInBasisPoints).to.equal(1200n);
      expect(Number(updatedPlan.minTermInDays)).to.equal(90);
      expect(updatedPlan.isActive).to.be.true; // Should remain active
    });

    it("should allow activating and deactivating plans", async function () {
      const planId = 1;

      // Initially plan should be active
      let plan = await savingBank.getSavingPlan(planId);
      expect(plan.isActive).to.be.true;

      // Deactivate plan
      await savingBank.deactivateSavingPlan(planId);
      plan = await savingBank.getSavingPlan(planId);
      expect(plan.isActive).to.be.false;

      // Reactivate plan
      await savingBank.activateSavingPlan(planId);
      plan = await savingBank.getSavingPlan(planId);
      expect(plan.isActive).to.be.true;
    });

    it("should prevent deposits to inactive plans", async function () {
      const planId = 1;
      const depositAmount = 1000_000000n;

      // Deactivate the plan
      await savingBank.deactivateSavingPlan(planId);

      // Attempt to create deposit should fail
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      try {
        await savingBank.connect(user1).createDeposit(planId, depositAmount, 90);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("SavingPlanNotActive");
      }
    });

    it("should handle plan updates without affecting existing deposits", async function () {
      const planId = 1;
      const depositAmount = 2000_000000n;

      // Create deposit with original plan
      await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
      const tx = await savingBank.connect(user1).createDeposit(planId, depositAmount, 120);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'DepositCreated');
      const depositId = event.args[0];

      // Get original deposit details
      const originalDeposit = await savingBank.getDeposit(depositId);
      const originalExpectedInterest = originalDeposit.expectedInterest;

      // Update plan with higher interest rate
      await savingBank.updateSavingPlan(planId, {
        name: "Updated Plan",
        minDepositAmount: 500_000000n,
        maxDepositAmount: 50000_000000n,
        minTermInDays: 60,
        maxTermInDays: 360,
        annualInterestRateInBasisPoints: 1500, // Increased from 900
        penaltyRateInBasisPoints: 150
      });

      // Existing deposit should maintain original terms
      const currentDeposit = await savingBank.getDeposit(depositId);
      expect(currentDeposit.expectedInterest).to.equal(originalExpectedInterest);
      expect(Number(currentDeposit.savingPlanId)).to.equal(planId);
    });
  });

  describe("Plan Categorization and Features", function () {
    it("should support different plan categories with unique features", async function () {
      // Flexible Short-Term Plan
      await savingBank.createSavingPlan({
        name: "Flexible 30-Day",
        minDepositAmount: 50_000000n,
        maxDepositAmount: 5000_000000n,
        minTermInDays: 7,
        maxTermInDays: 90,
        annualInterestRateInBasisPoints: 400, // Lower rate for flexibility
        penaltyRateInBasisPoints: 25 // Low penalty
      });

      // Balanced Medium-Term Plan
      await savingBank.createSavingPlan({
        name: "Balanced 6-Month",
        minDepositAmount: 1000_000000n,
        maxDepositAmount: 25000_000000n,
        minTermInDays: 90,
        maxTermInDays: 270,
        annualInterestRateInBasisPoints: 800, // Moderate rate
        penaltyRateInBasisPoints: 100 // Moderate penalty
      });

      // High-Yield Long-Term Plan
      await savingBank.createSavingPlan({
        name: "High-Yield 1-Year+",
        minDepositAmount: 10000_000000n,
        maxDepositAmount: 0, // No limit
        minTermInDays: 365,
        maxTermInDays: 1095, // 3 years
        annualInterestRateInBasisPoints: 1800, // High rate
        penaltyRateInBasisPoints: 500 // Higher penalty for commitment
      });

      // Verify plan diversity
      const flexiblePlan = await savingBank.getSavingPlan(1);
      const balancedPlan = await savingBank.getSavingPlan(2);
      const highYieldPlan = await savingBank.getSavingPlan(3);

      expect(Number(flexiblePlan.penaltyRateInBasisPoints)).to.be.lt(Number(balancedPlan.penaltyRateInBasisPoints));
      expect(Number(balancedPlan.annualInterestRateInBasisPoints)).to.be.lt(Number(highYieldPlan.annualInterestRateInBasisPoints));
      expect(Number(flexiblePlan.maxTermInDays)).to.be.lt(Number(highYieldPlan.minTermInDays));
    });

    it("should calculate interest rates correctly across different plans", async function () {
      // Create test plans
      await savingBank.createSavingPlan({
        name: "Low Rate",
        minDepositAmount: 100_000000n,
        maxDepositAmount: 0,
        minTermInDays: 30,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 500, // 5%
        penaltyRateInBasisPoints: 100
      });

      await savingBank.createSavingPlan({
        name: "High Rate",
        minDepositAmount: 100_000000n,
        maxDepositAmount: 0,
        minTermInDays: 30,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 1500, // 15%
        penaltyRateInBasisPoints: 100
      });

      const amount = 10000_000000n; // 10,000 USDC
      const term = 365; // 1 year

      // Calculate expected interest for both plans
      const lowRateInterest = await savingBank.calculateExpectedInterest(amount, 1, term);
      const highRateInterest = await savingBank.calculateExpectedInterest(amount, 2, term);

      // High rate plan should yield 3x more interest (15% vs 5%)
      expect(Number(highRateInterest)).to.be.approximately(Number(lowRateInterest) * 3, Number(lowRateInterest) * 0.1);
      expect(Number(highRateInterest)).to.be.gt(Number(lowRateInterest));
    });
  });

  describe("Plan Performance Analytics", function () {
    beforeEach(async function () {
      // Create multiple plans for analytics testing
      await savingBank.createSavingPlan({
        name: "Analytics Plan A",
        minDepositAmount: 1000_000000n,
        maxDepositAmount: 0,
        minTermInDays: 90,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 800,
        penaltyRateInBasisPoints: 100
      });

      await savingBank.createSavingPlan({
        name: "Analytics Plan B",
        minDepositAmount: 5000_000000n,
        maxDepositAmount: 0,
        minTermInDays: 180,
        maxTermInDays: 730,
        annualInterestRateInBasisPoints: 1200,
        penaltyRateInBasisPoints: 150
      });
    });

    it("should track plan utilization through deposits", async function () {
      // Create deposits for both plans
      const planADepositAmount = 3000_000000n;
      const planBDepositAmount = 8000_000000n;

      await mockUSDC.connect(user1).approve(savingBank.target, planADepositAmount + planBDepositAmount);

      // Deposit to Plan A
      await savingBank.connect(user1).createDeposit(1, planADepositAmount, 120);
      
      // Deposit to Plan B
      await savingBank.connect(user1).createDeposit(2, planBDepositAmount, 200);

      // Verify deposits were created correctly with plan association
      const totalActiveDeposits = await savingBank.getActiveDepositCount();
      expect(totalActiveDeposits).to.equal(2n);
      
      // Both plans should be active and usable
      const planA = await savingBank.getSavingPlan(1);
      const planB = await savingBank.getSavingPlan(2);
      
      expect(planA.isActive).to.be.true;
      expect(planB.isActive).to.be.true;
    });

    it("should validate plan parameter relationships", async function () {
      const planA = await savingBank.getSavingPlan(1);
      const planB = await savingBank.getSavingPlan(2);

      // Plan B should have higher requirements and rewards
      expect(Number(planB.minDepositAmount)).to.be.gt(Number(planA.minDepositAmount));
      expect(Number(planB.annualInterestRateInBasisPoints)).to.be.gt(Number(planA.annualInterestRateInBasisPoints));
      expect(Number(planB.penaltyRateInBasisPoints)).to.be.gt(Number(planA.penaltyRateInBasisPoints));
      
      // Both should maintain logical term ranges
      expect(Number(planA.maxTermInDays)).to.be.gte(Number(planA.minTermInDays));
      expect(Number(planB.maxTermInDays)).to.be.gte(Number(planB.minTermInDays));
    });

    it("should maintain plan consistency during operations", async function () {
      // Test that plan data remains consistent throughout operations
      const initialPlan = await savingBank.getSavingPlan(1);
      
      // Create a deposit
      await mockUSDC.connect(user1).approve(savingBank.target, 2000_000000n);
      await savingBank.connect(user1).createDeposit(1, 2000_000000n, 100);
      
      // Plan should remain unchanged
      const currentPlan = await savingBank.getSavingPlan(1);
      expect(currentPlan.name).to.equal(initialPlan.name);
      expect(currentPlan.minDepositAmount).to.equal(initialPlan.minDepositAmount);
      expect(currentPlan.annualInterestRateInBasisPoints).to.equal(initialPlan.annualInterestRateInBasisPoints);
      expect(currentPlan.isActive).to.equal(initialPlan.isActive);
    });
  });
});
