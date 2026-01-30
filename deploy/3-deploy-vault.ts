import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/**
 * @title Deploy Vault
 * @notice Deploys the Vault contract for liquidity management
 * @dev Step 3 of 5 in deployment sequence
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("3️⃣ Deploying Vault contract...");
    console.log("📋 Deployer:", deployer);

    // Get previously deployed contracts
    const mockUSDC = await get("MockUSDC");
    console.log("🪙 Using MockUSDC at:", mockUSDC.address);

    // Deploy Vault
    const vaultDeployment = await deploy("Vault", {
        from: deployer,
        args: [mockUSDC.address],
        log: true,
        waitConfirmations: 1,
    });

    console.log("🏛️ Vault deployed at:", vaultDeployment.address);

    // Grant LIQUIDITY_MANAGER_ROLE to deployer (temporary for initial setup)
    const vault = await ethers.getContractAt("Vault", vaultDeployment.address);
    const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
    
    console.log("🔑 Granting LIQUIDITY_MANAGER_ROLE to deployer...");
    const tx = await vault.grantRole(LIQUIDITY_MANAGER_ROLE, deployer);
    await tx.wait();

    console.log("✅ Vault deployment completed!");
    
    return true;
};

export default func;
func.tags = ["Vault"];
func.dependencies = ["MockUSDC"];
func.id = "deploy_vault";