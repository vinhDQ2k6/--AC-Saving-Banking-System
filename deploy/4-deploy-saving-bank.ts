import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/**
 * @title Deploy SavingBank
 * @notice Deploys the main SavingBank contract and sets up role permissions
 * @dev Step 4 of 5 in deployment sequence
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("4️⃣ Deploying SavingBank contract...");
    console.log("📋 Deployer:", deployer);

    // Get previously deployed contracts
    const mockUSDC = await get("MockUSDC");
    const depositCertificate = await get("DepositCertificate");
    const vault = await get("Vault");

    console.log("🪙 MockUSDC:", mockUSDC.address);
    console.log("📜 DepositCertificate:", depositCertificate.address);
    console.log("🏛️ Vault:", vault.address);

    // Deploy SavingBank
    const savingBankDeployment = await deploy("SavingBank", {
        from: deployer,
        args: [mockUSDC.address, depositCertificate.address, vault.address],
        log: true,
        waitConfirmations: 1,
    });

    console.log("🏦 SavingBank deployed at:", savingBankDeployment.address);

    // Setup role permissions
    console.log("\\n🔑 Setting up role permissions...");
    
    const vaultContract = await ethers.getContractAt("Vault", vault.address);
    const depositCert = await ethers.getContractAt("DepositCertificate", depositCertificate.address);
    
    // Grant SavingBank the LIQUIDITY_MANAGER_ROLE on Vault
    const LIQUIDITY_MANAGER_ROLE = await vaultContract.LIQUIDITY_MANAGER_ROLE();
    let tx = await vaultContract.grantRole(LIQUIDITY_MANAGER_ROLE, savingBankDeployment.address);
    await tx.wait();
    console.log("   ✅ LIQUIDITY_MANAGER_ROLE granted to SavingBank");

    // Grant SavingBank the WITHDRAW_ROLE on Vault  
    const WITHDRAW_ROLE = await vaultContract.WITHDRAW_ROLE();
    tx = await vaultContract.grantRole(WITHDRAW_ROLE, savingBankDeployment.address);
    await tx.wait();
    console.log("   ✅ WITHDRAW_ROLE granted to SavingBank");

    // Setup DepositCertificate minter role
    const MINTER_ROLE = await depositCert.MINTER_ROLE();
    tx = await depositCert.grantRole(MINTER_ROLE, savingBankDeployment.address);
    await tx.wait();
    console.log("   ✅ MINTER_ROLE granted to SavingBank");

    console.log("\\n✅ SavingBank deployment completed!");
    
    return true;
};

export default func;
func.tags = ["SavingBank"];
func.dependencies = ["MockUSDC", "DepositCertificate", "Vault"];
func.id = "deploy_saving_bank";