import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * @title Deploy DepositCertificate NFT
 * @notice Deploys the ERC721 NFT contract for deposit certificates
 * @dev Step 2 of 5 in deployment sequence
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("2️⃣ Deploying DepositCertificate contract...");
  console.log("📋 Deployer:", deployer);

  const depositCertificateDeployment = await deploy("DepositCertificate", {
    contract: "DepositCertificate",
    args: ["SavingBank Deposit Certificate", "SBDC"],
    from: deployer,
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  console.log("✅ DepositCertificate deployed at:", depositCertificateDeployment.address);
  console.log("🎫 NFT Name: SavingBank Deposit Certificate");
  console.log("🏷️ NFT Symbol: SBDC");
  console.log("⏱️ Transfer Cooldown: 24 hours");
  
  return true;
};

export default func;
func.tags = ["DepositCertificate", "nft"];
func.id = "deploy_deposit_certificate";
