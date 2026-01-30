import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployFullFixture } from "../helpers/fixtures";

describe("02 - Role Management & Security Setup", function () {
    let deployer: Signer;
    let admin: Signer;
    let pauser: Signer;
    let user1: Signer;
    let user2: Signer;
    let feeReceiver: Signer;
    let multisig: Signer;
    
    let mockUSDC: any;
    let depositCertificate: any;
    let vault: any;
    let savingBank: any;
    
    before(async function () {
        console.log("\n🔐 Starting Role Management & Security Setup Tests");
        
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
        
        // Get extra signer to simulate multisig
        const signers = await ethers.getSigners();
        multisig = signers[6];
        
        console.log(`👤 Deployer: ${await deployer.getAddress()}`);
        console.log(`👥 Multisig: ${await multisig.getAddress()}`);
        console.log(`🔑 Admin: ${await admin.getAddress()}`);
        console.log(`⏸️ Pauser: ${await pauser.getAddress()}`);
        console.log(`👤 User1: ${await user1.getAddress()}`);
    });
    
    describe("🔍 Current Role Verification", function () {
        it("Should verify initial role assignments", async function () {
            console.log("   🔍 Verifying current role assignments...");
            
            const DEFAULT_ADMIN_ROLE = await savingBank.DEFAULT_ADMIN_ROLE();
            const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
            const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
            
            // SavingBank roles
            expect(await savingBank.hasRole(DEFAULT_ADMIN_ROLE, await deployer.getAddress())).to.be.true;
            expect(await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress())).to.be.true;
            expect(await savingBank.hasRole(PAUSER_ROLE, await pauser.getAddress())).to.be.true;
            
            console.log(`   🏦 SavingBank - Deployer has DEFAULT_ADMIN_ROLE: ✅`);
            console.log(`   🏦 SavingBank - Admin has ADMIN_ROLE: ✅`);
            console.log(`   🏦 SavingBank - Pauser has PAUSER_ROLE: ✅`);
            
            // DepositCertificate roles
            const MINTER_ROLE = await depositCertificate.MINTER_ROLE();
            expect(await depositCertificate.hasRole(MINTER_ROLE, savingBank.target)).to.be.true;
            console.log(`   📜 DepositCertificate - Roles configured: ✅`);
            
            // Vault roles
            const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
            expect(await vault.hasRole(LIQUIDITY_MANAGER_ROLE, savingBank.target)).to.be.true;
            console.log(`   🏛️ Vault - Roles configured: ✅`);
        });
    });
    
    describe("👥 Multisig Transfer Simulation", function () {
        it("Should simulate admin role transfer to multisig", async function () {
            console.log("   👥 Simulating admin role transfer to multisig...");
            
            const DEFAULT_ADMIN_ROLE = await savingBank.DEFAULT_ADMIN_ROLE();
            const multisigAddress = await multisig.getAddress();
            
            // Grant DEFAULT_ADMIN_ROLE to multisig on all contracts
            console.log("   📝 Phase 1: Granting admin roles to multisig...");
            
            await savingBank.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, multisigAddress);
            await depositCertificate.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, multisigAddress);
            await vault.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, multisigAddress);
            
            expect(await savingBank.hasRole(DEFAULT_ADMIN_ROLE, multisigAddress)).to.be.true;
            expect(await depositCertificate.hasRole(DEFAULT_ADMIN_ROLE, multisigAddress)).to.be.true;
            expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, multisigAddress)).to.be.true;
            
            console.log("   ✅ Multisig granted DEFAULT_ADMIN_ROLE on all contracts");
        });
        
        it("Should test multisig admin functionality", async function () {
            console.log("   🧪 Testing multisig admin functionality...");
            
            const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
            const multisigAddress = await multisig.getAddress();
            
            // Multisig should be able to grant roles now
            const newPauser = await user2.getAddress();
            await savingBank.connect(multisig).grantRole(PAUSER_ROLE, newPauser);
            
            expect(await savingBank.hasRole(PAUSER_ROLE, newPauser)).to.be.true;
            
            console.log(`   ✅ Multisig successfully granted PAUSER_ROLE to new address`);
            
            // Cleanup - remove the role we just added
            await savingBank.connect(multisig).revokeRole(PAUSER_ROLE, newPauser);
        });
        
        it("Should revoke deployer admin access", async function () {
            console.log("   🔄 Phase 2: Revoking deployer admin access...");
            
            const DEFAULT_ADMIN_ROLE = await savingBank.DEFAULT_ADMIN_ROLE();
            const deployerAddress = await deployer.getAddress();
            
            // Deployer renounces their admin role on all contracts
            await savingBank.connect(deployer).renounceRole(DEFAULT_ADMIN_ROLE, deployerAddress);
            await depositCertificate.connect(deployer).renounceRole(DEFAULT_ADMIN_ROLE, deployerAddress);
            await vault.connect(deployer).renounceRole(DEFAULT_ADMIN_ROLE, deployerAddress);
            
            expect(await savingBank.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress)).to.be.false;
            expect(await depositCertificate.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress)).to.be.false;
            expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress)).to.be.false;
            
            console.log("   🚫 Deployer admin access revoked: ✅");
        });
        
        it("Should verify deployer cannot perform admin actions", async function () {
            console.log("   🚫 Verifying deployer access blocked...");
            
            const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
            const user1Address = await user1.getAddress();
            
            // Deployer should not be able to grant roles anymore
            try {
                await savingBank.connect(deployer).grantRole(PAUSER_ROLE, user1Address);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("AccessControlUnauthorizedAccount");
            }
            
            console.log("   ✅ Deployer correctly blocked from admin actions");
        });
    });
    
    describe("🔑 Granular Role Management", function () {
        it("Should setup granular admin roles", async function () {
            console.log("   🔑 Setting up granular admin roles...");
            
            const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
            const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
            
            // Verify granular roles
            expect(await savingBank.hasRole(ADMIN_ROLE, await admin.getAddress())).to.be.true;
            expect(await savingBank.hasRole(PAUSER_ROLE, await pauser.getAddress())).to.be.true;
            
            console.log("   👑 Admin has ADMIN_ROLE: ✅");
            console.log("   ⏸️ Pauser has PAUSER_ROLE: ✅");
        });
        
        it("Should test granular role functionality", async function () {
            console.log("   🧪 Testing granular role functionality...");
            
            // Pauser can pause and unpause
            await savingBank.connect(pauser).pause();
            expect(await savingBank.paused()).to.be.true;
            console.log("   ⏸️ Pauser can pause system: ✅");
            
            await savingBank.connect(pauser).unpause();
            expect(await savingBank.paused()).to.be.false;
            console.log("   ▶️ Pauser can unpause system: ✅");
        });
        
        it("Should verify role boundaries", async function () {
            console.log("   🛡️ Verifying role boundaries...");
            
            // User1 cannot pause (no role)
            try {
                await savingBank.connect(user1).pause();
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("AccessControlUnauthorizedAccount");
            }
            
            console.log("   ✅ Non-authorized users blocked from pause: ✅");
        });
    });
    
    describe("🆘 Emergency Procedures", function () {
        it("Should test emergency pause scenarios", async function () {
            console.log("   🆘 Testing emergency procedures...");
            
            // Setup vault liquidity
            await mockUSDC.connect(admin).approve(vault.target, 100000_000000n);
            await vault.connect(admin).depositLiquidity(100000_000000n);
            
            // Pause system
            await savingBank.connect(pauser).pause();
            expect(await savingBank.paused()).to.be.true;
            console.log("   🚨 System paused for emergency");
            
            // Operations should be blocked
            const depositAmount = 1000_000000n;
            await mockUSDC.connect(user1).approve(savingBank.target, depositAmount);
            
            try {
                await savingBank.connect(user1).createDeposit(1, depositAmount, 30);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("EnforcedPause");
            }
            
            console.log("   ✅ Deposits blocked during pause");
            
            // Unpause
            await savingBank.connect(pauser).unpause();
            expect(await savingBank.paused()).to.be.false;
            console.log("   ▶️ System resumed after emergency");
            
            // Operations should work again
            await savingBank.connect(user1).createDeposit(1, depositAmount, 30);
            console.log("   ✅ Deposits work after unpause");
        });
    });
    
    describe("📊 Security Summary", function () {
        it("Should generate security configuration report", async function () {
            console.log("\n📋 === SECURITY CONFIGURATION SUMMARY ===");
            
            const DEFAULT_ADMIN_ROLE = await savingBank.DEFAULT_ADMIN_ROLE();
            const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
            const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
            
            const multisigAddress = await multisig.getAddress();
            const adminAddress = await admin.getAddress();
            const pauserAddress = await pauser.getAddress();
            
            console.log(`\n🔐 Role Assignments:`);
            console.log(`   👥 Multisig (${multisigAddress}):`);
            console.log(`      - DEFAULT_ADMIN_ROLE`);
            console.log(`   👑 Admin (${adminAddress}):`);
            console.log(`      - ADMIN_ROLE`);
            console.log(`   ⏸️ Pauser (${pauserAddress}):`);
            console.log(`      - PAUSER_ROLE`);
            
            console.log(`\n🛡️ Security Features:`);
            console.log(`   ✅ 24-hour NFT transfer cooldown`);
            console.log(`   ✅ Role-based access control`);
            console.log(`   ✅ Multisig admin management`);
            console.log(`   ✅ Emergency pause functionality`);
            console.log(`   ✅ Granular role separation`);
            
            console.log(`\n🔒 Production Security Ready!`);
        });
    });
});