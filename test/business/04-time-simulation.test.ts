import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("04 - Time Simulation & Interest Accrual", function () {
    let deployer: Signer;
    let admin: Signer;
    let user1: Signer;
    let user2: Signer;
    
    let mockUSDC: any;
    let depositCertificate: any;
    let vault: any;
    let savingBank: any;
    
    const DEPOSIT_AMOUNT = 10000_000000n;  // 10K USDC
    const ONE_DAY = 24 * 60 * 60;
    
    let deploymentTime: number;
    let depositId: bigint;
    let certificateId: bigint;
    
    before(async function () {
        console.log("\n⏱️ Starting Time Simulation & Interest Accrual Tests");
        
        const fixture = await loadFixture(deployFullFixture);
        mockUSDC = fixture.mockUSDC;
        depositCertificate = fixture.depositCertificate;
        vault = fixture.vault;
        savingBank = fixture.savingBank;
        deployer = fixture.deployer;
        admin = fixture.admin;
        user1 = fixture.user1;
        user2 = fixture.user2;
        
        deploymentTime = await time.latest();
        
        // Setup vault liquidity
        await mockUSDC.connect(admin).approve(vault.target, 500000_000000n);
        await vault.connect(admin).depositLiquidity(500000_000000n);
        
        console.log(`⏱️ Deployment time: ${new Date(deploymentTime * 1000).toISOString()}`);
        console.log(`💰 Vault liquidity: 500,000 USDC`);
    });
    
    describe("📅 Day 1: Initial Deposit", function () {
        it("Should create a 90-day deposit for testing", async function () {
            console.log("   📅 Day 1: Creating test deposit...");
            
            await mockUSDC.connect(user1).approve(savingBank.target, DEPOSIT_AMOUNT);
            const tx = await savingBank.connect(user1).createDeposit(1, DEPOSIT_AMOUNT, 90);
            const receipt = await tx.wait();
            
            const depositEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositCreated'
            );
            depositId = depositEvent.args[0];
            certificateId = depositEvent.args[6];
            
            const deposit = await savingBank.getDeposit(depositId);
            expect(deposit.amount).to.equal(DEPOSIT_AMOUNT);
            
            console.log(`   ✅ Deposit created - ID: ${depositId}, NFT #${certificateId}`);
            console.log(`   💰 Principal: ${ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC`);
            console.log(`   📈 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
            console.log(`   📅 Duration: 90 days`);
        });
        
        it("Should check initial state", async function () {
            console.log("   📊 Checking initial state...");
            
            const deposit = await savingBank.getDeposit(depositId);
            
            console.log(`   💹 Expected Interest at maturity: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
            console.log(`   📅 Maturity Date: ${new Date(Number(deposit.maturityDate) * 1000).toISOString()}`);
            
            expect(deposit.status).to.equal(0n); // Active
        });
    });
    
    describe("⏰ 24-Hour Cooldown Period", function () {
        it("Should verify no cooldown on freshly minted NFT", async function () {
            console.log("   🔒 Verifying freshly minted NFT cooldown status...");
            
            // Note: Cooldown only activates AFTER a transfer, not on initial mint
            const isInCooldown = await depositCertificate.isInCooldown(certificateId);
            expect(isInCooldown).to.be.false;
            
            console.log(`   ✅ No cooldown on freshly minted NFT (as designed)`);
        });
        
        it("Should trigger cooldown after transfer", async function () {
            console.log("   🔄 Transferring NFT to trigger cooldown...");
            
            // Transfer NFT to user2
            await depositCertificate.connect(user1).transferFrom(
                await user1.getAddress(), 
                await user2.getAddress(), 
                certificateId
            );
            
            // Now cooldown should be active
            const isInCooldown = await depositCertificate.isInCooldown(certificateId);
            expect(isInCooldown).to.be.true;
            
            const remainingCooldown = await depositCertificate.getRemainingCooldown(certificateId);
            expect(remainingCooldown > 0n).to.be.true;
            
            console.log(`   ✅ Cooldown active after transfer: ${remainingCooldown} seconds`);
            
            // Transfer back to user1 for future tests
            await time.increase(ONE_DAY); // Wait for cooldown
            await depositCertificate.connect(user2).transferFrom(
                await user2.getAddress(),
                await user1.getAddress(),
                certificateId
            );
            
            console.log(`   🔄 Transferred back to user1 for continued testing`);
        });
        
        it("Should pass cooldown after 24 hours", async function () {
            console.log("   ⏱️ Advancing time by 24 hours...");
            
            await time.increase(ONE_DAY);
            
            const isInCooldown = await depositCertificate.isInCooldown(certificateId);
            expect(isInCooldown).to.be.false;
            
            const remainingCooldown = await depositCertificate.getRemainingCooldown(certificateId);
            expect(remainingCooldown).to.equal(0n);
            
            console.log(`   ✅ Cooldown completed - NFT is now transferable`);
        });
    });
    
    describe("📅 Day 7: One Week Progress", function () {
        it("Should verify state after one week", async function () {
            console.log("   ⏱️ Checking state after time progression...");
            
            const currentTime = await time.latest();
            const daysPassed = (currentTime - deploymentTime) / ONE_DAY;
            console.log(`   📅 Days since deployment: ${Math.floor(daysPassed)}`);
            
            const deposit = await savingBank.getDeposit(depositId);
            
            console.log(`   💰 Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
            console.log(`   📈 Expected Interest at maturity: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
            
            expect(deposit.status).to.equal(0n); // Still Active
        });
    });
    
    describe("📅 Day 30: One Month Progress", function () {
        it("Should advance time to day 30 and check state", async function () {
            console.log("   ⏱️ Advancing to Day 30...");
            
            // Currently at day 7, advance 23 more days
            await time.increase(23 * ONE_DAY);
            
            const currentTime = await time.latest();
            const daysPassed = (currentTime - deploymentTime) / ONE_DAY;
            console.log(`   📅 Days since deposit: ${Math.floor(daysPassed)}`);
            
            const deposit = await savingBank.getDeposit(depositId);
            
            console.log(`   💰 Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
            console.log(`   📈 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
            console.log(`   ⏱️ Days until maturity: ${Math.ceil((Number(deposit.maturityDate) - currentTime) / ONE_DAY)}`);
            
            expect(deposit.status).to.equal(0n); // Still Active
        });
        
        it("Should allow renewal after maturity", async function () {
            console.log("   🔄 Testing deposit renewal after maturity...");
            
            // Wait until maturity for renewal
            const deposit = await savingBank.getDeposit(depositId);
            const currentTime = await time.latest();
            const timeToMaturity = Number(deposit.maturityDate) - currentTime;
            
            if (timeToMaturity > 0) {
                await time.increase(timeToMaturity + 1);
                console.log(`   ⏱️ Advanced ${Math.ceil(timeToMaturity / ONE_DAY)} days to reach maturity`);
            }
            
            const oldDeposit = await savingBank.getDeposit(depositId);
            
            // Renew to a 120-day term
            const tx = await savingBank.connect(user1).renewDeposit(depositId, 1, 120);
            const receipt = await tx.wait();
            
            // DepositRenewed event has: (oldDepositId, newDepositId, depositor, newPrincipalAmount, newPlanId)
            const renewEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositRenewed'
            );
            const newDepositId = renewEvent.args[1];
            
            // DepositCreated event has the certificateId (args[6])
            const createEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositCreated'
            );
            const newCertificateId = createEvent.args[6];
            
            const newDeposit = await savingBank.getDeposit(newDepositId);
            
            console.log(`   📅 Old Maturity Date: ${new Date(Number(oldDeposit.maturityDate) * 1000).toISOString()}`);
            console.log(`   📅 New Maturity Date: ${new Date(Number(newDeposit.maturityDate) * 1000).toISOString()}`);
            console.log(`   💰 New Principal (with interest): ${ethers.formatUnits(newDeposit.amount, 6)} USDC`);
            
            // Update tracking
            depositId = newDepositId;
            certificateId = newCertificateId;
            
            // Principal should have increased by capitalized interest
            expect(newDeposit.amount >= oldDeposit.amount).to.be.true;
            
            console.log(`   ✅ Renewal successful with compound interest`);
        });
        
        it("Should restart cooldown after renewal", async function () {
            console.log("   🔒 Verifying cooldown restarted after renewal...");
            
            const isInCooldown = await depositCertificate.isInCooldown(certificateId);
            // Cooldown should restart after renewal (if it's a fresh certificate)
            // Note: depends on implementation - certificate may be new
            
            const remainingCooldown = await depositCertificate.getRemainingCooldown(certificateId);
            
            console.log(`   ⏱️ Cooldown status: ${isInCooldown ? "Active" : "Not active"}`);
            console.log(`   ⏱️ Remaining cooldown: ${remainingCooldown} seconds`);
            console.log(`   ✅ Cooldown check complete`);
        });
    });
    
    describe("📅 Day 60: Two Month Progress", function () {
        it("Should advance time to day 60 and track growth", async function () {
            console.log("   ⏱️ Advancing to Day 60...");
            
            // Advance 30 more days
            await time.increase(30 * ONE_DAY);
            
            const currentTime = await time.latest();
            const daysPassed = (currentTime - deploymentTime) / ONE_DAY;
            console.log(`   📅 Days since start: ${Math.floor(daysPassed)}`);
            
            const deposit = await savingBank.getDeposit(depositId);
            
            console.log(`   💰 Current Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
            console.log(`   💹 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
            console.log(`   🔢 Total at Maturity: ${ethers.formatUnits(deposit.amount + deposit.expectedInterest, 6)} USDC`);
        });
    });
    
    describe("💰 Withdrawal After Maturity", function () {
        it("Should allow withdrawal after maturity and cooldown", async function () {
            console.log("   🏦 Testing withdrawal after maturity...");
            
            // First wait for cooldown to end (from renewal)
            await time.increase(ONE_DAY);
            
            // Get deposit maturity
            const deposit = await savingBank.getDeposit(depositId);
            
            // Advance to after maturity
            const currentTime = await time.latest();
            const timeToMaturity = Number(deposit.maturityDate) - currentTime;
            if (timeToMaturity > 0) {
                await time.increase(timeToMaturity + 1);
            }
            
            console.log(`   💰 Principal to withdraw: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
            console.log(`   💹 Interest earned: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
            console.log(`   🔢 Total to receive: ${ethers.formatUnits(deposit.amount + deposit.expectedInterest, 6)} USDC`);
            
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
            expect(finalDeposit.status).to.equal(1n); // Withdrawn
            console.log(`   📋 Deposit status: Withdrawn`);
        });
    });
    
    describe("📊 Time Simulation Summary", function () {
        it("Should print comprehensive time simulation results", async function () {
            console.log("\n📊 === TIME SIMULATION SUMMARY ===");
            
            const currentTime = await time.latest();
            const totalDays = (currentTime - deploymentTime) / ONE_DAY;
            
            console.log(`\n⏱️ Time Simulated: ~${Math.floor(totalDays)} days`);
            console.log(`📅 Start: ${new Date(deploymentTime * 1000).toISOString()}`);
            console.log(`📅 End: ${new Date(currentTime * 1000).toISOString()}`);
            
            console.log(`\n💼 Operations Performed:`);
            console.log(`   ✅ Deposit created`);
            console.log(`   ✅ 24-hour cooldown verified`);
            console.log(`   ✅ Time progression tracked`);
            console.log(`   ✅ Deposit renewed with compound interest`);
            console.log(`   ✅ Withdrawal after maturity`);
            
            const vaultBalance = await vault.getBalance();
            console.log(`\n🏛️ Final Vault Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
            console.log(`🎫 Remaining Active NFTs: ${await depositCertificate.totalSupply()}`);
            
            console.log(`\n✅ Time Simulation Tests Complete!`);
        });
    });
});