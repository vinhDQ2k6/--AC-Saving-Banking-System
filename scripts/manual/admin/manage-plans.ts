import { getContracts } from "../utils/contracts";
import { parseUSDC, formatUSDC } from "../utils/format";
import { askForConfirmation } from "../utils/prompts";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

export const createSavingPlan = async () => {
  console.log("\n📝 CREATE NEW SAVING PLAN");
  console.log("=".repeat(40));

  const { savingBank } = await getContracts();

  try {
    // Collect plan parameters
    console.log("\nEnter the following parameters:");

    const name = await question("Plan Name (e.g. 'Premium 90'): ");
    const minDepositStr = await question("Minimum Deposit (USDC): ");
    const maxDepositStr = await question("Maximum Deposit (USDC): ");
    const minTermStr = await question("Minimum Term (days): ");
    const maxTermStr = await question("Maximum Term (days): ");
    const aprStr = await question("Annual Interest Rate (%, e.g. 5.5): ");
    const penaltyStr = await question("Early Withdrawal Penalty (%, e.g. 2): ");

    // Parse values
    const minDeposit = parseUSDC(minDepositStr);
    const maxDeposit = parseUSDC(maxDepositStr);
    const minTerm = parseInt(minTermStr);
    const maxTerm = parseInt(maxTermStr);
    const aprBps = Math.round(parseFloat(aprStr) * 100); // Convert % to basis points
    const penaltyBps = Math.round(parseFloat(penaltyStr) * 100);

    // Show summary
    console.log("\n📊 New Plan Summary:");
    console.log(`   Name: ${name}`);
    console.log(`   Deposit Range: ${formatUSDC(minDeposit)} - ${formatUSDC(maxDeposit)} USDC`);
    console.log(`   Term Range: ${minTerm} - ${maxTerm} days`);
    console.log(`   APR: ${aprBps / 100}%`);
    console.log(`   Penalty Rate: ${penaltyBps / 100}%`);

    const confirm = await askForConfirmation("\nCreate this saving plan?");
    if (!confirm) {
      console.log("❌ Cancelled.");
      return;
    }

    // Create the plan
    console.log("\n💳 Creating saving plan...");

    const planInput = {
      name: name,
      minDepositAmount: minDeposit,
      maxDepositAmount: maxDeposit,
      minTermInDays: minTerm,
      maxTermInDays: maxTerm,
      annualInterestRateInBasisPoints: aprBps,
      penaltyRateInBasisPoints: penaltyBps,
    };

    const tx = await savingBank.createSavingPlan(planInput);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Plan created! Gas used: ${receipt?.gasUsed}`);
    console.log("\n🎉 SUCCESS! New saving plan has been created.");
    console.log("   Note: Plan is inactive by default. Use 'Activate Plan' to enable it.");
  } catch (error: any) {
    console.error("\n❌ Error creating plan:", error.reason || error.message);
  }
};

export const updateSavingPlan = async () => {
  console.log("\n✏️  UPDATE SAVING PLAN");
  console.log("=".repeat(40));

  const { savingBank } = await getContracts();

  try {
    // Show current plans
    console.log("\n📋 Current Saving Plans:");

    for (let i = 1; i <= 10; i++) {
      try {
        const plan = await savingBank.getSavingPlan(i);
        if (plan.id > 0) {
          console.log(`  [${plan.id}] ${plan.name} - ${Number(plan.annualInterestRateInBasisPoints) / 100}% APR`);
        }
      } catch {
        break;
      }
    }

    const planIdStr = await question("\nEnter Plan ID to update: ");
    const planId = parseInt(planIdStr);

    const currentPlan = await savingBank.getSavingPlan(planId);

    console.log("\n📊 Current Plan Configuration:");
    console.log(`   Name: ${currentPlan.name}`);
    console.log(`   Min Deposit: ${formatUSDC(currentPlan.minDepositAmount)} USDC`);
    console.log(`   Max Deposit: ${formatUSDC(currentPlan.maxDepositAmount)} USDC`);
    console.log(`   Term Range: ${currentPlan.minTermInDays}-${currentPlan.maxTermInDays} days`);
    console.log(`   APR: ${Number(currentPlan.annualInterestRateInBasisPoints) / 100}%`);
    console.log(`   Penalty: ${Number(currentPlan.penaltyRateInBasisPoints) / 100}%`);

    console.log("\nEnter new values (press Enter to keep current):");

    // Get new values or keep current
    const nameInput = await question(`Plan Name [${currentPlan.name}]: `);
    const name = nameInput.trim() || currentPlan.name;

    const minDepositInput = await question(`Minimum Deposit (USDC) [${formatUSDC(currentPlan.minDepositAmount)}]: `);
    const minDeposit = minDepositInput.trim() ? parseUSDC(minDepositInput) : currentPlan.minDepositAmount;

    const maxDepositInput = await question(`Maximum Deposit (USDC) [${formatUSDC(currentPlan.maxDepositAmount)}]: `);
    const maxDeposit = maxDepositInput.trim() ? parseUSDC(maxDepositInput) : currentPlan.maxDepositAmount;

    const minTermInput = await question(`Minimum Term (days) [${currentPlan.minTermInDays}]: `);
    const minTerm = minTermInput.trim() ? parseInt(minTermInput) : currentPlan.minTermInDays;

    const maxTermInput = await question(`Maximum Term (days) [${currentPlan.maxTermInDays}]: `);
    const maxTerm = maxTermInput.trim() ? parseInt(maxTermInput) : currentPlan.maxTermInDays;

    const aprInput = await question(
      `Annual Interest Rate (%) [${Number(currentPlan.annualInterestRateInBasisPoints) / 100}]: `
    );
    const aprBps = aprInput.trim()
      ? Math.round(parseFloat(aprInput) * 100)
      : currentPlan.annualInterestRateInBasisPoints;

    const penaltyInput = await question(
      `Early Withdrawal Penalty (%) [${Number(currentPlan.penaltyRateInBasisPoints) / 100}]: `
    );
    const penaltyBps = penaltyInput.trim()
      ? Math.round(parseFloat(penaltyInput) * 100)
      : currentPlan.penaltyRateInBasisPoints;

    // Show summary
    console.log("\n📊 Updated Plan Summary:");
    console.log(`   Name: ${name}`);
    console.log(`   Deposit Range: ${formatUSDC(minDeposit)} - ${formatUSDC(maxDeposit)} USDC`);
    console.log(`   Term Range: ${minTerm} - ${maxTerm} days`);
    console.log(`   APR: ${Number(aprBps) / 100}%`);
    console.log(`   Penalty Rate: ${Number(penaltyBps) / 100}%`);

    console.log("\n⚠️  Note: This will NOT affect existing deposits.");

    const confirm = await askForConfirmation("\nUpdate this saving plan?");
    if (!confirm) {
      console.log("❌ Cancelled.");
      return;
    }

    // Update the plan
    console.log("\n💳 Updating saving plan...");

    const planInput = {
      name: name,
      minDepositAmount: minDeposit,
      maxDepositAmount: maxDeposit,
      minTermInDays: minTerm,
      maxTermInDays: maxTerm,
      annualInterestRateInBasisPoints: aprBps,
      penaltyRateInBasisPoints: penaltyBps,
    };

    const tx = await savingBank.updateSavingPlan(planId, planInput);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Plan updated! Gas used: ${receipt?.gasUsed}`);
  } catch (error: any) {
    console.error("\n❌ Error updating plan:", error.reason || error.message);
  }
};

export const updateSavingPlanStatus = async () => {
  console.log("\n🔄 ACTIVATE/DEACTIVATE SAVING PLAN");
  console.log("=".repeat(40));

  const { savingBank } = await getContracts();

  try {
    // Show current plans
    console.log("\n📋 Current Saving Plans:");

    for (let i = 1; i <= 10; i++) {
      try {
        const plan = await savingBank.getSavingPlan(i);
        if (plan.id > 0) {
          const status = plan.isActive ? "✅ Active" : "❌ Inactive";
          console.log(`  [${plan.id}] ${plan.name} - ${status}`);
        }
      } catch {
        break;
      }
    }

    const planIdStr = await question("\nEnter Plan ID: ");
    const planId = parseInt(planIdStr);

    const plan = await savingBank.getSavingPlan(planId);
    const currentStatus = plan.isActive;

    console.log(`\n   Current Status: ${currentStatus ? "Active" : "Inactive"}`);
    console.log(`   New Status: ${!currentStatus ? "Active" : "Inactive"}`);

    const confirm = await askForConfirmation(`\n${currentStatus ? "Deactivate" : "Activate"} this plan?`);
    if (!confirm) {
      console.log("❌ Cancelled.");
      return;
    }

    console.log("\n💳 Updating plan status...");

    let tx;
    if (currentStatus) {
      tx = await savingBank.deactivateSavingPlan(planId);
    } else {
      tx = await savingBank.activateSavingPlan(planId);
    }

    console.log(`   Tx: ${tx.hash}`);
    await tx.wait();
    console.log(`   ✅ Plan ${currentStatus ? "deactivated" : "activated"}!`);
  } catch (error: any) {
    console.error("\n❌ Error updating plan:", error.reason || error.message);
  }
};
