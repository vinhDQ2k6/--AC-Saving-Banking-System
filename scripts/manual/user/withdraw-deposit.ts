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

export const withdrawDeposit = async () => {
    console.log("\n💸 WITHDRAW DEPOSIT");
    console.log("=".repeat(40));
    
    const { savingBank, signer } = await getContracts();
    const userAddress = await signer.getAddress();
    
    // 1. Get user's deposits
    console.log("\n📋 Your Active Deposits:");
    
    try {
        const depositIds: bigint[] = await savingBank.getUserDepositIds(userAddress);
        
        if (depositIds.length === 0) {
            console.log("⚠️  No deposits found.");
            return;
        }
        
        const activeDeposits: any[] = [];
        
        for (const id of depositIds) {
            const deposit = await savingBank.getDeposit(id);
            // Status 0 = Active
            if (Number(deposit.status) === 0) {
                const plan = await savingBank.getSavingPlan(deposit.savingPlanId);
                const now = Math.floor(Date.now() / 1000);
                const isMatured = now >= Number(deposit.maturityDate);
                
                activeDeposits.push({
                    id: deposit.id,
                    plan: plan,
                    deposit: deposit,
                    isMatured: isMatured
                });
                
                const maturedLabel = isMatured ? "✅ MATURED" : "⏳ Pending";
                console.log(`  [${deposit.id}] ${plan.name} - ${formatUSDC(deposit.amount)} USDC + ${formatUSDC(deposit.expectedInterest)} interest (${maturedLabel})`);
            }
        }
        
        if (activeDeposits.length === 0) {
            console.log("⚠️  No active deposits to withdraw.");
            return;
        }
        
        // 2. Select deposit
        const depositIdStr = await question("\nEnter Deposit ID to withdraw: ");
        const depositId = parseInt(depositIdStr);
        
        const selected = activeDeposits.find(d => Number(d.id) === depositId);
        if (!selected) {
            console.log("❌ Invalid deposit ID.");
            return;
        }
        
        // 3. Show details & warnings
        console.log("\n📊 Withdrawal Details:");
        console.log(`   Principal: ${formatUSDC(selected.deposit.amount)} USDC`);
        console.log(`   Expected Interest: ${formatUSDC(selected.deposit.expectedInterest)} USDC`);
        console.log(`   Maturity Date: ${formatDate(selected.deposit.maturityDate)}`);
        
        if (!selected.isMatured) {
            console.log("\n⚠️  WARNING: This deposit has NOT matured yet!");
            console.log(`   Early withdrawal penalty: ${Number(selected.plan.penaltyRateInBasisPoints) / 100}%`);
            console.log("   You may receive less than your principal!");
        } else {
            console.log("\n✅ This deposit has matured. You will receive full principal + interest.");
        }
        
        const confirm = await askForConfirmation("\nProceed with withdrawal?");
        if (!confirm) {
            console.log("❌ Withdrawal cancelled.");
            return;
        }
        
        // 4. Execute withdrawal
        console.log("\n💳 Processing withdrawal...");
        const tx = await savingBank.withdrawDeposit(depositId);
        console.log(`   Tx: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Withdrawal complete! Gas used: ${receipt?.gasUsed}`);
        console.log("\n🎉 SUCCESS! Funds have been transferred to your wallet.");
        
    } catch (error: any) {
        console.error("\n❌ Error withdrawing:", error.reason || error.message);
    }
};
