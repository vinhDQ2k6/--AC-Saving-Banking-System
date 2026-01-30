import { ethers } from "hardhat";
import { ONE_USDC, DEFAULT_PLAN_INPUT } from "./constants";

export async function deployFullFixture() {
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
  await vault.grantRole(LIQUIDITY_MANAGER_ROLE, admin.address); // Admin can add liquidity
  await vault.grantRole(WITHDRAW_ROLE, savingBank.target);
  await depositCertificate.grantRole(MINTER_ROLE, savingBank.target);
  await savingBank.grantRole(ADMIN_ROLE, admin.address);
  await savingBank.grantRole(PAUSER_ROLE, pauser.address);

  // Mint test tokens to users
  await mockUSDC.mint(user1.address, 1000000n * ONE_USDC);
  await mockUSDC.mint(user2.address, 1000000n * ONE_USDC);
  await mockUSDC.mint(admin.address, 10000000n * ONE_USDC); // Admin liquidity

  // Create default saving plan
  await savingBank.createSavingPlan({
    name: "Default Plan",
    minDepositAmount: 100n * ONE_USDC,
    maxDepositAmount: 0n, // 0 means no limit
    minTermInDays: 1,
    maxTermInDays: 365,
    annualInterestRateInBasisPoints: 800n, // 8%
    penaltyRateInBasisPoints: 100n // 1%
  });

  return {
    mockUSDC,
    depositCertificate,
    vault,
    savingBank,
    signers: [deployer, admin, pauser, user1, user2, feeReceiver],
    deployer,
    admin,
    pauser,
    user1,
    user2,
    feeReceiver
  };
}
