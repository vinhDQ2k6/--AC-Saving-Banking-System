import { getContracts } from "../utils/contracts";
import { formatUSDC, formatDate } from "../utils/format";
import { askForConfirmation } from "../utils/prompts";
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

export const renewDeposit = async () => {
    console.log("\n🔄 RENEW DEPOSIT");
    console.log("=".repeat(40));
    
    const { savingBank, signer } = await getContracts();
    const userAddress = await signer.getAddress();
    
    // 1. Get user's matured deposits
    console.log("\n📋 Your Matured Deposits (eligible for renewal):");
    
    try {
        const depositIds: bigint[] = await savingBank.getUserDepositIds(userAddress);
        
        if (depositIds.length === 0) {
            console.log("⚠️  No deposits found.");
            return;
        }
        
        const maturedDeposits: any[] = [];
        const now = Math.floor(Date.now() / 1000);
        
        for (const id of depositIds) {
            const deposit = await savingBank.getDeposit(id);
            // Status 0 = Active AND matured
            if (Number(deposit.status) === 0 && now >= Number(deposit.maturityDate)) {
                const plan = await savingBank.getSavingPlan(deposit.savingPlanId);
                
                maturedDeposits.push({
                    id: deposit.id,
                    plan: plan,
                    deposit: deposit
                });
                
                const totalValue = BigInt(deposit.amount) + BigInt(deposit.expectedInterest);
                console.log(`  [${deposit.id}] ${plan.name} - ${formatUSDC(totalValue)} USDC (Principal + Interest)`);
            }
        }
        
        if (maturedDeposits.length === 0) {
            console.log("⚠️  No matured deposits available for renewal.");
            console.log("   Deposits must be matured before they can be renewed.");
            return;
        }
        
        // 2. Select deposit to renew
        const depositIdStr = await question("\nEnter Deposit ID to renew: ");
        const depositId = parseInt(depositIdStr);
        
        const selected = maturedDeposits.find(d => Number(d.id) === depositId);
        if (!selected) {
            console.log("❌ Invalid deposit ID.");
            return;
        }
        
        // 3. Show available plans for renewal
        console.log("\n📋 Available Plans for Renewal:");
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
        
        // 4. Get new plan and term
        const newPlanIdStr = await question("\nEnter new Plan ID: ");
        const newPlanId = parseInt(newPlanIdStr);
        
        const newPlan = plans.find(p => Number(p.id) === newPlanId);
        if (!newPlan) {
            console.log("❌ Invalid plan ID.");
            return;
        }
        
        const newTermStr = await question(`Enter new term in days (${newPlan.minTermInDays}-${newPlan.maxTermInDays}): `);
        const newTermInDays = parseInt(newTermStr);
        
        // 5. Calculate new deposit value
        const renewalAmount = BigInt(selected.deposit.amount) + BigInt(selected.deposit.expectedInterest);
        const newExpectedInterest = await savingBank.calculateExpectedInterest(renewalAmount, newPlanId, newTermInDays);
        
        console.log("\n📊 Renewal Summary:");
        console.log(`   Old Deposit ID: ${selected.id}`);
        console.log(`   Renewal Amount: ${formatUSDC(renewalAmount)} USDC (Principal + Interest)`);
        console.log(`   New Plan: ${newPlan.name}`);
        console.log(`   New Term: ${newTermInDays} days`);
        console.log(`   New Expected Interest: ${formatUSDC(newExpectedInterest)} USDC`);
        
        const confirm = await askForConfirmation("\nProceed with renewal?");
        if (!confirm) {
            console.log("❌ Renewal cancelled.");
            return;
        }
        
        // 6. Execute renewal
        console.log("\n🔄 Processing renewal...");
        const tx = await savingBank.renewDeposit(depositId, newPlanId, newTermInDays);
        console.log(`   Tx: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Renewal complete! Gas used: ${receipt?.gasUsed}`);
        console.log("\n🎉 SUCCESS! Your deposit has been renewed with new terms.");
        
    } catch (error: any) {
        console.error("\n❌ Error renewing deposit:", error.reason || error.message);
    }
};
