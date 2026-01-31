import { getContracts } from "../utils/contracts";
import { formatUSDC } from "../utils/format";

export const viewSavingPlans = async () => {
  console.log("\n📋 Fetching All Saving Plans...");

  // Get total plans and fetch all
  const plans: any[] = [];

  try {
    const { savingBank } = await getContracts();
    console.log("✅ Contracts loaded");

    // Try to get total plans (new function), fallback to old method if not available
    let totalPlans = 0;
    try {
      console.log("🔍 Getting total plans...");
      totalPlans = Number(await savingBank.getTotalPlans());
      console.log(`📊 Total plans: ${totalPlans}`);
    } catch (e: any) {
      console.log("⚠️  getTotalPlans not available, using fallback method");
      totalPlans = 10; // Try up to 10 plans as fallback
    }

    if (totalPlans === 0) {
      console.log("⚠️  No saving plans found.");
      return;
    }

    for (let i = 1; i <= totalPlans; i++) {
      try {
        console.log(`🔍 Fetching plan ${i}...`);
        const plan = await savingBank.getSavingPlan(i);
        console.log(`   Plan ${i} found: ${plan.name}`);

        if (plan.id > 0) {
          // Get penalty receiver (try new function, fallback if not available)
          let penaltyReceiver = "0x0000000000000000000000000000000000000000";
          try {
            penaltyReceiver = await savingBank.getPenaltyReceiver(i);
          } catch (e: any) {
            console.log(`   ⚠️  getPenaltyReceiver not available for plan ${i}`);
          }

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
      } catch (e: any) {
        console.log(`⚠️  Skipping plan ${i}: ${e?.reason || e?.message || e}`);
        if (i >= 5) break; // Stop after 5 consecutive errors (likely no more plans)
        continue;
      }
    }
  } catch (error: any) {
    console.error("❌ Error in viewSavingPlans:", error.reason || error.message);
    throw error;
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
