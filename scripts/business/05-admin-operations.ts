import { ethers } from "hardhat";
import { deployFullFixture } from "../../test/helpers/fixtures";

async function main() {
    console.log("\n🔧 Starting Admin Operations & System Management Script");
    console.log("🎯 Purpose: Demonstrate admin capabilities and system management");
    
    const fixture = await deployFullFixture();
    const { mockUSDC, depositCertificate, vault, savingBank, deployer, admin, pauser, user1, user2, feeReceiver } = fixture;
    
    console.log(`🔧 Admin: ${await admin.getAddress()}`);
    console.log(`⏸️ Pauser: ${await pauser.getAddress()}`);
    
    // Setup vault liquidity
    await mockUSDC.connect(admin).approve(vault.target, 500000_000000n);
    await vault.connect(admin).depositLiquidity(500000_000000n);
    console.log(`💰 Vault liquidity: 500,000 USDC`);

    // Savings Plan Management
    console.log("\n⚙️ Savings Plan Management");
    
    // Check initial savings plan
    console.log("   ⚙️ Checking initial savings plan...");
    const plan1 = await savingBank.getSavingPlan(1);
    
    console.log(`   📋 Plan 1: "${plan1.name}"`);
    console.log(`      Min Deposit: ${ethers.formatUnits(plan1.minDepositAmount, 6)} USDC`);
    console.log(`      Term Range: ${plan1.minTermInDays}-${plan1.maxTermInDays} days`);
    console.log(`      APR: ${Number(plan1.annualInterestRateInBasisPoints) / 100}%`);
    console.log(`      Active: ${plan1.isActive ? 'true' : 'false'}`);
    
    // Create new savings plan
    console.log("   ➕ Creating new savings plan...");
    const premiumPlan = {
        name: "Premium Plan",
        minDepositAmount: 10000_000000n, // 10K USDC minimum
        maxDepositAmount: 0n, // No maximum
        minTermInDays: 90,
        maxTermInDays: 365,
        annualInterestRateInBasisPoints: 1000n, // 10% APR
        penaltyRateInBasisPoints: 200n // 2% penalty
    };
    
    await savingBank.connect(admin).createSavingPlan(premiumPlan);
    console.log(`   ✅ New plan created: "${premiumPlan.name}"`);
    console.log(`      Min Deposit: ${ethers.formatUnits(premiumPlan.minDepositAmount, 6)} USDC`);
    console.log(`      APR: ${Number(premiumPlan.annualInterestRateInBasisPoints) / 100}%`);
    
    // Test unauthorized plan creation
    console.log("   🚫 Testing unauthorized plan creation...");
    try {
        await savingBank.connect(user1).createSavingPlan(premiumPlan);
        console.log(`   ❌ User1 should NOT be able to create plans`);
    } catch (error) {
        console.log(`   ✅ Non-admin correctly prevented from adding plans`);
    }

    // Pause/Unpause Operations
    console.log("\n⏸️ Pause/Unpause Operations");
    
    // Pause system
    console.log("   ⏸️ Pausing system...");
    await savingBank.connect(pauser).pause();
    const isPausedAfterPause = await savingBank.paused();
    console.log(`   ✅ System paused by pauser: ${isPausedAfterPause ? '✅' : '❌'}`);
    
    // Test deposit blocking when paused
    console.log("   🚫 Testing deposit blocking when paused...");
    try {
        await mockUSDC.connect(user1).approve(savingBank.target, 1000_000000n);
        await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
        console.log(`   ❌ Deposits should be blocked while paused`);
    } catch (error) {
        console.log(`   ✅ Deposits correctly blocked while paused`);
    }
    
    // Unpause system
    console.log("   ▶️ Unpausing system...");
    await savingBank.connect(pauser).unpause();
    const isPausedAfterUnpause = await savingBank.paused();
    console.log(`   ✅ System unpaused by pauser: ${!isPausedAfterUnpause ? '✅' : '❌'}`);
    
    // Test deposit after unpause
    console.log("   💳 Testing deposit after unpause...");
    try {
        await mockUSDC.connect(user1).approve(savingBank.target, 1000_000000n);
        await savingBank.connect(user1).createDeposit(1, 1000_000000n, 30);
        console.log(`   ✅ Deposit successful after unpause`);
    } catch (error) {
        console.log(`   ❌ Deposits should work after unpause: ${error}`);
    }

    // Vault Management
    console.log("\n🏦 Vault Management");
    
    // Check vault status
    console.log("   🏦 Checking vault status...");
    const vaultBalance = await vault.getBalance();
    const reportedBalance = await mockUSDC.balanceOf(vault.target);
    
    console.log(`   💰 Vault USDC Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
    console.log(`   📊 Reported Balance: ${ethers.formatUnits(reportedBalance, 6)} USDC`);
    
    // Add additional vault liquidity
    console.log("   💰 Adding additional vault liquidity...");
    const additionalLiquidity = 100000_000000n;
    const balanceBefore = await vault.getBalance();
    
    await mockUSDC.connect(admin).approve(vault.target, additionalLiquidity);
    await vault.connect(admin).depositLiquidity(additionalLiquidity);
    
    const balanceAfter = await vault.getBalance();
    
    console.log(`   📊 Balance Before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);
    console.log(`   📊 Balance After: ${ethers.formatUnits(balanceAfter, 6)} USDC`);
    console.log(`   ➕ Added: ${ethers.formatUnits(additionalLiquidity, 6)} USDC`);
    
    // Withdraw liquidity via adminWithdraw
    console.log("   💸 Withdrawing liquidity via adminWithdraw...");
    const withdrawAmount = 50000_000000n;
    const vaultBalanceBefore = await vault.getBalance();
    const deployerBalanceBefore = await mockUSDC.balanceOf(await deployer.getAddress());
    
    await vault.connect(deployer).adminWithdraw(withdrawAmount);
    
    const vaultBalanceAfter = await vault.getBalance();
    const deployerBalanceAfter = await mockUSDC.balanceOf(await deployer.getAddress());
    
    console.log(`   📊 Vault Balance Before: ${ethers.formatUnits(vaultBalanceBefore, 6)} USDC`);
    console.log(`   📊 Vault Balance After: ${ethers.formatUnits(vaultBalanceAfter, 6)} USDC`);
    console.log(`   💵 Received: ${ethers.formatUnits(deployerBalanceAfter - deployerBalanceBefore, 6)} USDC`);

    // Access Control Verification
    console.log("\n🔒 Access Control Verification");
    
    // Verify role separation
    console.log("   🔒 Verifying role separation...");
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    
    const adminHasRole = await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress());
    const user1HasRole = await savingBank.hasRole(ADMIN_ROLE, await user1.getAddress());
    const user2HasRole = await savingBank.hasRole(ADMIN_ROLE, await user2.getAddress());
    
    console.log(`   ✅ Role separation verified: Admin(${adminHasRole ? '✅' : '❌'}) Users(${!user1HasRole && !user2HasRole ? '✅' : '❌'})`);
    
    // Test unauthorized vault operations
    console.log("   🚫 Testing unauthorized vault operations...");
    try {
        await vault.connect(user1).adminWithdraw(1000_000000n);
        console.log(`   ❌ User1 should NOT be able to withdraw from vault`);
    } catch (error) {
        console.log(`   ✅ Unauthorized vault withdrawal blocked`);
    }

    // Admin Dashboard Summary
    const finalVaultBalance = await vault.getBalance();
    const totalNFTs = await depositCertificate.totalSupply();
    const systemPaused = await savingBank.paused();
    
    console.log("\n📊 === ADMIN OPERATIONS SUMMARY ===");
    console.log(`\n⚙️ System Status: ${systemPaused ? '⏸️ PAUSED' : '▶️ ACTIVE'}`);
    console.log(`\n🏦 Vault Status:`);
    console.log(`   💰 Available Liquidity: ${ethers.formatUnits(finalVaultBalance, 6)} USDC`);
    console.log(`\n📋 Savings Plans:`);
    console.log(`   Plan 1: Default Plan - 8% APR`);
    console.log(`   Plan 2: Premium Plan - 10% APR`);
    console.log(`\n🎫 Active Deposits: ${totalNFTs} NFTs`);
    console.log(`\n👥 Key Addresses:`);
    console.log(`   🔧 Admin: ${await admin.getAddress()}`);
    console.log(`   ⏸️ Pauser: ${await pauser.getAddress()}`);
    console.log(`   💰 Fee Receiver: ${await feeReceiver.getAddress()}`);
    
    console.log(`\n✅ Admin Operations Tests Complete!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });