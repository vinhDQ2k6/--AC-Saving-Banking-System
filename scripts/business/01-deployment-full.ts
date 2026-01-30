import { ethers } from "hardhat";
import { deployFullFixture } from "../../test/helpers/fixtures";

async function main() {
    console.log("\n🚀 Starting Full Deployment Script");
    console.log("🎯 Purpose: Deploy and verify complete SavingBank system");
    
    const fixture = await deployFullFixture();
    const { mockUSDC, depositCertificate, vault, savingBank, deployer, admin, user1, user2 } = fixture;
    
    console.log(`👤 Deployer: ${await deployer.getAddress()}`);
    console.log(`👤 Admin: ${await admin.getAddress()}`);
    console.log(`👤 User1: ${await user1.getAddress()}`);
    console.log(`👤 User2: ${await user2.getAddress()}`);

    // Stage 1: MockUSDC Verification
    console.log("\n📦 Stage 1: MockUSDC Verification");
    console.log("   🪙 Verifying MockUSDC...");
    
    const name = await mockUSDC.name();
    const symbol = await mockUSDC.symbol();
    const decimals = await mockUSDC.decimals();
    
    console.log(`   ✅ MockUSDC: ${name} (${symbol}), Decimals: ${decimals}`);
    
    const user1Balance = await mockUSDC.balanceOf(await user1.getAddress());
    const user2Balance = await mockUSDC.balanceOf(await user2.getAddress());
    
    console.log(`   💰 User1 balance: ${ethers.formatUnits(user1Balance, 6)} USDC`);
    console.log(`   💰 User2 balance: ${ethers.formatUnits(user2Balance, 6)} USDC`);

    // Stage 2: DepositCertificate Verification
    console.log("\n📜 Stage 2: DepositCertificate Verification");
    console.log("   📜 Verifying DepositCertificate...");
    
    const nftName = await depositCertificate.name();
    const nftSymbol = await depositCertificate.symbol();
    const cooldownPeriod = await depositCertificate.TRANSFER_COOLDOWN();
    
    console.log(`   ✅ NFT: ${nftName} (${nftSymbol})`);
    console.log(`   ⏱️ Transfer Cooldown: ${cooldownPeriod} seconds (${Number(cooldownPeriod) / 3600} hours)`);
    
    // Check roles
    const DEFAULT_ADMIN_ROLE = await depositCertificate.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await depositCertificate.MINTER_ROLE();
    
    const deployerHasAdmin = await depositCertificate.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    const savingBankHasMinter = await depositCertificate.hasRole(MINTER_ROLE, savingBank.target);
    
    console.log(`   🔐 Deployer has DEFAULT_ADMIN_ROLE: ${deployerHasAdmin ? '✅' : '❌'}`);
    console.log(`   🔐 SavingBank has MINTER_ROLE: ${savingBankHasMinter ? '✅' : '❌'}`);

    // Stage 3: Vault Verification
    console.log("\n🏛️ Stage 3: Vault Verification");
    console.log("   🏛️ Verifying Vault...");
    
    console.log(`   ✅ Vault deployed at: ${vault.target}`);
    console.log(`   🪙 Vault token: ${await vault.getToken()}`);
    
    // Add liquidity to vault
    const liquidityAmount = 100000_000000n; // 100K USDC
    await mockUSDC.connect(admin).approve(vault.target, liquidityAmount);
    await vault.connect(admin).depositLiquidity(liquidityAmount);
    
    const vaultBalance = await vault.getBalance();
    console.log(`   💰 Vault liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
    
    // Check vault roles
    const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
    const adminHasLiquidityManager = await vault.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    const savingBankHasLiquidityManager = await vault.hasRole(LIQUIDITY_MANAGER_ROLE, savingBank.target);
    
    console.log(`   🔐 Deployer has DEFAULT_ADMIN_ROLE: ${adminHasLiquidityManager ? '✅' : '❌'}`);
    console.log(`   🔐 SavingBank has LIQUIDITY_MANAGER_ROLE: ${savingBankHasLiquidityManager ? '✅' : '❌'}`);

    // Stage 4: SavingBank Verification
    console.log("\n🏦 Stage 4: SavingBank Verification");
    console.log("   🏦 Verifying SavingBank...");
    
    console.log(`   ✅ SavingBank deployed at: ${savingBank.target}`);
    console.log(`   🏛️ References Vault: ${await savingBank.vault()}`);
    console.log(`   📜 References Certificate: ${await savingBank.depositCertificate()}`);
    
    // Check SavingBank roles
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    const deployerHasSBAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
    const adminHasSBAdmin = await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress());
    
    console.log(`   🔐 Deployer has DEFAULT_ADMIN_ROLE: ${deployerHasSBAdmin ? '✅' : '❌'}`);
    console.log(`   🔐 Admin has ADMIN_ROLE: ${adminHasSBAdmin ? '✅' : '❌'}`);

    // Stage 5: Cross-Contract Integration Test
    console.log("\n🧪 Stage 5: Integration Test");
    console.log("   🧪 Testing deposit creation...");
    
    const depositAmount = 1000_000000n; // 1000 USDC
    const termDays = 30;
    
    // User approves and creates deposit
    await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
    const tx = await savingBank.connect(user1).createDeposit(1, depositAmount, termDays);
    const receipt = await tx.wait();
    
    // Extract deposit ID from event
    const depositEvent = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositCreated'
    );
    const eventLog = depositEvent as import("ethers").EventLog | undefined;
    const depositId = eventLog?.args[0];
    const certificateId = eventLog?.args[6];
    
    // Verify NFT ownership
    const nftOwner = await depositCertificate.ownerOf(certificateId);
    const isOwnerCorrect = nftOwner === await user1.getAddress();
    
    // Verify deposit info
    const deposit = await savingBank.getDeposit(depositId);
    const amountCorrect = deposit.amount === depositAmount;
    const termCorrect = deposit.termInDays === BigInt(termDays);
    
    console.log(`   ✅ Deposit created successfully - ID: ${depositId}`);
    console.log(`   🎫 NFT Certificate: #${certificateId}`);
    console.log(`   👤 Owner correct: ${isOwnerCorrect ? '✅' : '❌'}`);
    console.log(`   💰 Amount correct: ${amountCorrect ? '✅' : '❌'}`);
    console.log(`   📅 Term correct: ${termCorrect ? '✅' : '❌'}`);
    console.log(`   🔒 NFT ready for use (cooldown only after transfer)`);

    // Final Summary
    console.log("\n📋 === DEPLOYMENT SUMMARY ===");
    console.log(`🪙 MockUSDC: ${mockUSDC.target}`);
    console.log(`📜 DepositCertificate: ${depositCertificate.target}`);
    console.log(`🏛️ Vault: ${vault.target}`);
    console.log(`🏦 SavingBank: ${savingBank.target}`);
    
    const finalVaultBalance = await vault.getBalance();
    const totalNFTs = await depositCertificate.totalSupply();
    
    console.log(`\n💰 Financial State:`);
    console.log(`   Vault Balance: ${ethers.formatUnits(finalVaultBalance, 6)} USDC`);
    console.log(`\n🎫 NFT State:`);
    console.log(`   Total NFTs Minted: ${totalNFTs}`);
    
    console.log(`\n✅ Deployment Complete - Ready for Business Operations!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });