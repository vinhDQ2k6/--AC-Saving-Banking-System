import { getContracts } from "../utils/contracts";
import { formatUSDC, parseUSDC } from "../utils/format";
import { askForAmount, askForConfirmation } from "../utils/prompts";
import * as readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

export const createDeposit = async () => {
    console.log("\n💰 CREATE NEW DEPOSIT");
    console.log("=".repeat(40));
    
    const { savingBank, usdc, signer } = await getContracts();
    const userAddress = await signer.getAddress();
    
    // 1. Show available plans
    console.log("\n📋 Available Saving Plans:");
    const plans: any[] = [];
    
    for (let i = 1; i <= 10; i++) {
        try {
            const plan = await savingBank.getSavingPlan(i);
            if (plan.id > 0 && plan.isActive) {
                plans.push(plan);
                console.log(`  [${plan.id}] ${plan.name} - ${Number(plan.annualInterestRateInBasisPoints)/100}% APR (${plan.minTermInDays}-${plan.maxTermInDays} days)`);
            }
        } catch { break; }
    }
    
    if (plans.length === 0) {
        console.log("❌ No active saving plans available.");
        return;
    }
    
    // 2. Get user inputs
    const planIdStr = await question("\nEnter Plan ID: ");
    const planId = parseInt(planIdStr);
    
    const selectedPlan = plans.find(p => Number(p.id) === planId);
    if (!selectedPlan) {
        console.log("❌ Invalid plan ID.");
        return;
    }
    
    const amountStr = await askForAmount(`Enter deposit amount (${formatUSDC(selectedPlan.minDepositAmount)}-${formatUSDC(selectedPlan.maxDepositAmount)} USDC)`);
    const amount = parseUSDC(amountStr);
    
    const termStr = await question(`Enter term in days (${selectedPlan.minTermInDays}-${selectedPlan.maxTermInDays}): `);
    const termInDays = parseInt(termStr);
    
    // 3. Calculate expected interest
    try {
        const expectedInterest = await savingBank.calculateExpectedInterest(amount, planId, termInDays);
        
        console.log("\n📊 Deposit Summary:");
        console.log(`   Plan: ${selectedPlan.name}`);
        console.log(`   Principal: ${formatUSDC(amount)} USDC`);
        console.log(`   Term: ${termInDays} days`);
        console.log(`   Expected Interest: ${formatUSDC(expectedInterest)} USDC`);
        console.log(`   Total at Maturity: ${formatUSDC(amount + expectedInterest)} USDC`);
        
        const confirm = await askForConfirmation("\nProceed with deposit?");
        if (!confirm) {
            console.log("❌ Deposit cancelled.");
            return;
        }
        
        // 4. Check and approve USDC
        const savingBankAddress = await savingBank.getAddress();
        const allowance = await usdc.allowance(userAddress, savingBankAddress);
        
        if (allowance < amount) {
            console.log("\n🔐 Approving USDC...");
            const approveTx = await usdc.approve(savingBankAddress, amount);
            console.log(`   Tx: ${approveTx.hash}`);
            await approveTx.wait();
            console.log("   ✅ Approved!");
        }
        
        // 5. Create deposit
        console.log("\n💳 Creating deposit...");
        const tx = await savingBank.createDeposit(planId, amount, termInDays);
        console.log(`   Tx: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Deposit created! Gas used: ${receipt?.gasUsed}`);
        
        // Try to parse deposit ID from events
        console.log("\n🎉 SUCCESS! Your deposit has been created.");
        
    } catch (error: any) {
        console.error("\n❌ Error creating deposit:", error.reason || error.message);
    }
};
