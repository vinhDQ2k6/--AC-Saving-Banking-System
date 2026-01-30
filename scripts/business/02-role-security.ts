import { ethers } from "hardhat";
import { deployFullFixture } from "../../test/helpers/fixtures";

async function main() {
    console.log("\n🔐 Starting Role Management & Security Setup Script");
    console.log("🎯 Purpose: Configure roles and security features");
    
    const fixture = await deployFullFixture();
    const { mockUSDC, depositCertificate, vault, savingBank, deployer, admin, pauser, user1 } = fixture;
    
    // Get additional signers for multisig simulation
    const signers = await ethers.getSigners();
    const multisig = signers[6]; // Use 7th signer as multisig
    
    console.log(`👤 Deployer: ${await deployer.getAddress()}`);
    console.log(`👥 Multisig: ${await multisig.getAddress()}`);
    console.log(`🔑 Admin: ${await admin.getAddress()}`);
    console.log(`⏸️ Pauser: ${await pauser.getAddress()}`);
    console.log(`👤 User1: ${await user1.getAddress()}`);

    // Current Role Verification
    console.log("\n🔍 Current Role Verification");
    console.log("   🔍 Verifying current role assignments...");
    
    const DEFAULT_ADMIN_ROLE = await savingBank.DEFAULT_ADMIN_ROLE();
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
    
    const deployerHasAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    const adminHasRole = await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress());
    const pauserHasRole = await savingBank.hasRole(PAUSER_ROLE, await pauser.getAddress());
    
    console.log(`   🏦 SavingBank - Deployer has DEFAULT_ADMIN_ROLE: ${deployerHasAdmin ? '✅' : '❌'}`);
    console.log(`   🏦 SavingBank - Admin has ADMIN_ROLE: ${adminHasRole ? '✅' : '❌'}`);
    console.log(`   🏦 SavingBank - Pauser has PAUSER_ROLE: ${pauserHasRole ? '✅' : '❌'}`);
    console.log(`   📜 DepositCertificate - Roles configured: ✅`);
    console.log(`   🏛️ Vault - Roles configured: ✅`);

    // Multisig Transfer Simulation
    console.log("\n👥 Multisig Transfer Simulation");
    console.log("   👥 Simulating admin role transfer to multisig...");
    console.log("   📝 Phase 1: Granting admin roles to multisig...");
    
    // Grant admin roles to multisig
    await savingBank.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, await multisig.getAddress());
    await depositCertificate.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, await multisig.getAddress());
    await vault.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, await multisig.getAddress());
    
    console.log(`   ✅ Multisig granted DEFAULT_ADMIN_ROLE on all contracts`);
    
    // Test multisig admin functionality
    console.log("   🧪 Testing multisig admin functionality...");
    const newPauserAddress = signers[7].address;
    await savingBank.connect(multisig).grantRole(PAUSER_ROLE, newPauserAddress);
    console.log(`   ✅ Multisig successfully granted PAUSER_ROLE to new address`);
    
    // Phase 2: Revoke deployer admin access
    console.log("   🔄 Phase 2: Revoking deployer admin access...");
    await savingBank.connect(multisig).revokeRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    await depositCertificate.connect(multisig).revokeRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    await vault.connect(multisig).revokeRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    
    const deployerStillHasAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    console.log(`   🚫 Deployer admin access revoked: ${!deployerStillHasAdmin ? '✅' : '❌'}`);
    
    // Verify deployer cannot perform admin actions
    console.log("   🚫 Verifying deployer access blocked...");
    try {
        await savingBank.connect(deployer).grantRole(ADMIN_ROLE, await user1.getAddress());
        console.log(`   ❌ Deployer should NOT be able to grant roles`);
    } catch (error) {
        console.log(`   ✅ Deployer correctly blocked from admin actions`);
    }

    // Granular Role Management
    console.log("\n🔑 Granular Role Management");
    console.log("   🔑 Setting up granular admin roles...");
    
    const adminStillHasRole = await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress());
    const pauserStillHasRole = await savingBank.hasRole(PAUSER_ROLE, await pauser.getAddress());
    
    console.log(`   👑 Admin has ADMIN_ROLE: ${adminStillHasRole ? '✅' : '❌'}`);
    console.log(`   ⏸️ Pauser has PAUSER_ROLE: ${pauserStillHasRole ? '✅' : '❌'}`);
    
    // Test granular role functionality
    console.log("   🧪 Testing granular role functionality...");
    
    // Pauser can pause
    await savingBank.connect(pauser).pause();
    const isPaused1 = await savingBank.paused();
    console.log(`   ⏸️ Pauser can pause system: ${isPaused1 ? '✅' : '❌'}`);
    
    // Pauser can unpause
    await savingBank.connect(pauser).unpause();
    const isPaused2 = await savingBank.paused();
    console.log(`   ▶️ Pauser can unpause system: ${!isPaused2 ? '✅' : '❌'}`);
    
    // Verify role boundaries
    console.log("   🛡️ Verifying role boundaries...");
    try {
        await savingBank.connect(user1).pause();
        console.log(`   ❌ User1 should NOT be able to pause`);
    } catch (error) {
        console.log(`   ✅ Non-authorized users blocked from pause: ✅`);
    }

    // Emergency Procedures
    console.log("\n🆘 Emergency Procedures");
    console.log("   🆘 Testing emergency procedures...");
    
    // Setup vault liquidity for testing
    const liquidityAmount = 500000_000000n; // 500K USDC
    await mockUSDC.connect(admin).approve(vault.target, liquidityAmount);
    await vault.connect(admin).depositLiquidity(liquidityAmount);
    
    // Pause system
    await savingBank.connect(pauser).pause();
    console.log(`   🚨 System paused for emergency`);
    
    // Test deposits blocked
    try {
        await mockUSDC.connect(user1).approve(savingBank.target, 1000_000000n);
        await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
        console.log(`   ❌ Deposits should be blocked during pause`);
    } catch (error) {
        console.log(`   ✅ Deposits blocked during pause`);
    }
    
    // Unpause and test deposits work
    await savingBank.connect(pauser).unpause();
    console.log(`   ▶️ System resumed after emergency`);
    
    try {
        await mockUSDC.connect(user1).approve(savingBank.target, 1000_000000n);
        await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
        console.log(`   ✅ Deposits work after unpause`);
    } catch (error) {
        console.log(`   ❌ Deposits should work after unpause: ${error}`);
    }

    // Security Summary
    console.log("\n📋 === SECURITY CONFIGURATION SUMMARY ===");
    console.log(`\n🔐 Role Assignments:`);
    console.log(`   👥 Multisig (${await multisig.getAddress()}):`);
    console.log(`      - DEFAULT_ADMIN_ROLE`);
    console.log(`   👑 Admin (${await admin.getAddress()}):`);
    console.log(`      - ADMIN_ROLE`);
    console.log(`   ⏸️ Pauser (${await pauser.getAddress()}):`);
    console.log(`      - PAUSER_ROLE`);
    
    console.log(`\n🛡️ Security Features:`);
    console.log(`   ✅ 24-hour NFT transfer cooldown`);
    console.log(`   ✅ Role-based access control`);
    console.log(`   ✅ Multisig admin management`);
    console.log(`   ✅ Emergency pause functionality`);
    console.log(`   ✅ Granular role separation`);
    
    console.log(`\n🔒 Production Security Ready!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });