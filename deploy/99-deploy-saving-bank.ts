import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;

    const { deployer } = await getNamedAccounts();

    console.log("4️⃣ Deploying SavingBank contract...");
    console.log("📋 Using deployer:", deployer);

    // Get previously deployed contracts
    const mockUSDC = await get("MockUSDC");
    const depositCertificate = await get("DepositCertificate");
    const vault = await get("Vault");

    console.log("🪙 Using MockUSDC at:", mockUSDC.address);
    console.log("📜 Using DepositCertificate at:", depositCertificate.address);
    console.log("🏛️ Using Vault at:", vault.address);

    // Deploy SavingBank
    const savingBankDeployment = await deploy("SavingBank", {
        from: deployer,
        args: [mockUSDC.address, depositCertificate.address, vault.address],
        log: true,
        waitConfirmations: 1,
    });

    console.log("🏦 SavingBank deployed at:", savingBankDeployment.address);

    // Setup role permissions
    const savingBank = await ethers.getContractAt("SavingBank", savingBankDeployment.address);
    const vaultContract = await ethers.getContractAt("Vault", vault.address);
    
    console.log("🔑 Setting up role permissions...");
    
    // Grant SavingBank the LIQUIDITY_MANAGER_ROLE on Vault
    const LIQUIDITY_MANAGER_ROLE = await vaultContract.LIQUIDITY_MANAGER_ROLE();
    console.log("🔐 Granting LIQUIDITY_MANAGER_ROLE to SavingBank...");
    let tx = await vaultContract.grantRole(LIQUIDITY_MANAGER_ROLE, savingBankDeployment.address);
    await tx.wait();

    // Grant SavingBank the WITHDRAW_ROLE on Vault  
    const WITHDRAW_ROLE = await vaultContract.WITHDRAW_ROLE();
    console.log("💰 Granting WITHDRAW_ROLE to SavingBank...");
    tx = await vaultContract.grantRole(WITHDRAW_ROLE, savingBankDeployment.address);
    await tx.wait();

    // Setup DepositCertificate minter role
    const depositCert = await ethers.getContractAt("DepositCertificate", depositCertificate.address);
    const MINTER_ROLE = await depositCert.MINTER_ROLE();
    console.log("🎫 Granting MINTER_ROLE to SavingBank...");
    tx = await depositCert.grantRole(MINTER_ROLE, savingBankDeployment.address);
    await tx.wait();

    console.log("✅ SavingBank deployment completed!");
    console.log(`🏦 SavingBank Address: ${savingBankDeployment.address}`);
    console.log(`🏛️ Vault Address: ${vault.address}`);
    console.log(`📜 Certificate Address: ${depositCertificate.address}`);
    console.log(`🪙 Token Address: ${mockUSDC.address}`);
    console.log(`👤 Deployer: ${deployer}`);
    
    return true;
};

export default func;
func.tags = ["SavingBank"];
func.dependencies = ["MockUSDC", "DepositCertificate", "Vault"];
func.id = "deploy_saving_bank";