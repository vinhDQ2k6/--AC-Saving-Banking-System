import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("01 - Full Deployment Test Suite", function () {
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
    
    before(async function () {
        console.log("\n🚀 Starting Full Deployment Test Suite");
        
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
        
        console.log(`👤 Deployer: ${await deployer.getAddress()}`);
        console.log(`👤 Admin: ${await admin.getAddress()}`);
        console.log(`👤 User1: ${await user1.getAddress()}`);
        console.log(`👤 User2: ${await user2.getAddress()}`);
    });
    
    describe("📦 Stage 1: MockUSDC Verification", function () {
        it("Should have correct MockUSDC parameters", async function () {
            console.log("   🪙 Verifying MockUSDC...");
            
            const name = await mockUSDC.name();
            const symbol = await mockUSDC.symbol();
            const decimals = await mockUSDC.decimals();
            
            expect(name).to.equal("Mock USDC");
            expect(symbol).to.equal("USDC");
            expect(decimals).to.equal(6n);
            
            console.log(`   ✅ MockUSDC: ${name} (${symbol}), Decimals: ${decimals}`);
        });
        
        it("Should have minted tokens to users", async function () {
            const user1Balance = await mockUSDC.balanceOf(await user1.getAddress());
            const user2Balance = await mockUSDC.balanceOf(await user2.getAddress());
            
            expect(user1Balance > 0n).to.be.true;
            expect(user2Balance > 0n).to.be.true;
            
            console.log(`   💰 User1 balance: ${ethers.formatUnits(user1Balance, 6)} USDC`);
            console.log(`   💰 User2 balance: ${ethers.formatUnits(user2Balance, 6)} USDC`);
        });
    });
    
    describe("📜 Stage 2: DepositCertificate Verification", function () {
        it("Should have correct DepositCertificate with 24-hour cooldown", async function () {
            console.log("   📜 Verifying DepositCertificate...");
            
            const name = await depositCertificate.name();
            const symbol = await depositCertificate.symbol();
            const cooldown = await depositCertificate.TRANSFER_COOLDOWN();
            
            expect(name).to.equal("SavingBank Deposit Certificate");
            expect(symbol).to.equal("SBDC");
            expect(cooldown).to.equal(86400n); // 24 hours in seconds
            
            console.log(`   ✅ NFT: ${name} (${symbol})`);
            console.log(`   ⏱️ Transfer Cooldown: ${cooldown} seconds (24 hours)`);
        });
        
        it("Should have correct role configuration", async function () {
            const DEFAULT_ADMIN_ROLE = await depositCertificate.DEFAULT_ADMIN_ROLE();
            const MINTER_ROLE = await depositCertificate.MINTER_ROLE();
            
            const deployerHasAdmin = await depositCertificate.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
            const savingBankHasMinter = await depositCertificate.hasRole(MINTER_ROLE, savingBank.target);
            
            expect(deployerHasAdmin).to.be.true;
            expect(savingBankHasMinter).to.be.true;
            
            console.log(`   🔐 Deployer has DEFAULT_ADMIN_ROLE: ✅`);
            console.log(`   🔐 SavingBank has MINTER_ROLE: ✅`);
        });
    });
    
    describe("🏛️ Stage 3: Vault Verification", function () {
        it("Should have correct Vault with token reference", async function () {
            console.log("   🏛️ Verifying Vault...");
            
            const vaultToken = await vault.token();
            expect(vaultToken).to.equal(mockUSDC.target);
            
            console.log(`   ✅ Vault deployed at: ${vault.target}`);
            console.log(`   🪙 Vault token: ${vaultToken}`);
        });
        
        it("Should allow liquidity deposit", async function () {
            const liquidityAmount = 100000_000000n; // 100k USDC
            
            await mockUSDC.connect(admin).approve(vault.target, liquidityAmount);
            await vault.connect(admin).depositLiquidity(liquidityAmount);
            
            const vaultBalance = await vault.getBalance();
            expect(vaultBalance > 0n).to.be.true;
            
            console.log(`   💰 Vault liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
        });
        
        it("Should have correct role configuration", async function () {
            const DEFAULT_ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();
            const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
            
            const deployerHasAdmin = await vault.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
            const savingBankHasLiquidity = await vault.hasRole(LIQUIDITY_MANAGER_ROLE, savingBank.target);
            
            expect(deployerHasAdmin).to.be.true;
            expect(savingBankHasLiquidity).to.be.true;
            
            console.log(`   🔐 Deployer has DEFAULT_ADMIN_ROLE: ✅`);
            console.log(`   🔐 SavingBank has LIQUIDITY_MANAGER_ROLE: ✅`);
        });
    });
    
    describe("🏦 Stage 4: SavingBank Verification", function () {
        it("Should have correct SavingBank with contract references", async function () {
            console.log("   🏦 Verifying SavingBank...");
            
            const bankVault = await savingBank.vault();
            const bankCertificate = await savingBank.depositCertificate();
            
            expect(bankVault).to.equal(vault.target);
            expect(bankCertificate).to.equal(depositCertificate.target);
            
            console.log(`   ✅ SavingBank deployed at: ${savingBank.target}`);
            console.log(`   🏛️ References Vault: ${bankVault}`);
            console.log(`   📜 References Certificate: ${bankCertificate}`);
        });
        
        it("Should have correct role configuration", async function () {
            const DEFAULT_ADMIN_ROLE = await savingBank.DEFAULT_ADMIN_ROLE();
            const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
            
            const deployerHasAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress());
            const adminHasAdminRole = await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress());
            
            expect(deployerHasAdmin).to.be.true;
            expect(adminHasAdminRole).to.be.true;
            
            console.log(`   🔐 Deployer has DEFAULT_ADMIN_ROLE: ✅`);
            console.log(`   🔐 Admin has ADMIN_ROLE: ✅`);
        });
    });
    
    describe("🔐 Stage 5: Cross-Contract Role Verification", function () {
        it("Should verify SavingBank has required roles on other contracts", async function () {
            console.log("   🔐 Verifying cross-contract roles...");
            
            // DepositCertificate roles
            const MINTER_ROLE = await depositCertificate.MINTER_ROLE();
            const hasMinter = await depositCertificate.hasRole(MINTER_ROLE, savingBank.target);
            
            // Vault roles
            const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
            const WITHDRAW_ROLE = await vault.WITHDRAW_ROLE();
            const hasLiquidityManager = await vault.hasRole(LIQUIDITY_MANAGER_ROLE, savingBank.target);
            const hasWithdraw = await vault.hasRole(WITHDRAW_ROLE, savingBank.target);
            
            expect(hasMinter).to.be.true;
            expect(hasLiquidityManager).to.be.true;
            expect(hasWithdraw).to.be.true;
            
            console.log(`   📜 SavingBank has MINTER_ROLE on DepositCertificate: ✅`);
            console.log(`   🏛️ SavingBank has LIQUIDITY_MANAGER_ROLE on Vault: ✅`);
            console.log(`   🏛️ SavingBank has WITHDRAW_ROLE on Vault: ✅`);
        });
    });
    
    describe("🧪 Deployment Integration Test", function () {
        it("Should verify complete system integration with deposit", async function () {
            console.log("   🧪 Testing system integration...");
            
            const depositAmount = 1000_000000n; // 1000 USDC
            const termDays = 30;
            
            // User approves and creates deposit
            await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
            const tx = await savingBank.connect(user1).createDeposit(1, depositAmount, termDays);
            const receipt = await tx.wait();
            
            // Extract deposit ID from event
            const depositEvent = receipt.logs.find((log: any) => 
                log.fragment && log.fragment.name === 'DepositCreated'
            );
            const depositId = depositEvent.args[0];
            const certificateId = depositEvent.args[6];
            
            // Verify NFT ownership
            const nftOwner = await depositCertificate.ownerOf(certificateId);
            expect(nftOwner).to.equal(await user1.getAddress());
            
            // Verify deposit info
            const deposit = await savingBank.getDeposit(depositId);
            expect(deposit.amount).to.equal(depositAmount);
            expect(deposit.termInDays).to.equal(BigInt(termDays));
            
            // Note: Cooldown is only active after TRANSFERS, not initial mint
            // This is by design - original depositor can withdraw immediately
            const isInCooldown = await depositCertificate.isInCooldown(certificateId);
            expect(isInCooldown).to.be.false; // Not in cooldown - never transferred
            
            console.log(`   ✅ Deposit created successfully - ID: ${depositId}`);
            console.log(`   🎫 NFT Certificate: #${certificateId}`);
            console.log(`   🔒 NFT ready for use (cooldown only after transfer)`);
        });
    });
    
    describe("📊 Deployment Summary", function () {
        it("Should generate deployment report", async function () {
            console.log("\n📋 === DEPLOYMENT SUMMARY ===");
            console.log(`🪙 MockUSDC: ${mockUSDC.target}`);
            console.log(`📜 DepositCertificate: ${depositCertificate.target}`);
            console.log(`🏛️ Vault: ${vault.target}`);
            console.log(`🏦 SavingBank: ${savingBank.target}`);
            
            const vaultBalance = await vault.getBalance();
            const totalNFTs = await depositCertificate.totalSupply();
            
            console.log(`\n💰 Financial State:`);
            console.log(`   Vault Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
            console.log(`\n🎫 NFT State:`);
            console.log(`   Total NFTs Minted: ${totalNFTs}`);
            
            console.log(`\n✅ Deployment Complete - Ready for Business Operations!`);
        });
    });
});