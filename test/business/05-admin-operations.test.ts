import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("05 - Admin Operations & System Management", function () {
    let deployer: Signer;
    let admin: Signer;
    let pauser: Signer;
    let user1: Signer;
    let user2: Signer;
    let feeReceiver: Signer;
    
    let mockUSDC: any;
    let depositCertificate: any;
    let vault: any;
    let savingBank: any;
    
    const ONE_DAY = 24 * 60 * 60;
    
    before(async function () {
        console.log("\n🔧 Starting Admin Operations & System Management Tests");
        
        const fixture = await loadFixture(deployFullFixture);
        mockUSDC = fixture.mockUSDC;
        depositCertificate = fixture.depositCertificate;
        vault = fixture.vault;
        savingBank = fixture.savingBank;
        deployer = fixture.deployer;
        admin = fixture.admin;
        pauser = fixture.pauser;
        user1 = fixture.user1;
        user2 = fixture.user2;
        feeReceiver = fixture.feeReceiver;
        
        // Setup vault liquidity
        await mockUSDC.connect(admin).approve(vault.target, 500000_000000n);
        await vault.connect(admin).depositLiquidity(500000_000000n);
        
        console.log(`🔧 Admin: ${await admin.getAddress()}`);
        console.log(`⏸️ Pauser: ${await pauser.getAddress()}`);
        console.log(`💰 Vault liquidity: 500,000 USDC`);
    });
    
    describe("⚙️ Savings Plan Management", function () {
        it("Should verify initial savings plan exists", async function () {
            console.log("   ⚙️ Checking initial savings plan...");
            
            // Plan ID 1 should exist from fixture setup
            const plan = await savingBank.getSavingPlan(1);
            
            console.log(`   📋 Plan 1: "${plan.name}"`);
            console.log(`      Min Deposit: ${ethers.formatUnits(plan.minDepositAmount, 6)} USDC`);
            console.log(`      Term Range: ${plan.minTermInDays}-${plan.maxTermInDays} days`);
            console.log(`      APR: ${Number(plan.annualInterestRateInBasisPoints) / 100}%`);
            console.log(`      Active: ${plan.isActive}`);
            
            expect(plan.isActive).to.be.true;
        });
        
        it("Should allow admin to create new savings plan", async function () {
            console.log("   ➕ Creating new savings plan...");
            
            const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
            const hasAdminRole = await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress());
            expect(hasAdminRole).to.be.true;
            
            // Create a premium plan
            await savingBank.connect(admin).createSavingPlan({
                name: "Premium Plan",
                minDepositAmount: 10000_000000n, // 10k USDC minimum
                maxDepositAmount: 0n, // No limit
                minTermInDays: 90,
                maxTermInDays: 365,
                annualInterestRateInBasisPoints: 1000n, // 10%
                penaltyRateInBasisPoints: 200n // 2%
            });
            
            const newPlan = await savingBank.getSavingPlan(2);
            
            console.log(`   ✅ New plan created: "${newPlan.name}"`);
            console.log(`      Min Deposit: ${ethers.formatUnits(newPlan.minDepositAmount, 6)} USDC`);
            console.log(`      APR: ${Number(newPlan.annualInterestRateInBasisPoints) / 100}%`);
            
            expect(newPlan.name).to.equal("Premium Plan");
        });
        
        it("Should prevent non-admin from adding plans", async function () {
            console.log("   🚫 Testing unauthorized plan creation...");
            
            try {
                await savingBank.connect(user1).createSavingPlan({
                    name: "Unauthorized Plan",
                    minDepositAmount: 100_000000n,
                    maxDepositAmount: 0n,
                    minTermInDays: 30,
                    maxTermInDays: 365,
                    annualInterestRateInBasisPoints: 500n,
                    penaltyRateInBasisPoints: 100n
                });
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("revert");
            }
            
            console.log(`   ✅ Non-admin correctly prevented from adding plans`);
        });
    });
    
    describe("⏸️ Pause/Unpause Operations", function () {
        it("Should allow pauser to pause the system", async function () {
            console.log("   ⏸️ Pausing system...");
            
            await savingBank.connect(pauser).pause();
            
            const isPaused = await savingBank.paused();
            expect(isPaused).to.be.true;
            
            console.log(`   ✅ System paused by pauser`);
        });
        
        it("Should block deposits when paused", async function () {
            console.log("   🚫 Testing deposit blocking when paused...");
            
            const depositAmount = 1000_000000n;
            await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
            
            try {
                await savingBank.connect(user1).createDeposit(1, depositAmount, 30);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("EnforcedPause");
            }
            
            console.log(`   ✅ Deposits correctly blocked while paused`);
        });
        
        it("Should allow pauser to unpause the system", async function () {
            console.log("   ▶️ Unpausing system...");
            
            await savingBank.connect(pauser).unpause();
            
            const isPaused = await savingBank.paused();
            expect(isPaused).to.be.false;
            
            console.log(`   ✅ System unpaused by pauser`);
        });
        
        it("Should allow deposits after unpause", async function () {
            console.log("   💳 Testing deposit after unpause...");
            
            const depositAmount = 1000_000000n;
            await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
            await savingBank.connect(user1).createDeposit(1, depositAmount, 30);
            
            const nftBalance = await depositCertificate.balanceOf(await user1.getAddress());
            expect(nftBalance).to.equal(1n);
            
            console.log(`   ✅ Deposit successful after unpause`);
        });
    });
    
    describe("🏦 Vault Management", function () {
        it("Should check vault liquidity status", async function () {
            console.log("   🏦 Checking vault status...");
            
            const vaultBalance = await vault.getBalance();
            const usdcBalance = await mockUSDC.balanceOf(vault.target);
            
            console.log(`   💰 Vault USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
            console.log(`   📊 Reported Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
            
            expect(vaultBalance > 0n).to.be.true;
        });
        
        it("Should allow admin to deposit additional liquidity", async function () {
            console.log("   💰 Adding additional vault liquidity...");
            
            const additionalLiquidity = 100000_000000n;
            const balanceBefore = await vault.getBalance();
            
            await mockUSDC.connect(admin).approve(vault.target, additionalLiquidity);
            await vault.connect(admin).depositLiquidity(additionalLiquidity);
            
            const balanceAfter = await vault.getBalance();
            
            console.log(`   📊 Balance Before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);
            console.log(`   📊 Balance After: ${ethers.formatUnits(balanceAfter, 6)} USDC`);
            console.log(`   ➕ Added: ${ethers.formatUnits(additionalLiquidity, 6)} USDC`);
            
            expect(balanceAfter > balanceBefore).to.be.true;
        });
        
        it("Should allow admin to withdraw liquidity via adminWithdraw", async function () {
            console.log("   💸 Withdrawing liquidity via adminWithdraw...");
            
            // Use deployer who has DEFAULT_ADMIN_ROLE - can use adminWithdraw
            // Note: withdrawLiquidity requires WITHDRAW_ROLE (only SavingBank has it)
            const withdrawAmount = 50000_000000n;
            const balanceBefore = await vault.getBalance();
            const deployerAddress = await deployer.getAddress();
            const deployerBalanceBefore = await mockUSDC.balanceOf(deployerAddress);
            
            await vault.connect(deployer).adminWithdraw(withdrawAmount);
            
            const balanceAfter = await vault.getBalance();
            const deployerBalanceAfter = await mockUSDC.balanceOf(deployerAddress);
            
            console.log(`   📊 Vault Balance Before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);
            console.log(`   📊 Vault Balance After: ${ethers.formatUnits(balanceAfter, 6)} USDC`);
            console.log(`   💵 Received: ${ethers.formatUnits(deployerBalanceAfter - deployerBalanceBefore, 6)} USDC`);
            
            expect(balanceAfter).to.equal(balanceBefore - withdrawAmount);
        });
    });
    
    describe("🔒 Access Control Verification", function () {
        it("Should verify admin cannot be a regular user role", async function () {
            console.log("   🔒 Verifying role separation...");
            
            const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
            
            // Admin should have admin role
            expect(await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress())).to.be.true;
            
            // User should not have admin role
            expect(await savingBank.hasRole(ADMIN_ROLE, await user1.getAddress())).to.be.false;
            expect(await savingBank.hasRole(ADMIN_ROLE, await user2.getAddress())).to.be.false;
            
            console.log(`   ✅ Role separation verified`);
        });
        
        it("Should prevent unauthorized vault operations", async function () {
            console.log("   🚫 Testing unauthorized vault operations...");
            
            const withdrawAmount = 1000_000000n;
            
            try {
                await vault.connect(user1).withdrawLiquidity(withdrawAmount, await user1.getAddress());
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("revert");
            }
            
            console.log(`   ✅ Unauthorized vault withdrawal blocked`);
        });
    });
    
    describe("📊 Admin Dashboard Summary", function () {
        it("Should generate admin operations summary", async function () {
            console.log("\n📊 === ADMIN OPERATIONS SUMMARY ===");
            
            // System Status
            const isPaused = await savingBank.paused();
            console.log(`\n⚙️ System Status: ${isPaused ? "⏸️ PAUSED" : "▶️ ACTIVE"}`);
            
            // Vault Status
            const vaultBalance = await vault.getBalance();
            console.log(`\n🏦 Vault Status:`);
            console.log(`   💰 Available Liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
            
            // Savings Plans
            console.log(`\n📋 Savings Plans:`);
            try {
                const plan1 = await savingBank.getSavingPlan(1);
                console.log(`   Plan 1: ${plan1.name} - ${Number(plan1.annualInterestRateInBasisPoints) / 100}% APR`);
            } catch {}
            try {
                const plan2 = await savingBank.getSavingPlan(2);
                console.log(`   Plan 2: ${plan2.name} - ${Number(plan2.annualInterestRateInBasisPoints) / 100}% APR`);
            } catch {}
            
            // NFT Status
            const totalNFTs = await depositCertificate.totalSupply();
            console.log(`\n🎫 Active Deposits: ${totalNFTs} NFTs`);
            
            // Roles
            console.log(`\n👥 Key Addresses:`);
            console.log(`   🔧 Admin: ${await admin.getAddress()}`);
            console.log(`   ⏸️ Pauser: ${await pauser.getAddress()}`);
            console.log(`   💰 Fee Receiver: ${await feeReceiver.getAddress()}`);
            
            console.log(`\n✅ Admin Operations Tests Complete!`);
        });
    });
});