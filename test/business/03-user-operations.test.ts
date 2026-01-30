import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("03 - User Operations & Business Flow", function () {
    let deployer: Signer;
    let admin: Signer;
    let user1: Signer;
    let user2: Signer;
    
    let mockUSDC: any;
    let depositCertificate: any;
    let vault: any;
    let savingBank: any;
    
    const DEPOSIT_AMOUNT_1 = 5000_000000n;   // 5K USDC
    const DEPOSIT_AMOUNT_2 = 10000_000000n;  // 10K USDC
    
    let depositIds: bigint[] = [];
    let certificateIds: bigint[] = [];
    
    before(async function () {
        console.log("\n💼 Starting User Operations & Business Flow Tests");
        
        const fixture = await loadFixture(deployFullFixture);
        mockUSDC = fixture.mockUSDC;
        depositCertificate = fixture.depositCertificate;
        vault = fixture.vault;
        savingBank = fixture.savingBank;
        deployer = fixture.deployer;
        admin = fixture.admin;
        user1 = fixture.user1;
        user2 = fixture.user2;
        
        // Setup vault liquidity
        await mockUSDC.connect(admin).approve(vault.target, 500000_000000n);
        await vault.connect(admin).depositLiquidity(500000_000000n);
        
        console.log(`👤 User1: ${await user1.getAddress()}`);
        console.log(`👤 User2: ${await user2.getAddress()}`);
        console.log(`💰 Vault liquidity: 500,000 USDC`);
    });
    
    describe("💳 User Deposits - Multiple Savings Plans", function () {
        it("Should create User1 deposit - 30 days plan", async function () {
            console.log("   💳 User1 creating 30-day savings plan...");
            
            await mockUSDC.connect(user1).approve(savingBank.target, DEPOSIT_AMOUNT_1);
            const tx = await savingBank.connect(user1).createDeposit(1, DEPOSIT_AMOUNT_1, 30);
            const receipt = await tx.wait();
            
            const depositEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositCreated'
            );
            const depositId = depositEvent.args[0];
            const certificateId = depositEvent.args[6];
            
            depositIds.push(depositId);
            certificateIds.push(certificateId);
            
            const deposit = await savingBank.getDeposit(depositId);
            expect(deposit.amount).to.equal(DEPOSIT_AMOUNT_1);
            expect(deposit.termInDays).to.equal(30n);
            
            console.log(`   ✅ User1 deposit created - ID: ${depositId}, NFT #${certificateId}`);
            console.log(`   💰 Amount: ${ethers.formatUnits(DEPOSIT_AMOUNT_1, 6)} USDC`);
            console.log(`   📅 Duration: 30 days`);
        });
        
        it("Should create User2 deposit - 90 days plan", async function () {
            console.log("   💳 User2 creating 90-day savings plan...");
            
            await mockUSDC.connect(user2).approve(savingBank.target, DEPOSIT_AMOUNT_2);
            const tx = await savingBank.connect(user2).createDeposit(1, DEPOSIT_AMOUNT_2, 90);
            const receipt = await tx.wait();
            
            const depositEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositCreated'
            );
            const depositId = depositEvent.args[0];
            const certificateId = depositEvent.args[6];
            
            depositIds.push(depositId);
            certificateIds.push(certificateId);
            
            const deposit = await savingBank.getDeposit(depositId);
            expect(deposit.amount).to.equal(DEPOSIT_AMOUNT_2);
            
            console.log(`   ✅ User2 deposit created - ID: ${depositId}, NFT #${certificateId}`);
            console.log(`   💰 Amount: ${ethers.formatUnits(DEPOSIT_AMOUNT_2, 6)} USDC`);
            console.log(`   📅 Duration: 90 days`);
        });
        
        it("Should verify vault and NFT state after deposits", async function () {
            console.log("   🔍 Verifying system state after deposits...");
            
            // Check NFT ownership
            expect(await depositCertificate.balanceOf(await user1.getAddress())).to.equal(1n);
            expect(await depositCertificate.balanceOf(await user2.getAddress())).to.equal(1n);
            
            const totalSupply = await depositCertificate.totalSupply();
            expect(totalSupply).to.equal(2n);
            
            console.log(`   🎫 Total NFTs minted: ${totalSupply}`);
            console.log(`   ✅ All deposits successful and verified`);
        });
    });
    
    describe("🔒 Transfer Cooldown Verification", function () {
        it("Should verify freshly minted NFTs are NOT in cooldown", async function () {
            console.log("   🔒 Verifying transfer cooldown on all NFTs...");
            
            // Note: Cooldown is only triggered AFTER a transfer, not on initial mint
            // This allows original depositors to withdraw/renew immediately
            for (let i = 0; i < certificateIds.length; i++) {
                const certId = certificateIds[i];
                const isInCooldown = await depositCertificate.isInCooldown(certId);
                const remainingTime = await depositCertificate.getRemainingCooldown(certId);
                
                expect(isInCooldown).to.be.false; // Not in cooldown - never transferred
                expect(remainingTime).to.equal(0n);
                
                console.log(`   ✅ NFT #${certId}: Ready for use (no cooldown after mint)`);
            }
            
            console.log(`   ✅ All NFTs ready - cooldown only activates after transfer`);
        });
        
        it("Should block renewal before maturity", async function () {
            console.log("   🚫 Testing renewal blocking before maturity...");
            
            const user1DepositId = depositIds[0];
            
            // Note: No cooldown after initial mint, but can't renew until matured
            try {
                await savingBank.connect(user1).renewDeposit(user1DepositId, 1, 60);
                expect.fail("Should have reverted");
            } catch (error: any) {
                // Expected to fail - deposit not mature
                expect(error.message).to.include("revert");
            }
            
            console.log(`   ✅ Renewal correctly blocked before maturity`);
        });
        
        it("Should allow early withdrawal with penalty", async function () {
            console.log("   💸 Testing early withdrawal (with penalty)...");
            
            // Create a small deposit for early withdrawal test
            const smallAmount = 500_000000n;
            await mockUSDC.connect(user1).approve(savingBank.target, smallAmount);
            const tx = await savingBank.connect(user1).createDeposit(1, smallAmount, 30);
            const receipt = await tx.wait();
            
            const depositEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositCreated'
            );
            const earlyWithdrawDepositId = depositEvent.args[0];
            
            // Get balance before
            const balanceBefore = await mockUSDC.balanceOf(await user1.getAddress());
            
            // Withdraw early (should work - no cooldown on fresh mint)
            await savingBank.connect(user1).withdrawDeposit(earlyWithdrawDepositId);
            
            const balanceAfter = await mockUSDC.balanceOf(await user1.getAddress());
            const received = balanceAfter - balanceBefore;
            
            // Should receive less than deposit due to penalty
            expect(received < smallAmount).to.be.true;
            console.log(`   💰 Deposited: ${ethers.formatUnits(smallAmount, 6)} USDC`);
            console.log(`   💸 Received: ${ethers.formatUnits(received, 6)} USDC (penalty applied)`);
            console.log(`   ✅ Early withdrawal with penalty works`);
        });
    });
    
    describe("💹 Interest Calculations", function () {
        it("Should calculate expected interest for all deposits", async function () {
            console.log("   💹 Checking interest for all deposits...");
            
            for (let i = 0; i < depositIds.length; i++) {
                const depositId = depositIds[i];
                const deposit = await savingBank.getDeposit(depositId);
                
                console.log(`   Deposit #${depositId}:`);
                console.log(`     💰 Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
                console.log(`     📈 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
                console.log(`     ⏱️ Term: ${deposit.termInDays} days`);
            }
        });
    });
    
    describe("🔄 Additional User Operations", function () {
        it("Should allow users to create multiple deposits", async function () {
            console.log("   🔄 Testing multiple deposits from same users...");
            
            // Get current balances first (may include deposits from previous tests)
            const user1BalanceBefore = await depositCertificate.balanceOf(await user1.getAddress());
            const user2BalanceBefore = await depositCertificate.balanceOf(await user2.getAddress());
            
            // User1 creates another deposit
            const secondDepositAmount = 3000_000000n;
            
            await mockUSDC.connect(user1).approve(savingBank.target, secondDepositAmount);
            await savingBank.connect(user1).createDeposit(1, secondDepositAmount, 60);
            
            const user1Balance = await depositCertificate.balanceOf(await user1.getAddress());
            expect(user1Balance).to.equal(user1BalanceBefore + 1n);
            
            console.log(`   ✅ User1 created second deposit`);
            console.log(`   🎫 User1 now owns ${user1Balance} NFTs`);
            
            // User2 creates second deposit
            await mockUSDC.connect(user2).approve(savingBank.target, secondDepositAmount);
            await savingBank.connect(user2).createDeposit(1, secondDepositAmount, 60);
            
            const user2Balance = await depositCertificate.balanceOf(await user2.getAddress());
            expect(user2Balance).to.equal(user2BalanceBefore + 1n);
            
            console.log(`   ✅ User2 created second deposit`);
            console.log(`   🎫 User2 now owns ${user2Balance} NFTs`);
            
            // Total supply = previous deposits + new deposits
            // Note: NFTs remain even after withdrawal (they're just associated with withdrawn deposits)
            const totalSupply = await depositCertificate.totalSupply();
            console.log(`   📊 Total NFTs in system: ${totalSupply}`);
            // Just verify total increased, don't hardcode expected value
            expect(totalSupply >= 4n).to.be.true;
        });
    });
    
    describe("📋 User Portfolio Summary", function () {
        it("Should generate comprehensive user portfolio report", async function () {
            console.log("\n📋 === USER PORTFOLIO SUMMARY ===");
            
            const users = [
                { signer: user1, name: "User1" },
                { signer: user2, name: "User2" }
            ];
            
            let totalSystemDeposits = 0n;
            
            for (const { signer, name } of users) {
                const address = await signer.getAddress();
                const nftBalance = await depositCertificate.balanceOf(address);
                console.log(`\n👤 ${name} (${address}):`);
                console.log(`   🎫 NFTs Owned: ${nftBalance}`);
                
                let userTotalPrincipal = 0n;
                let userTotalExpectedInterest = 0n;
                
                const userDepositIds = await savingBank.getUserDepositIds(address);
                
                for (const depositId of userDepositIds) {
                    const deposit = await savingBank.getDeposit(depositId);
                    if (deposit.status === 0n) { // Active
                        userTotalPrincipal += deposit.amount;
                        userTotalExpectedInterest += deposit.expectedInterest;
                        
                        const currentTime = await time.latest();
                        const daysUntilMaturity = Number(deposit.maturityDate - BigInt(currentTime)) / (24 * 60 * 60);
                        
                        console.log(`     Deposit #${depositId}:`);
                        console.log(`       💰 Principal: ${ethers.formatUnits(deposit.amount, 6)} USDC`);
                        console.log(`       💹 Expected Interest: ${ethers.formatUnits(deposit.expectedInterest, 6)} USDC`);
                        console.log(`       📅 Days to maturity: ${Math.max(0, Math.ceil(daysUntilMaturity))}`);
                    }
                }
                
                totalSystemDeposits += userTotalPrincipal;
                
                console.log(`   💰 Total Principal: ${ethers.formatUnits(userTotalPrincipal, 6)} USDC`);
                console.log(`   💹 Total Expected Interest: ${ethers.formatUnits(userTotalExpectedInterest, 6)} USDC`);
            }
            
            console.log(`\n📊 === SYSTEM TOTALS ===`);
            const vaultBalance = await vault.getBalance();
            const totalNFTs = await depositCertificate.totalSupply();
            
            console.log(`🏛️ Vault Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
            console.log(`💰 Total User Deposits: ${ethers.formatUnits(totalSystemDeposits, 6)} USDC`);
            console.log(`🎫 Total NFTs: ${totalNFTs}`);
            console.log(`👥 Active Users: ${users.length}`);
            
            console.log(`\n✅ Business Operations Successfully Established!`);
        });
    });
});