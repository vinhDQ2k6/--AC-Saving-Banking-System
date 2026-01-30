import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * @title Deploy MockUSDC Token
 * @notice Deploys the MockUSDC token for testing purposes
 * @dev Step 1 of 5 in deployment sequence
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("1️⃣ Deploying MockUSDC token...");
  console.log("📋 Deployer:", deployer);

  const mockUSDCDeployment = await deploy("MockUSDC", {
    contract: "MockUSDC",
    args: [],
    from: deployer,
    log: true,
    autoMine: true,
  });

  console.log("✅ MockUSDC deployed at:", mockUSDCDeployment.address);
  console.log("💰 Decimals: 6 (USDC standard)");
  console.log("🏦 Initial supply: 1,000,000 USDC");
  
  return true;
};

export default func;
func.tags = ["MockUSDC", "token"];
func.id = "deploy_mock_usdc";
