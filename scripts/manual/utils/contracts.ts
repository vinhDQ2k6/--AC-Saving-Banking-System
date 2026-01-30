import { ethers, deployments } from "hardhat";

export const getContracts = async () => {
  const [signer] = await ethers.getSigners();
  
  // Get all deployments
  const allDeployments = await deployments.all();
  
  // Get contracts using ethers.getContractAt with deployed addresses
  const usdc = await ethers.getContractAt("MockUSDC", allDeployments.MockUSDC.address);
  const certificate = await ethers.getContractAt("DepositCertificate", allDeployments.DepositCertificate.address);
  const vault = await ethers.getContractAt("Vault", allDeployments.Vault.address);
  const savingBank = await ethers.getContractAt("SavingBank", allDeployments.SavingBank.address);

  return {
    usdc,
    certificate,
    vault,
    savingBank,
    signer,
    addresses: {
      usdc: allDeployments.MockUSDC.address,
      certificate: allDeployments.DepositCertificate.address,
      vault: allDeployments.Vault.address,
      savingBank: allDeployments.SavingBank.address
    }
  };
};

export const getSigner = async () => {
    const [signer] = await ethers.getSigners();
    return signer;
}
