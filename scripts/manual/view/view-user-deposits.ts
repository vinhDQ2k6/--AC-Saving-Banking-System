import { getContracts } from "../utils/contracts";
import { formatUSDC, formatDate } from "../utils/format";
import { getTestWallet, isUsingTestWallet } from "../utils/test-wallet";

const DepositStatusLabels = ["🟢 Active", "🔴 Withdrawn", "🔄 Renewed"];

export const viewUserDeposits = async (userAddress?: string) => {
    const { savingBank, signer } = await getContracts();
    
    // Priority: userAddress parameter > test wallet > default signer
    let targetAddress = userAddress;
    if (!targetAddress && isUsingTestWallet()) {
        targetAddress = getTestWallet()!;
    }
    if (!targetAddress) {
        targetAddress = await signer.getAddress();
    }
    
    const isTestMode = isUsingTestWallet() && !userAddress;
    console.log(`\n📊 Fetching Deposits for: ${targetAddress}`);
    if (isTestMode) {
        console.log("🧪 TEST MODE: Viewing as different user");
    }
    
    try {
        const depositIds: bigint[] = await savingBank.getUserDepositIds(targetAddress);
        
        if (depositIds.length === 0) {
            console.log("⚠️  No deposits found for this address.");
            return;
        }
        
        console.log(`\n📌 Found ${depositIds.length} deposit(s)`);
        
        const deposits: any[] = [];
        
        for (const id of depositIds) {
            try {
                const deposit = await savingBank.getDeposit(id);
                const plan = await savingBank.getSavingPlan(deposit.savingPlanId);
                
                const now = Math.floor(Date.now() / 1000);
                const maturityTimestamp = Number(deposit.maturityDate);
                const isMatured = now >= maturityTimestamp;
                
                deposits.push({
                    "ID": Number(deposit.id),
                    "Plan": plan.name,
                    "Principal": `${formatUSDC(deposit.amount)} USDC`,
                    "Interest": `${formatUSDC(deposit.expectedInterest)} USDC`,
                    "Deposit Date": formatDate(deposit.depositDate),
                    "Maturity": formatDate(deposit.maturityDate),
                    "Matured?": isMatured ? "✅ Yes" : "⏳ No",
                    "Status": DepositStatusLabels[Number(deposit.status)] || "Unknown"
                });
            } catch (error) {
                console.log(`⚠️  Could not fetch deposit #${id}`);
            }
        }
        
        if (deposits.length > 0) {
            console.log("\n=== YOUR DEPOSITS ===");
            console.table(deposits);
        }
        
    } catch (error) {
        console.error("❌ Error fetching deposits:", error);
    }
};
