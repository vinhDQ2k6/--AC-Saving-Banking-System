import { getContracts } from "../utils/contracts";
import { formatUSDC } from "../utils/format";

export const viewSystemStatus = async () => {
  console.log("\n🔍 Fetching System Status...");

  // 1. Setup
  const { savingBank, vault, usdc, certificate } = await getContracts();

  // 2. Fetch Vault Info
  let vaultManagedBalance = 0n;
  let vaultUSDCBalance = 0n;

  try {
    vaultManagedBalance = await vault.getBalance();
  } catch (error) {
    console.log("⚠️  Warning: Could not fetch vault managed balance");
  }

  try {
    vaultUSDCBalance = await usdc.balanceOf(await vault.getAddress());
  } catch (error) {
    console.log("⚠️  Warning: Could not fetch vault USDC balance");
  }

  const vaultData = {
    "Managed Balance": `${formatUSDC(vaultManagedBalance)} USDC`,
    "Direct USDC Balance": `${formatUSDC(vaultUSDCBalance)} USDC`,
    Address: await vault.getAddress(),
  };

  console.log("\n=== VAULT STATUS ===");
  console.table(vaultData);

  // 3. Service Info
  let certSupply = 0n;
  try {
    certSupply = await certificate.totalSupply();
  } catch (error) {
    console.log("⚠️  Warning: Could not fetch certificate supply");
  }

  const bankData = {
    "Total Certificates": certSupply.toString(),
    "Saving Bank Address": await savingBank.getAddress(),
  };

  console.log("\n=== SAVING BANK STATUS ===");
  console.table(bankData);

  // 4. System Statistics
  try {
    const totalPlans = await savingBank.getTotalPlans();
    const totalDeposits = await savingBank.getTotalDeposits();
    const activeCount = await savingBank.getActiveDepositCount();

    const statsData = {
      "Total Plans": totalPlans.toString(),
      "Total Deposits": totalDeposits.toString(),
      "Active Deposits": activeCount.toString(),
      "Vault Balance": `${formatUSDC(vaultManagedBalance)} USDC`,
    };

    console.log("\n=== SYSTEM STATISTICS ===");
    console.table(statsData);
  } catch (e) {
    console.log("⚠️  Could not fetch system statistics");
  }

  // 5. Check Plan 1 (Example Default Plan)
  try {
    const plan = await savingBank.getSavingPlan(1);
    if (plan.isActive) {
      const planData = {
        Name: plan.name,
        APR: `${Number(plan.annualInterestRateInBasisPoints) / 100}%`,
        "Term Range": `${plan.minTermInDays} - ${plan.maxTermInDays} days`,
        "Deposit Range": `${formatUSDC(plan.minDepositAmount)} - ${formatUSDC(plan.maxDepositAmount)} USDC`,
      };
      console.log("\n=== DEFAULT SAVING PLAN (ID: 1) ===");
      console.table(planData);
    }
  } catch (e) {
    console.log("ℹ️  Note: No default saving plan (ID: 1) found");
  }
};
