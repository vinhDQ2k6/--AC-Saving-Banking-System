import { expect } from "chai";
import { ethers } from "hardhat";

describe("InterestCalculator Library", function () {
  let interestCalculator: any;
  const BASIS_POINTS = 10000n;
  const DAYS_PER_YEAR = 365n;

  before(async function () {
    // Deploy a contract that uses the InterestCalculator library
    const TestCalculator = await ethers.getContractFactory("SavingBank");
    const [deployer] = await ethers.getSigners();
    
    // We'll use SavingBank's calculateExpectedInterest function to test the library
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    const DepositCertificate = await ethers.getContractFactory("DepositCertificate");
    const certificate = await DepositCertificate.deploy("Test", "TEST");
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(mockUSDC.target);
    
    interestCalculator = await TestCalculator.deploy(mockUSDC.target, certificate.target, vault.target);
    
    // Create a test saving plan
    await interestCalculator.createSavingPlan({
      name: "Test Plan",
      minDepositAmount: 1000000n,
      maxDepositAmount: 0n,
      minTermInDays: 1,
      maxTermInDays: 365,
      annualInterestRateInBasisPoints: 500n, // 5%
      penaltyRateInBasisPoints: 200n // 2%
    });
  });

  describe("calculateSimpleInterest (via SavingBank)", function () {
    it("should calculate correct simple interest", async function () {
      // Test: 1000 USDC at 5% APR for 30 days
      const principal = 1000_000000n; // 1000 USDC (6 decimals)
      const planId = 1n;
      const termDays = 30;
      
      const interest = await interestCalculator.calculateExpectedInterest(
        principal,
        planId,
        termDays
      );
      
      // Expected: (1000 * 500 * 30) / (10000 * 365) = 4.109589 USDC
      const expected = (principal * 500n * 30n) / (BASIS_POINTS * DAYS_PER_YEAR);
      expect(interest).to.equal(expected);
      expect(Number(interest)).to.be.closeTo(4109589, 1); // ~4.11 USDC
    });

    it("should handle edge case: 1 day term", async function () {
      // Update plan with 3.65% rate for exact calculation
      await interestCalculator.updateSavingPlan(1, {
        name: "Test Plan",
        minDepositAmount: 1000000n,
        maxDepositAmount: 0n,
        minTermInDays: 1,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 365n, // 3.65%
        penaltyRateInBasisPoints: 200n
      });
      
      const principal = 1000_000000n;
      const interest = await interestCalculator.calculateExpectedInterest(
        principal,
        1,
        1
      );
      
      // 1 day at 3.65% should give exactly 0.01% = 0.1 USDC
      expect(interest).to.equal(100000n); // 0.1 USDC
    });

    it("should handle large amounts without overflow", async function () {
      // Update plan with 12% rate
      await interestCalculator.updateSavingPlan(1, {
        name: "Test Plan",
        minDepositAmount: 1000000n,
        maxDepositAmount: 0n,
        minTermInDays: 1,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 1200n, // 12%
        penaltyRateInBasisPoints: 200n
      });
      
      const principal = 1000000_000000n; // 1M USDC
      const interest = await interestCalculator.calculateExpectedInterest(
        principal,
        1,
        365
      );
      
      // 1M USDC at 12% for 1 year = 120K USDC
      expect(interest).to.equal(120000_000000n);
    });

    it("should revert for non-existent plan", async function () {
      try {
        await interestCalculator.calculateExpectedInterest(1000_000000n, 999, 30);
        expect.fail("Expected function to revert");
      } catch (error: any) {
        expect(error.message).to.include("SavingPlanNotFound");
      }
    });
  });

  describe("Interest calculation accuracy", function () {
    it("should match manual calculation for various scenarios", async function () {
      // Reset to 5% rate for consistent testing
      await interestCalculator.updateSavingPlan(1, {
        name: "Test Plan",
        minDepositAmount: 1000000n,
        maxDepositAmount: 0n,
        minTermInDays: 1,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 500n, // 5%
        penaltyRateInBasisPoints: 200n
      });
      
      const testCases = [
        { principal: 100_000000n, days: 7, expectedApprox: 95890n }, // ~0.096 USDC
        { principal: 500_000000n, days: 90, expectedApprox: 6164384n }, // ~6.16 USDC
        { principal: 10000_000000n, days: 180, expectedApprox: 246575342n }, // ~246.58 USDC
      ];
      
      for (const testCase of testCases) {
        const interest = await interestCalculator.calculateExpectedInterest(
          testCase.principal,
          1,
          testCase.days
        );
        const tolerance = Number(testCase.expectedApprox) / 100; // 1% tolerance
        expect(Number(interest)).to.be.closeTo(Number(testCase.expectedApprox), tolerance);
      }
    });
  });
});
