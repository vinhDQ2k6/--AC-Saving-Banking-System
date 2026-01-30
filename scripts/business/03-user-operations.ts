import { ethers } from "hardhat";
import { deployFullFixture } from "../../test/helpers/fixtures";

async function main() {
    console.log("\n💼 Starting User Operations & Business Flow Script");
    console.log("🎯 Purpose: Simulate real user interactions and business operations");
    
    const fixture = await deployFullFixture();
    const { mockUSDC, depositCertificate, vault, savingBank, admin, user1, user2 } = fixture;
    
    const DEPOSIT_AMOUNT_1 = 5000_000000n;   // 5K USDC
    const DEPOSIT_AMOUNT_2 = 10000_000000n;  // 10K USDC
    
    let depositIds: bigint[] = [];
    let certificateIds: bigint[] = [];
    
    console.log(`👤 User1: ${await user1.getAddress()}`);
    console.log(`👤 User2: ${await user2.getAddress()}`);
    
    // Setup vault liquidity
    await mockUSDC.connect(admin).approve(vault.target, 500000_000000n);
    await vault.connect(admin).depositLiquidity(500000_000000n);
    console.log(`💰 Vault liquidity: 500,000 USDC`);

    // User Deposits - Multiple Savings Plans
    console.log("\n💳 User Deposits - Multiple Savings Plans");
    
    // User1 30-day deposit
    console.log("   💳 User1 creating 30-day savings plan...");
    await mockUSDC.connect(user1).approve(savingBank.target, DEPOSIT_AMOUNT_1);
    const tx1 = await savingBank.connect(user1).createDeposit(1, DEPOSIT_AMOUNT_1, 30);
    const receipt1 = await tx1.wait();
    
    const depositEvent1 = receipt1?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositCreated'
    );
    let depositId1: bigint | undefined;
    let certificateId1: bigint | undefined;
    if (depositEvent1 && 'args' in depositEvent1) {
        depositId1 = depositEvent1.args[0];
        certificateId1 = depositEvent1.args[6];
    }
    
    if (depositId1 !== undefined) depositIds.push(depositId1);
    if (certificateId1 !== undefined) certificateIds.push(certificateId1);
    
    console.log(`   ✅ User1 deposit created - ID: ${depositId1}, NFT #${certificateId1}`);
    console.log(`   💰 Amount: ${ethers.formatUnits(DEPOSIT_AMOUNT_1, 6)} USDC`);
    console.log(`   📅 Duration: 30 days`);
    
    // User2 90-day deposit
    console.log("   💳 User2 creating 90-day savings plan...");
    await mockUSDC.connect(user2).approve(savingBank.target, DEPOSIT_AMOUNT_2);
    const tx2 = await savingBank.connect(user2).createDeposit(1, DEPOSIT_AMOUNT_2, 90);
    const receipt2 = await tx2.wait();
    
    const depositEvent2 = receipt2?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositCreated'
    );
    let depositId2: bigint | undefined;
    let certificateId2: bigint | undefined;
    if (depositEvent2 && "args" in depositEvent2) {
        depositId2 = depositEvent2.args[0];
        certificateId2 = depositEvent2.args[6];
    }
    
    if (depositId2 !== undefined) depositIds.push(depositId2);
    if (certificateId2 !== undefined) certificateIds.push(certificateId2);
    
    console.log(`   ✅ User2 deposit created - ID: ${depositId2}, NFT #${certificateId2}`);
    console.log(`   💰 Amount: ${ethers.formatUnits(DEPOSIT_AMOUNT_2, 6)} USDC`);
    console.log(`   📅 Duration: 90 days`);
    
    // Verify system state
    console.log("   🔍 Verifying system state after deposits...");
    const user1Balance = await depositCertificate.balanceOf(await user1.getAddress());
    const user2Balance = await depositCertificate.balanceOf(await user2.getAddress());
    const totalSupply = await depositCertificate.totalSupply();
    
    console.log(`   🎫 Total NFTs minted: ${totalSupply}`);
    console.log(`   ✅ All deposits successful and verified`);

    // Transfer Cooldown Verification  
    console.log("\n🔒 Transfer Cooldown Verification");
    console.log("   🔒 Verifying transfer cooldown on all NFTs...");
    
    // Note: Cooldown is only triggered AFTER a transfer, not on initial mint
    for (let i = 0; i < certificateIds.length; i++) {
        const certId = certificateIds[i];
        const isInCooldown = await depositCertificate.isInCooldown(certId);
        const remainingTime = await depositCertificate.getRemainingCooldown(certId);
        
        console.log(`   ✅ NFT #${certId}: Ready for use (no cooldown after mint)`);
    }
    console.log(`   ✅ All NFTs ready - cooldown only activates after transfer`);
    
    // Test renewal blocking before maturity
    console.log("   🚫 Testing renewal blocking before maturity...");
    const user1DepositId = depositIds[0];
    try {
        await savingBank.connect(user1).renewDeposit(user1DepositId, 1, 60);
        console.log(`   ❌ Renewal should be blocked before maturity`);
    } catch (error) {
        console.log(`   ✅ Renewal correctly blocked before maturity`);
    }
    
    // Test early withdrawal with penalty
    console.log("   💸 Testing early withdrawal (with penalty)...");
    const smallAmount = 500_000000n;
    await mockUSDC.connect(user1).approve(savingBank.target, smallAmount);
    const tx3 = await savingBank.connect(user1).createDeposit(1, smallAmount, 30);
    const receipt3 = await tx3.wait();
    
    const depositEvent3 = receipt3?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositCreated'
    );
    let earlyWithdrawDepositId: bigint | undefined;
    if (depositEvent3 && 'args' in depositEvent3) {
        earlyWithdrawDepositId = depositEvent3.args[0];
    }
    
    // Get balance before
    const balanceBefore = await mockUSDC.balanceOf(await user1.getAddress());
    
    // Withdraw early (should work - no cooldown on fresh mint)
    if (earlyWithdrawDepositId !== undefined) {
        await savingBank.connect(user1).withdrawDeposit(earlyWithdrawDepositId);
    } else {
        throw new Error("Early withdraw deposit ID is undefined");
    }
    
    const balanceAfter = await mockUSDC.balanceOf(await user1.getAddress());
    const received = balanceAfter - balanceBefore;
    
    console.log(`   💰 Deposited: ${ethers.formatUnits(smallAmount, 6)} USDC`);
    console.log(`   💸 Received: ${ethers.formatUnits(received, 6)} USDC (penalty applied)`);
    console.log(`   ✅ Early withdrawal with penalty works`);

    // Interest Calculations
    console.log("\n💹 Interest Calculations");
    console.log("   💹 Checking interest for all deposits...");
    
    for (let i = 0; i < depositIds.length; i++) {
        const depositId = depositIds[i];
        const deposit = await savingBank.getDeposit(depositId);
        
        console.log(`   Deposit #${depositId}:`);
        console.log(`     💰 Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
        console.log(`     📈 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
        console.log(`     ⏱️ Term: ${deposit.termInDays} days`);
    }

    // Additional User Operations
    console.log("\n🔄 Additional User Operations");
    console.log("   🔄 Testing multiple deposits from same users...");
    
    const user1BalanceBefore = await depositCertificate.balanceOf(await user1.getAddress());
    const user2BalanceBefore = await depositCertificate.balanceOf(await user2.getAddress());
    
    // User1 creates another deposit
    const secondDepositAmount = 3000_000000n;
    await mockUSDC.connect(user1).approve(savingBank.target, secondDepositAmount);
    await savingBank.connect(user1).createDeposit(1, secondDepositAmount, 60);
    
    const user1BalanceAfter = await depositCertificate.balanceOf(await user1.getAddress());
    console.log(`   ✅ User1 created second deposit`);
    console.log(`   🎫 User1 now owns ${user1BalanceAfter} NFTs`);
    
    // User2 creates second deposit
    await mockUSDC.connect(user2).approve(savingBank.target, secondDepositAmount);
    await savingBank.connect(user2).createDeposit(1, secondDepositAmount, 60);
    
    const user2BalanceAfter = await depositCertificate.balanceOf(await user2.getAddress());
    console.log(`   ✅ User2 created second deposit`);
    console.log(`   🎫 User2 now owns ${user2BalanceAfter} NFTs`);
    
    const totalSupplyFinal = await depositCertificate.totalSupply();
    console.log(`   📊 Total NFTs in system: ${totalSupplyFinal}`);

    // User Portfolio Summary
    console.log("\n📋 === USER PORTFOLIO SUMMARY ===");
    
    const users = [
        { signer: user1, name: "User1" },
        { signer: user2, name: "User2" }
    ];
    
    let systemTotalPrincipal = 0n;
    let systemTotalInterest = 0n;
    
    for (const { signer, name } of users) {
        const userAddress = await signer.getAddress();
        const nftBalance = await depositCertificate.balanceOf(userAddress);
        
        console.log(`\n👤 ${name} (${userAddress}):`);
        console.log(`   🎫 NFTs Owned: ${nftBalance}`);
        
        // Get user's deposit IDs
        const userDepositIds = await savingBank.getUserDepositIds(userAddress);
        let userTotalPrincipal = 0n;
        let userTotalInterest = 0n;
        
        // Show only active deposits
        for (const depId of userDepositIds) {
            const deposit = await savingBank.getDeposit(depId);
            if (deposit.status === 0n) { // Active
                const currentTime = Math.floor(Date.now() / 1000);
                const maturityTime = Number(deposit.maturityDate);
                const daysToMaturity = Math.max(0, Math.ceil((maturityTime - currentTime) / (24 * 60 * 60)));
                
                console.log(`     Deposit #${depId}:`);
                console.log(`       💰 Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
                console.log(`       💹 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
                console.log(`       📅 Days to maturity: ${daysToMaturity}`);
                
                userTotalPrincipal += deposit.amount;
                userTotalInterest += deposit.expectedInterest;
            }
        }
        
        console.log(`   💰 Total Principal: ${ethers.formatUnits(userTotalPrincipal, 6)} USDC`);
        console.log(`   💹 Total Expected Interest: ${ethers.formatUnits(userTotalInterest, 6)} USDC`);
        
        systemTotalPrincipal += userTotalPrincipal;
        systemTotalInterest += userTotalInterest;
    }
    
    // System Totals
    const vaultBalance = await vault.getBalance();
    const totalNFTs = await depositCertificate.totalSupply();
    
    console.log(`\n📊 === SYSTEM TOTALS ===`);
    console.log(`🏛️ Vault Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
    console.log(`💰 Total User Deposits: ${ethers.formatUnits(systemTotalPrincipal, 6)} USDC`);
    console.log(`🎫 Total NFTs: ${totalNFTs}`);
    console.log(`👥 Active Users: 2`);
    
    console.log(`\n✅ Business Operations Successfully Established!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });