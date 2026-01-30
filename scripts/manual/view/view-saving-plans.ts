import { getContracts } from "../utils/contracts";
import { formatUSDC } from "../utils/format";

export const viewSavingPlans = async () => {
  console.log("\n📋 Fetching All Saving Plans...");

  const { savingBank } = await getContracts();

  // Try to get plans from 1 to 10 (typical range)
  const plans: any[] = [];

  for (let i = 1; i <= 10; i++) {
    try {
      const plan = await savingBank.getSavingPlan(i);
      if (plan.id > 0) {
        // Get penalty receiver
        const penaltyReceiver = await savingBank.getPenaltyReceiver(i);
        const receiverDisplay =
          penaltyReceiver === "0x0000000000000000000000000000000000000000"
            ? "Vault"
            : `${penaltyReceiver.substring(0, 6)}...${penaltyReceiver.slice(-4)}`;

        plans.push({
          ID: Number(plan.id),
          Name: plan.name,
          APR: `${Number(plan.annualInterestRateInBasisPoints) / 100}%`,
          Term: `${plan.minTermInDays}-${plan.maxTermInDays} days`,
          "Min Deposit": `${formatUSDC(plan.minDepositAmount)} USDC`,
          "Max Deposit": `${formatUSDC(plan.maxDepositAmount)} USDC`,
          Penalty: `${Number(plan.penaltyRateInBasisPoints) / 100}%`,
          "Penalty To": receiverDisplay,
          Status: plan.isActive ? "✅ Active" : "❌ Inactive",
        });
      }
    } catch {
      // Plan doesn't exist, stop searching
      break;
    }
  }

  if (plans.length === 0) {
    console.log("⚠️  No saving plans found.");
    return;
  }

  console.log("\n=== SAVING PLANS ===");
  console.table(plans);

  console.log("\nℹ️  Penalty Receiver:");
  console.log("   'Vault' = Penalties remain in vault");
  console.log("   Address = Penalties sent to specific address");
};
