import { ethers, deployments } from "hardhat";

/**
 * @title Deployment Verification Utility
 * @notice Quick verification tool for deployed SavingBank contracts
 * @dev Works with both localhost and testnet deployments
 * @dev Usage: npx hardhat run scripts/verify-deployment.ts --network localhost
 */
async function main() {
  console.log("🔍 Verifying Local Deployment...");

  // Get network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("👤 Connected as:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("🌐 Network:", network.name, `(${network.chainId})`);
  console.log();

  try {
    // Get all deployments
    const allDeployments = await deployments.all();
    
    if (Object.keys(allDeployments).length === 0) {
      console.log("⚠️  No deployments found.");
      console.log("   Run: npx hardhat deploy --network localhost");
      return;
    }

    console.log("📋 Deployed Contracts:");
    console.log("========================");
    
    for (const [name, deployment] of Object.entries(allDeployments)) {
      console.log(`✅ ${name}: ${deployment.address}`);
    }
    console.log();

    // Test MockUSDC
    if (allDeployments.MockUSDC) {
      const mockUSDC = await ethers.getContractAt("MockUSDC", allDeployments.MockUSDC.address);
      const symbol = await mockUSDC.symbol();
      const decimals = await mockUSDC.decimals();
      const totalSupply = await mockUSDC.totalSupply();
      
      console.log("💰 MockUSDC Test:");
      console.log(`   Symbol: ${symbol}, Decimals: ${decimals}`);
      console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      console.log();
    }

    // Test SavingBank
    if (allDeployments.SavingBank) {
      const savingBank = await ethers.getContractAt("SavingBank", allDeployments.SavingBank.address);
      const paused = await savingBank.paused();
      
      console.log("🏦 SavingBank Test:");
      console.log(`   Contract paused: ${paused}`);
      console.log();
    }

    console.log("🎉 Deployment verification successful!");
    console.log("💡 All contracts deployed and responsive!");

  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });