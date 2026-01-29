import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("2️⃣ Deploying DepositCertificate contract...");
  console.log("📋 Using deployer:", deployer);

  const depositCertificateDeployment = await deploy("DepositCertificate", {
    contract: "DepositCertificate",
    args: ["SavingBank Deposit Certificate", "SBDC"],
    from: deployer,
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  console.log("📜 DepositCertificate deployed at:", depositCertificateDeployment.address);
  console.log(`🎫 NFT Name: SavingBank Deposit Certificate`);
  console.log(`🏷️ NFT Symbol: SBDC`);
  console.log(`👤 Deployer: ${deployer}`);
};

func.tags = ["DepositCertificate", "nft"];
export default func;
