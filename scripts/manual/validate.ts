#!/usr/bin/env ts-node

import { getContracts } from "./utils/contracts";
import { formatUSDC } from "./utils/format";

async function validateSystem() {
    console.log("🔧 SYSTEM VALIDATION TEST");
    console.log("=".repeat(50));
    
    try {
        console.log("1. Loading contracts...");
        const { savingBank, vault, usdc, certificate, addresses } = await getContracts();
        console.log("✅ Contracts loaded successfully");
        
        console.log("\n2. Testing contract addresses...");
        console.log(`   SavingBank: ${addresses.savingBank}`);
        console.log(`   Vault: ${addresses.vault}`);
        console.log(`   USDC: ${addresses.usdc}`);
        console.log(`   Certificate: ${addresses.certificate}`);
        
        console.log("\n3. Testing contract calls...");
        
        // Test vault
        const vaultBalance = await vault.getBalance();
        console.log(`✅ Vault balance: ${formatUSDC(vaultBalance)} USDC`);
        
        // Test certificate
        const totalSupply = await certificate.totalSupply();
        console.log(`✅ Certificate supply: ${totalSupply}`);
        
        // Test saving plan
        const plan = await savingBank.getSavingPlan(1);
        console.log(`✅ Saving plan: ${plan.name} (${Number(plan.annualInterestRateInBasisPoints)/100}% APR)`);
        
        console.log("\n✅ ALL TESTS PASSED - System is working correctly!");
        
    } catch (error) {
        console.error("❌ VALIDATION FAILED:", error);
        process.exit(1);
    }
}

validateSystem().catch(console.error);