import { getContracts } from "../utils/contracts";
import { askForAddress, askForConfirmation, askInput } from "../utils/prompts";

/**
 * @title Penalty Receiver Management
 * @notice Manage penalty receiver addresses for each saving plan
 * @dev Penalties from early withdrawals are sent to configured receiver addresses
 */

export const updatePenaltyReceiver = async () => {
  console.log("\n💸 UPDATE PENALTY RECEIVER");
  console.log("=".repeat(50));

  const { savingBank } = await getContracts();

  try {
    // Show current plans with their penalty receivers
    console.log("\n📋 Current Saving Plans:");

    const plans: any[] = [];
    for (let i = 1; i <= 10; i++) {
      try {
        const plan = await savingBank.getSavingPlan(i);
        if (plan.id > 0) {
          const penaltyReceiver = await savingBank.getPenaltyReceiver(i);
          const receiverDisplay =
            penaltyReceiver === "0x0000000000000000000000000000000000000000"
              ? "❌ Not Set (Penalty stays in vault)"
              : `✅ ${penaltyReceiver.substring(0, 10)}...${penaltyReceiver.slice(-4)}`;

          plans.push({
            id: Number(plan.id),
            name: plan.name,
            receiver: receiverDisplay,
          });

          console.log(`  [${plan.id}] ${plan.name}`);
          console.log(`      Penalty Receiver: ${receiverDisplay}`);
          console.log(`      Penalty Rate: ${Number(plan.penaltyRateInBasisPoints) / 100}%`);
        }
      } catch {
        break;
      }
    }

    if (plans.length === 0) {
      console.log("❌ No saving plans found.");
      return;
    }

    const planIdStr = await askInput("\nEnter Plan ID to update penalty receiver");
    const planId = parseInt(planIdStr);

    // Validate plan exists
    const plan = await savingBank.getSavingPlan(planId);
    if (!plan.id) {
      console.log("❌ Invalid plan ID.");
      return;
    }

    const currentReceiver = await savingBank.getPenaltyReceiver(planId);

    console.log("\n📊 Current Configuration:");
    console.log(`   Plan: ${plan.name}`);
    console.log(`   Penalty Rate: ${Number(plan.penaltyRateInBasisPoints) / 100}%`);
    console.log(
      `   Current Receiver: ${
        currentReceiver === "0x0000000000000000000000000000000000000000" ? "Not Set (Vault)" : currentReceiver
      }`
    );

    const newReceiver = await askForAddress("\nEnter new penalty receiver address");

    if (newReceiver.toLowerCase() === currentReceiver.toLowerCase()) {
      console.log("⚠️  New address is same as current receiver.");
      return;
    }

    console.log("\n📝 Update Summary:");
    console.log(`   Plan ID: ${planId} (${plan.name})`);
    console.log(
      `   Old Receiver: ${currentReceiver === "0x0000000000000000000000000000000000000000" ? "Vault" : currentReceiver}`
    );
    console.log(`   New Receiver: ${newReceiver}`);
    console.log(`\n   ℹ️  Note: Future early withdrawals will send penalties to this address`);

    const confirm = await askForConfirmation("\nUpdate penalty receiver?");
    if (!confirm) {
      console.log("❌ Cancelled.");
      return;
    }

    console.log("\n💳 Updating penalty receiver...");
    const tx = await savingBank.updatePenaltyReceiver(planId, newReceiver);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Penalty receiver updated! Gas used: ${receipt?.gasUsed}`);
  } catch (error: any) {
    console.error("\n❌ Error updating penalty receiver:", error.reason || error.message);
  }
};

export const viewPenaltyReceivers = async () => {
  console.log("\n👁️  VIEW PENALTY RECEIVERS");
  console.log("=".repeat(50));

  const { savingBank } = await getContracts();

  try {
    console.log("\n📋 Penalty Receiver Configuration:");

    const receivers: any[] = [];

    for (let i = 1; i <= 10; i++) {
      try {
        const plan = await savingBank.getSavingPlan(i);
        if (plan.id > 0) {
          const penaltyReceiver = await savingBank.getPenaltyReceiver(i);

          receivers.push({
            "Plan ID": Number(plan.id),
            "Plan Name": plan.name,
            "Penalty Rate": `${Number(plan.penaltyRateInBasisPoints) / 100}%`,
            Receiver:
              penaltyReceiver === "0x0000000000000000000000000000000000000000"
                ? "Vault (Not Set)"
                : `${penaltyReceiver.substring(0, 8)}...${penaltyReceiver.slice(-4)}`,
          });
        }
      } catch {
        break;
      }
    }

    if (receivers.length === 0) {
      console.log("❌ No saving plans found.");
      return;
    }

    console.log("\n=== PENALTY RECEIVER CONFIGURATION ===");
    console.table(receivers);

    console.log("\nℹ️  Notes:");
    console.log("   - If receiver is 'Vault (Not Set)', penalties remain in vault");
    console.log("   - Otherwise, penalties are sent to the configured address");
    console.log("   - This only affects early withdrawals");
  } catch (error: any) {
    console.error("\n❌ Error viewing penalty receivers:", error.reason || error.message);
  }
};
