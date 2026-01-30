import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/**
 * 🔒 SECURITY SETUP SCRIPT
 * 
 * This script transfers DEFAULT_ADMIN_ROLE from deployer to a multisig wallet
 * for production security. This prevents single-point-of-failure attacks.
 * 
 * ⚠️  CRITICAL: Update MULTISIG_ADDRESS before mainnet deployment!
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { get } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("5️⃣ Setting up Admin Security...");
    console.log("📋 Network:", network.name);
    console.log("📋 Deployer:", deployer);

    // ⚠️  IMPORTANT: Set this to your actual multisig address for production!
    // For testnet/local, we keep deployer as admin
    const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || deployer;
    
    const isProduction = network.name === "mainnet" || network.name === "polygon";
    const isTestnet = network.name === "sepolia" || network.name === "goerli" || network.name === "mumbai";

    if (isProduction && MULTISIG_ADDRESS === deployer) {
        console.log("🚨 WARNING: MULTISIG_ADDRESS not set for production deployment!");
        console.log("🚨 Set MULTISIG_ADDRESS environment variable before deploying to mainnet!");
        throw new Error("MULTISIG_ADDRESS required for production deployment");
    }

    // Get deployed contracts
    const savingBank = await get("SavingBank");
    const vault = await get("Vault");
    const depositCertificate = await get("DepositCertificate");
    const mockUSDC = await get("MockUSDC");

    console.log("\n📊 Deployed Contracts:");
    console.log(`   SavingBank: ${savingBank.address}`);
    console.log(`   Vault: ${vault.address}`);
    console.log(`   DepositCertificate: ${depositCertificate.address}`);
    console.log(`   MockUSDC: ${mockUSDC.address}`);

    // Get contract instances
    const savingBankContract = await ethers.getContractAt("SavingBank", savingBank.address);
    const vaultContract = await ethers.getContractAt("Vault", vault.address);
    const depositCertContract = await ethers.getContractAt("DepositCertificate", depositCertificate.address);
    const mockUSDCContract = await ethers.getContractAt("MockUSDC", mockUSDC.address);

    const DEFAULT_ADMIN_ROLE = await savingBankContract.DEFAULT_ADMIN_ROLE();

    console.log("\n🔐 Current Role Status:");
    console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);

    // Check current admin status
    const isSavingBankAdmin = await savingBankContract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
    const isVaultAdmin = await vaultContract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
    const isCertAdmin = await depositCertContract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
    const isUSDCAdmin = await mockUSDCContract.hasRole(DEFAULT_ADMIN_ROLE, deployer);

    console.log(`   Deployer is SavingBank admin: ${isSavingBankAdmin}`);
    console.log(`   Deployer is Vault admin: ${isVaultAdmin}`);
    console.log(`   Deployer is Certificate admin: ${isCertAdmin}`);
    console.log(`   Deployer is MockUSDC admin: ${isUSDCAdmin}`);

    // Only transfer if deploying to testnet/mainnet AND multisig is different
    if ((isTestnet || isProduction) && MULTISIG_ADDRESS !== deployer) {
        console.log("\n🔄 Transferring DEFAULT_ADMIN_ROLE to multisig...");
        console.log(`   Multisig Address: ${MULTISIG_ADDRESS}`);

        // Step 1: Grant DEFAULT_ADMIN_ROLE to multisig
        console.log("\n   Step 1: Granting admin role to multisig...");
        
        let tx = await savingBankContract.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
        await tx.wait();
        console.log("   ✅ SavingBank: Admin granted to multisig");

        tx = await vaultContract.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
        await tx.wait();
        console.log("   ✅ Vault: Admin granted to multisig");

        tx = await depositCertContract.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
        await tx.wait();
        console.log("   ✅ DepositCertificate: Admin granted to multisig");

        tx = await mockUSDCContract.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
        await tx.wait();
        console.log("   ✅ MockUSDC: Admin granted to multisig");

        // Step 2: Revoke DEFAULT_ADMIN_ROLE from deployer
        console.log("\n   Step 2: Revoking admin role from deployer...");

        tx = await savingBankContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        await tx.wait();
        console.log("   ✅ SavingBank: Admin revoked from deployer");

        tx = await vaultContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        await tx.wait();
        console.log("   ✅ Vault: Admin revoked from deployer");

        tx = await depositCertContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        await tx.wait();
        console.log("   ✅ DepositCertificate: Admin revoked from deployer");

        tx = await mockUSDCContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        await tx.wait();
        console.log("   ✅ MockUSDC: Admin revoked from deployer");

        // Verify transfer
        console.log("\n🔍 Verifying admin transfer...");
        const multisigIsSavingBankAdmin = await savingBankContract.hasRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
        const multisigIsVaultAdmin = await vaultContract.hasRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
        const multisigIsCertAdmin = await depositCertContract.hasRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);

        console.log(`   Multisig is SavingBank admin: ${multisigIsSavingBankAdmin}`);
        console.log(`   Multisig is Vault admin: ${multisigIsVaultAdmin}`);
        console.log(`   Multisig is Certificate admin: ${multisigIsCertAdmin}`);

        if (multisigIsSavingBankAdmin && multisigIsVaultAdmin && multisigIsCertAdmin) {
            console.log("\n✅ Admin role successfully transferred to multisig!");
        } else {
            console.log("\n🚨 WARNING: Admin transfer may not be complete. Please verify manually.");
        }

    } else {
        console.log("\n⚠️  Skipping admin transfer (local/hardhat network or same address)");
        console.log("   For production, set MULTISIG_ADDRESS environment variable");
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("\n📋 Deployment Summary:");
    console.log(`   Network: ${network.name}`);
    console.log(`   SavingBank: ${savingBank.address}`);
    console.log(`   Vault: ${vault.address}`);
    console.log(`   DepositCertificate: ${depositCertificate.address}`);
    console.log(`   MockUSDC: ${mockUSDC.address}`);
    console.log(`   Admin: ${MULTISIG_ADDRESS}`);
    console.log("\n🔒 Security Features:");
    console.log("   ✅ NFT-based withdrawal rights");
    console.log("   ✅ 24-hour transfer cooldown protection");
    console.log("   ✅ Role-based access control");
    console.log("   ✅ Reentrancy protection");
    console.log("   ✅ Emergency pause functionality");
    
    return true;
};

export default func;
func.tags = ["AdminSecurity", "Security"];
func.dependencies = ["SavingBank"];
func.id = "setup_admin_security";
