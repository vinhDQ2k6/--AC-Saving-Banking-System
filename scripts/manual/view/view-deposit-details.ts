import { getContracts } from "../utils/contracts";
import { askInput } from "../utils/prompts";
import { formatUSDC, formatDate } from "../utils/format";

/**
 * @title Deposit Details View Functions
 * @notice View comprehensive deposit information including penalties
 * @dev Provides calculations for early withdrawal scenarios
 */

export const viewDepositDetails = async () => {
  console.log("\n📋 DEPOSIT DETAILS");
  console.log("=".repeat(50));

  const { savingBank, certificate } = await getContracts();

  try {
    const depositIdStr = await askInput("Enter Deposit ID");
    const depositId = parseInt(depositIdStr);

    // Get deposit
    const deposit = await savingBank.getDeposit(depositId);
    const plan = await savingBank.getSavingPlan(deposit.savingPlanId);

    // Get certificate owner
    let owner: string;
    try {
      owner = await certificate.ownerOf(depositId);
    } catch {
      owner = "Certificate burned/not exists";
    }

    // Calculate status
    const now = Math.floor(Date.now() / 1000);
    const isMatured = now >= Number(deposit.maturityDate);
    const daysRemaining = Math.ceil((Number(deposit.maturityDate) - now) / 86400);

    console.log("\n=== BASIC INFORMATION ===");
    console.log(`Deposit ID: ${depositId}`);
    console.log(`Original Depositor: ${deposit.user}`);
    console.log(`Current Certificate Owner: ${owner}`);
    console.log(`Saving Plan: ${plan.name}`);

    console.log("\n=== FINANCIAL DETAILS ===");
    console.log(`Principal Amount: ${formatUSDC(deposit.amount)} USDC`);
    console.log(`Expected Interest: ${formatUSDC(deposit.expectedInterest)} USDC`);
    console.log(`Total at Maturity: ${formatUSDC(BigInt(deposit.amount) + BigInt(deposit.expectedInterest))} USDC`);
    console.log(`Annual Interest Rate: ${Number(plan.annualInterestRateInBasisPoints) / 100}%`);

    console.log("\n=== TIME INFORMATION ===");
    console.log(`Term: ${deposit.termInDays} days`);
    console.log(`Deposit Date: ${formatDate(deposit.depositDate)}`);
    console.log(`Maturity Date: ${formatDate(deposit.maturityDate)}`);
    console.log(`Current Status: ${isMatured ? "✅ MATURED" : `⏳ ${daysRemaining} days remaining`}`);

    const statusLabels = ["🟢 Active", "🔴 Withdrawn", "🔄 Renewed"];
    console.log(`Deposit Status: ${statusLabels[Number(deposit.status)]}`);

    // Early withdrawal calculation
    if (Number(deposit.status) === 0) {
      // Active
      console.log("\n=== WITHDRAWAL OPTIONS ===");

      if (isMatured) {
        console.log(`\n✅ MATURED - Full Withdrawal Available:`);
        console.log(
          `   You will receive: ${formatUSDC(BigInt(deposit.amount) + BigInt(deposit.expectedInterest))} USDC`
        );
        console.log(
          `   Breakdown: ${formatUSDC(deposit.amount)} principal + ${formatUSDC(deposit.expectedInterest)} interest`
        );
        console.log(`   No penalty applies.`);
      } else {
        const penalty = await savingBank.calculateEarlyWithdrawalPenalty(depositId);
        const netAmount = BigInt(deposit.amount) - penalty;

        console.log(`\n⚠️  EARLY WITHDRAWAL (Before Maturity):`);
        console.log(`   Principal: ${formatUSDC(deposit.amount)} USDC`);
        console.log(`   Penalty Rate: ${Number(plan.penaltyRateInBasisPoints) / 100}%`);
        console.log(`   Penalty Amount: ${formatUSDC(penalty)} USDC`);
        console.log(`   You will receive: ${formatUSDC(netAmount)} USDC`);
        console.log(`   Lost interest: ${formatUSDC(deposit.expectedInterest)} USDC`);
        console.log(`   Total loss: ${formatUSDC(penalty + BigInt(deposit.expectedInterest))} USDC`);

        // Show penalty receiver
        const penaltyReceiver = await savingBank.getPenaltyReceiver(deposit.savingPlanId);
        if (penaltyReceiver === "0x0000000000000000000000000000000000000000") {
          console.log(`   Penalty destination: Remains in vault`);
        } else {
          console.log(`   Penalty destination: ${penaltyReceiver.substring(0, 10)}...`);
        }
      }

      console.log(`\n💡 Comparison:`);
      console.log(`   Wait until maturity: +${formatUSDC(deposit.expectedInterest)} USDC`);
      if (!isMatured) {
        const earlyLoss = await savingBank.calculateEarlyWithdrawalPenalty(depositId);
        console.log(`   Withdraw now: -${formatUSDC(earlyLoss)} USDC (penalty only)`);
      }
    }
  } catch (error: any) {
    console.error("\n❌ Error viewing deposit:", error.reason || error.message);
  }
};

export const calculatePenaltyPreview = async () => {
  console.log("\n💸 EARLY WITHDRAWAL PENALTY CALCULATOR");
  console.log("=".repeat(50));

  const { savingBank } = await getContracts();

  try {
    const depositIdStr = await askInput("Enter Deposit ID");
    const depositId = parseInt(depositIdStr);

    const deposit = await savingBank.getDeposit(depositId);
    const plan = await savingBank.getSavingPlan(deposit.savingPlanId);

    // Check if matured
    const isMatured = await savingBank.isDepositMature(depositId);

    if (isMatured) {
      console.log("\n✅ This deposit has MATURED.");
      console.log(`   No penalty applies.`);
      console.log(`   You will receive: ${formatUSDC(BigInt(deposit.amount) + BigInt(deposit.expectedInterest))} USDC`);
      return;
    }

    // Calculate penalty
    const penalty = await savingBank.calculateEarlyWithdrawalPenalty(depositId);
    const netAmount = BigInt(deposit.amount) - penalty;
    const lostInterest = deposit.expectedInterest;
    const totalLoss = penalty + BigInt(lostInterest);

    console.log("\n=== EARLY WITHDRAWAL PENALTY BREAKDOWN ===");
    console.log(`\nPrincipal Amount: ${formatUSDC(deposit.amount)} USDC`);
    console.log(`Penalty Rate: ${Number(plan.penaltyRateInBasisPoints) / 100}%`);
    console.log(`\n--- IF YOU WITHDRAW NOW ---`);
    console.log(`Penalty: -${formatUSDC(penalty)} USDC`);
    console.log(`You receive: ${formatUSDC(netAmount)} USDC`);
    console.log(`Lost expected interest: -${formatUSDC(lostInterest)} USDC`);
    console.log(`\n--- TOTAL IMPACT ---`);
    console.log(`Total loss vs maturity: ${formatUSDC(totalLoss)} USDC`);
    console.log(`Return rate: ${((Number(netAmount) / Number(deposit.amount)) * 100).toFixed(2)}%`);

    console.log(`\n--- IF YOU WAIT UNTIL MATURITY ---`);
    console.log(`You will receive: ${formatUSDC(BigInt(deposit.amount) + BigInt(lostInterest))} USDC`);
    console.log(`Profit: +${formatUSDC(lostInterest)} USDC`);

    console.log(`\n💡 Recommendation: ${totalLoss > 0n ? "⏳ Wait for maturity" : "Either option works"}`);
  } catch (error: any) {
    console.error("\n❌ Error calculating penalty:", error.reason || error.message);
  }
};

export const checkDepositMaturity = async () => {
  console.log("\n⏰ CHECK DEPOSIT MATURITY");
  console.log("=".repeat(50));

  const { savingBank } = await getContracts();

  try {
    const depositIdStr = await askInput("Enter Deposit ID");
    const depositId = parseInt(depositIdStr);

    const deposit = await savingBank.getDeposit(depositId);
    const isMatured = await savingBank.isDepositMature(depositId);

    const now = Math.floor(Date.now() / 1000);
    const maturityTimestamp = Number(deposit.maturityDate);

    console.log(`\n=== MATURITY STATUS FOR DEPOSIT #${depositId} ===`);
    console.log(`\nMaturity Date: ${formatDate(deposit.maturityDate)}`);
    console.log(`Current Time: ${formatDate(now)}`);

    if (isMatured) {
      const daysSinceMaturity = Math.floor((now - maturityTimestamp) / 86400);
      console.log(`\n✅ MATURED`);
      console.log(`   Matured ${daysSinceMaturity} day(s) ago`);
      console.log(`\n   Available actions:`);
      console.log(`   - Withdraw: Get ${formatUSDC(BigInt(deposit.amount) + BigInt(deposit.expectedInterest))} USDC`);
      console.log(`   - Renew: Start new term with compounded amount`);
    } else {
      const secondsRemaining = maturityTimestamp - now;
      const daysRemaining = Math.floor(secondsRemaining / 86400);
      const hoursRemaining = Math.floor((secondsRemaining % 86400) / 3600);

      console.log(`\n⏳ NOT MATURED YET`);
      console.log(`   Time remaining: ${daysRemaining} days ${hoursRemaining} hours`);
      console.log(`\n   Current options:`);
      console.log(`   - Early withdrawal: Penalty applies`);
      console.log(`   - Wait: Receive full amount + interest`);
    }
  } catch (error: any) {
    console.error("\n❌ Error checking maturity:", error.reason || error.message);
  }
};
