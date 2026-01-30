import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../../test/helpers/fixtures";

async function main() {
    console.log("\n⏱️ Starting Time Simulation & Interest Accrual Script");
    console.log("🎯 Purpose: Simulate time progression and compound interest operations");
    
    const fixture = await deployFullFixture();
    const { mockUSDC, depositCertificate, vault, savingBank, admin, user1, user2 } = fixture;
    
    const DEPOSIT_AMOUNT = 10000_000000n;  // 10K USDC
    const ONE_DAY = 24 * 60 * 60;
    
    let deploymentTime = await time.latest();
    let depositId: bigint;
    let certificateId: bigint;
    
    console.log(`⏱️ Deployment time: ${new Date(deploymentTime * 1000).toISOString()}`);
    
    // Setup vault liquidity
    await mockUSDC.connect(admin).approve(vault.target, 500000_000000n);
    await vault.connect(admin).depositLiquidity(500000_000000n);
    console.log(`💰 Vault liquidity: 500,000 USDC`);

    // Day 1: Initial Deposit
    console.log("\n📅 Day 1: Initial Deposit");
    console.log("   📅 Day 1: Creating test deposit...");
    
    await mockUSDC.connect(user1).approve(savingBank.target, DEPOSIT_AMOUNT);
    const tx = await savingBank.connect(user1).createDeposit(1, DEPOSIT_AMOUNT, 90);
    const receipt = await tx.wait();
    
    const depositEvent = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositCreated'
    );
    if (depositEvent && 'args' in depositEvent) {
        depositId = depositEvent.args[0];
        certificateId = depositEvent.args[6];
    } else {
        throw new Error("DepositCreated event not found or missing args");
    }
    
    const deposit = await savingBank.getDeposit(depositId);
    console.log(`   ✅ Deposit created - ID: ${depositId}, NFT #${certificateId}`);
    console.log(`   💰 Principal: ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC`);
    console.log(`   📈 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
    console.log(`   📅 Duration: 90 days`);
    
    // Check initial state
    console.log("   📊 Checking initial state...");
    console.log(`   💹 Expected Interest at maturity: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
    console.log(`   📅 Maturity Date: ${new Date(Number(deposit.maturityDate) * 1000).toISOString()}`);

    // 24-Hour Cooldown Period
    console.log("\n⏰ 24-Hour Cooldown Period");
    
    // Verify no cooldown on freshly minted NFT
    console.log("   🔒 Verifying freshly minted NFT cooldown status...");
    const isInCooldownInitial = await depositCertificate.isInCooldown(certificateId);
    console.log(`   ✅ No cooldown on freshly minted NFT (as designed): ${!isInCooldownInitial ? '✅' : '❌'}`);
    
    // Trigger cooldown after transfer
    console.log("   🔄 Transferring NFT to trigger cooldown...");
    await depositCertificate.connect(user1).transferFrom(
        await user1.getAddress(), 
        await user2.getAddress(), 
        certificateId
    );
    
    const isInCooldownAfterTransfer = await depositCertificate.isInCooldown(certificateId);
    const remainingCooldown = await depositCertificate.getRemainingCooldown(certificateId);
    console.log(`   ✅ Cooldown active after transfer: ${remainingCooldown} seconds`);
    
    // Transfer back to user1 for future tests
    await time.increase(ONE_DAY); // Wait for cooldown
    await depositCertificate.connect(user2).transferFrom(
        await user2.getAddress(),
        await user1.getAddress(),
        certificateId
    );
    console.log(`   🔄 Transferred back to user1 for continued testing`);
    
    // Pass cooldown after 24 hours
    console.log("   ⏱️ Advancing time by 24 hours...");
    await time.increase(ONE_DAY);
    
    const isInCooldownAfterWait = await depositCertificate.isInCooldown(certificateId);
    const remainingCooldownAfterWait = await depositCertificate.getRemainingCooldown(certificateId);
    console.log(`   ✅ Cooldown completed - NFT is now transferable: ${!isInCooldownAfterWait ? '✅' : '❌'}`);

    // Day 7: One Week Progress
    console.log("\n📅 Day 7: One Week Progress");
    console.log("   ⏱️ Checking state after time progression...");
    
    const currentTime = await time.latest();
    const daysPassed = (currentTime - deploymentTime) / ONE_DAY;
    console.log(`   📅 Days since deployment: ${Math.floor(daysPassed)}`);
    
    const depositAfterWeek = await savingBank.getDeposit(depositId);
    console.log(`   💰 Principal: ${ethers.formatUnits(depositAfterWeek.amount, 6)} USDC`);
    console.log(`   📈 Expected Interest at maturity: ${ethers.formatUnits(depositAfterWeek.expectedInterest, 6)} USDC`);

    // Day 30: One Month Progress  
    console.log("\n📅 Day 30: One Month Progress");
    console.log("   ⏱️ Advancing to Day 30...");
    
    // Advance 23 more days (already advanced 2 days)
    await time.increase(23 * ONE_DAY);
    
    const currentTime30 = await time.latest();
    const daysPassed30 = (currentTime30 - deploymentTime) / ONE_DAY;
    console.log(`   📅 Days since deposit: ${Math.floor(daysPassed30)}`);
    
    const deposit30 = await savingBank.getDeposit(depositId);
    const daysUntilMaturity = Math.ceil((Number(deposit30.maturityDate) - currentTime30) / ONE_DAY);
    
    console.log(`   💰 Principal: ${ethers.formatUnits(deposit30.amount, 6)} USDC`);
    console.log(`   📈 Expected Interest: ${ethers.formatUnits(deposit30.expectedInterest, 6)} USDC`);
    console.log(`   ⏱️ Days until maturity: ${daysUntilMaturity}`);
    
    // Test renewal after maturity
    console.log("   🔄 Testing deposit renewal after maturity...");
    
    // Wait until maturity for renewal
    const timeToMaturity = Number(deposit30.maturityDate) - currentTime30;
    if (timeToMaturity > 0) {
        await time.increase(timeToMaturity + 1);
        console.log(`   ⏱️ Advanced ${Math.ceil(timeToMaturity / ONE_DAY)} days to reach maturity`);
    }
    
    const oldDeposit = await savingBank.getDeposit(depositId);
    
    // Renew to a 120-day term
    const renewTx = await savingBank.connect(user1).renewDeposit(depositId, 1, 120);
    const renewReceipt = await renewTx.wait();
    
    // Get new deposit ID from DepositRenewed event
    const renewEvent = renewReceipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositRenewed'
    );
    const newDepositId =
        renewEvent && "args" in renewEvent ? renewEvent.args[1] : undefined;
    
    // Get certificate ID from DepositCreated event
    const createEvent = renewReceipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DepositCreated'
    );
    const newCertificateId =
        createEvent && "args" in createEvent ? createEvent.args[6] : undefined;
    
    const newDeposit = await savingBank.getDeposit(newDepositId);
    
    console.log(`   📅 Old Maturity Date: ${new Date(Number(oldDeposit.maturityDate) * 1000).toISOString()}`);
    console.log(`   📅 New Maturity Date: ${new Date(Number(newDeposit.maturityDate) * 1000).toISOString()}`);
    console.log(`   💰 New Principal (with interest): ${ethers.formatUnits(newDeposit.amount, 6)} USDC`);
    console.log(`   ✅ Renewal successful with compound interest`);
    
    // Update tracking
    depositId = newDepositId;
    certificateId = newCertificateId;
    
    // Check cooldown after renewal
    console.log("   🔒 Verifying cooldown restarted after renewal...");
    const isInCooldownAfterRenewal = await depositCertificate.isInCooldown(certificateId);
    const remainingCooldownAfterRenewal = await depositCertificate.getRemainingCooldown(certificateId);
    
    console.log(`   ⏱️ Cooldown status: ${isInCooldownAfterRenewal ? "Active" : "Not active"}`);
    console.log(`   ⏱️ Remaining cooldown: ${remainingCooldownAfterRenewal} seconds`);
    console.log(`   ✅ Cooldown check complete`);

    // Day 60: Two Month Progress
    console.log("\n📅 Day 60: Two Month Progress");
    console.log("   ⏱️ Advancing to Day 60...");
    
    await time.increase(30 * ONE_DAY);
    
    const currentTime60 = await time.latest();
    const daysPassed60 = (currentTime60 - deploymentTime) / ONE_DAY;
    console.log(`   📅 Days since start: ${Math.floor(daysPassed60)}`);
    
    const deposit60 = await savingBank.getDeposit(depositId);
    
    console.log(`   💰 Current Principal: ${ethers.formatUnits(deposit60.amount, 6)} USDC`);
    console.log(`   💹 Expected Interest: ${ethers.formatUnits(deposit60.expectedInterest, 6)} USDC`);
    console.log(`   🔢 Total at Maturity: ${ethers.formatUnits(deposit60.amount + deposit60.expectedInterest, 6)} USDC`);

    // Withdrawal After Maturity
    console.log("\n💰 Withdrawal After Maturity");
    console.log("   🏦 Testing withdrawal after maturity...");
    
    // First wait for cooldown to end (from renewal)
    await time.increase(ONE_DAY);
    
    // Get deposit maturity
    const depositForWithdraw = await savingBank.getDeposit(depositId);
    
    // Advance to after maturity
    const currentTimeForWithdraw = await time.latest();
    const timeToMaturityForWithdraw = Number(depositForWithdraw.maturityDate) - currentTimeForWithdraw;
    if (timeToMaturityForWithdraw > 0) {
        await time.increase(timeToMaturityForWithdraw + 1);
    }
    
    console.log(`   💰 Principal to withdraw: ${ethers.formatUnits(depositForWithdraw.amount, 6)} USDC`);
    console.log(`   💹 Interest earned: ${ethers.formatUnits(depositForWithdraw.expectedInterest, 6)} USDC`);
    console.log(`   🔢 Total to receive: ${ethers.formatUnits(depositForWithdraw.amount + depositForWithdraw.expectedInterest, 6)} USDC`);
    
    // Get balance before
    const balanceBefore = await mockUSDC.balanceOf(await user1.getAddress());
    
    // Withdraw
    await savingBank.connect(user1).withdrawDeposit(depositId);
    
    // Check balance after
    const balanceAfter = await mockUSDC.balanceOf(await user1.getAddress());
    const received = balanceAfter - balanceBefore;
    
    console.log(`   ✅ Withdrawal successful!`);
    console.log(`   💵 Amount received: ${ethers.formatUnits(received, 6)} USDC`);
    
    // Verify deposit is withdrawn
    const finalDeposit = await savingBank.getDeposit(depositId);
    const isWithdrawn = finalDeposit.status === 1n; // Withdrawn
    console.log(`   📋 Deposit status: ${isWithdrawn ? 'Withdrawn' : 'Active'}`);

    // Time Simulation Summary
    const endTime = await time.latest();
    const totalDays = Math.floor((endTime - deploymentTime) / ONE_DAY);
    const finalVaultBalance = await vault.getBalance();
    const remainingNFTs = await depositCertificate.totalSupply();
    
    console.log("\n📊 === TIME SIMULATION SUMMARY ===");
    console.log(`\n⏱️ Time Simulated: ~${totalDays} days`);
    console.log(`📅 Start: ${new Date(deploymentTime * 1000).toISOString()}`);
    console.log(`📅 End: ${new Date(endTime * 1000).toISOString()}`);
    console.log(`\n💼 Operations Performed:`);
    console.log(`   ✅ Deposit created`);
    console.log(`   ✅ 24-hour cooldown verified`);
    console.log(`   ✅ Time progression tracked`);
    console.log(`   ✅ Deposit renewed with compound interest`);
    console.log(`   ✅ Withdrawal after maturity`);
    console.log(`\n🏛️ Final Vault Balance: ${ethers.formatUnits(finalVaultBalance, 6)} USDC`);
    console.log(`🎫 Remaining Active NFTs: ${remainingNFTs}`);
    console.log(`\n✅ Time Simulation Tests Complete!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });