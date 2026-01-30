import { getContracts } from "../utils/contracts";
import { askInput } from "../utils/prompts";
import { formatUSDC, formatDate } from "../utils/format";

/**
 * @title Certificate View Functions
 * @notice View detailed information about deposit certificate NFTs
 * @dev Includes owner, cooldown status, and transfer history
 */

export const viewCertificateDetails = async () => {
  console.log("\n🎫 CERTIFICATE DETAILS");
  console.log("=".repeat(50));

  const { savingBank, certificate } = await getContracts();

  try {
    const depositIdStr = await askInput("Enter Deposit/Certificate ID");
    const depositId = parseInt(depositIdStr);

    // Check if certificate exists
    let owner: string;
    try {
      owner = await certificate.ownerOf(depositId);
    } catch {
      console.log("❌ Certificate does not exist.");
      return;
    }

    // Get deposit details
    const deposit = await savingBank.getDeposit(depositId);
    const plan = await savingBank.getSavingPlan(deposit.savingPlanId);

    // Check cooldown status
    const isInCooldown = await certificate.isInCooldown(depositId);
    const lastTransferTime = await certificate.getLastTransferTime(depositId);
    const remainingCooldown = isInCooldown ? await certificate.getRemainingCooldown(depositId) : 0n;

    // Calculate maturity status
    const now = Math.floor(Date.now() / 1000);
    const isMatured = now >= Number(deposit.maturityDate);

    console.log("\n=== CERTIFICATE INFORMATION ===");
    console.log(`Certificate ID: ${depositId}`);
    console.log(`Current Owner: ${owner}`);
    console.log(`Original Depositor: ${deposit.user}`);
    console.log(`Ownership Changed: ${owner.toLowerCase() !== deposit.user.toLowerCase() ? "✅ Yes" : "❌ No"}`);

    console.log("\n=== DEPOSIT DETAILS ===");
    console.log(`Plan: ${plan.name}`);
    console.log(`Principal Amount: ${formatUSDC(deposit.amount)} USDC`);
    console.log(`Expected Interest: ${formatUSDC(deposit.expectedInterest)} USDC`);
    console.log(`Total at Maturity: ${formatUSDC(BigInt(deposit.amount) + BigInt(deposit.expectedInterest))} USDC`);
    console.log(`Term: ${deposit.termInDays} days`);
    console.log(`Deposit Date: ${formatDate(deposit.depositDate)}`);
    console.log(`Maturity Date: ${formatDate(deposit.maturityDate)}`);
    console.log(`Status: ${isMatured ? "✅ Matured" : "⏳ Active"}`);

    console.log("\n=== TRANSFER & SECURITY ===");
    if (Number(lastTransferTime) === 0) {
      console.log(`Transfer History: ❌ Never transferred (Original owner)`);
    } else {
      console.log(`Last Transfer: ${formatDate(lastTransferTime)}`);
    }

    if (isInCooldown) {
      const hours = Math.floor(Number(remainingCooldown) / 3600);
      const minutes = Math.floor((Number(remainingCooldown) % 3600) / 60);
      const seconds = Number(remainingCooldown) % 60;

      console.log(`Cooldown Status: 🔒 ACTIVE`);
      console.log(`Remaining Time: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`Can Withdraw/Renew: ❌ NO (wait for cooldown)`);
      console.log(`Can Transfer: ❌ NO (in cooldown)`);
    } else {
      console.log(`Cooldown Status: ✅ Not in cooldown`);
      console.log(`Can Withdraw/Renew: ✅ YES (if you're the owner)`);
      console.log(`Can Transfer: ✅ YES (if you're the owner)`);
    }

    console.log("\n=== DEPOSIT STATUS ===");
    const depositStatus = ["🟢 Active", "🔴 Withdrawn", "🔄 Renewed"];
    console.log(`Deposit Status: ${depositStatus[Number(deposit.status)] || "Unknown"}`);

    if (Number(deposit.status) === 0) {
      // Active deposit
      if (isMatured) {
        console.log(`Action Available: Withdraw (get full amount + interest) or Renew`);
      } else {
        const penalty = await savingBank.calculateEarlyWithdrawalPenalty(depositId);
        console.log(`Early Withdrawal Penalty: ${formatUSDC(penalty)} USDC`);
        console.log(`You would receive: ${formatUSDC(BigInt(deposit.amount) - penalty)} USDC`);
      }
    }
  } catch (error: any) {
    console.error("\n❌ Error viewing certificate:", error.reason || error.message);
  }
};

export const checkCertificateCooldown = async () => {
  console.log("\n⏰ CHECK CERTIFICATE COOLDOWN");
  console.log("=".repeat(50));

  const { certificate } = await getContracts();

  try {
    const depositIdStr = await askInput("Enter Certificate ID");
    const depositId = parseInt(depositIdStr);

    // Check if certificate exists
    try {
      await certificate.ownerOf(depositId);
    } catch {
      console.log("❌ Certificate does not exist.");
      return;
    }

    const isInCooldown = await certificate.isInCooldown(depositId);
    const lastTransferTime = await certificate.getLastTransferTime(depositId);

    console.log(`\n=== COOLDOWN STATUS FOR CERTIFICATE #${depositId} ===`);

    if (Number(lastTransferTime) === 0) {
      console.log(`\n✅ This certificate has never been transferred.`);
      console.log(`   Status: No cooldown (original owner)`);
      return;
    }

    console.log(`\nLast Transfer Time: ${formatDate(lastTransferTime)}`);

    if (isInCooldown) {
      const remainingCooldown = await certificate.getRemainingCooldown(depositId);
      const hours = Math.floor(Number(remainingCooldown) / 3600);
      const minutes = Math.floor((Number(remainingCooldown) % 3600) / 60);
      const seconds = Number(remainingCooldown) % 60;

      console.log(`\n🔒 COOLDOWN ACTIVE`);
      console.log(`   Time Remaining: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`   Cooldown Expires: ${formatDate(Number(lastTransferTime) + 24 * 3600)}`);
      console.log(`\n   ⚠️  During cooldown, the owner CANNOT:`);
      console.log(`      - Withdraw the deposit`);
      console.log(`      - Renew the deposit`);
      console.log(`      - Transfer the certificate again`);
    } else {
      console.log(`\n✅ COOLDOWN EXPIRED`);
      console.log(`   The owner can now:`);
      console.log(`      - Withdraw the deposit`);
      console.log(`      - Renew the deposit`);
      console.log(`      - Transfer the certificate`);
    }
  } catch (error: any) {
    console.error("\n❌ Error checking cooldown:", error.reason || error.message);
  }
};

export const viewAllCertificates = async () => {
  console.log("\n📊 ALL CERTIFICATES OVERVIEW");
  console.log("=".repeat(50));

  const { savingBank, certificate } = await getContracts();

  try {
    const totalSupply = await certificate.totalSupply();

    console.log(`\n📈 Total Certificates Issued: ${totalSupply}`);

    if (totalSupply === 0n) {
      console.log("⚠️  No certificates have been issued yet.");
      return;
    }

    console.log("\n📋 Certificate List:");

    const certs: any[] = [];

    // Get total deposits from SavingBank
    const totalDeposits = await savingBank.getTotalDeposits();

    for (let i = 1; i <= Number(totalDeposits); i++) {
      try {
        const owner = await certificate.ownerOf(i);
        const deposit = await savingBank.getDeposit(i);
        const plan = await savingBank.getSavingPlan(deposit.savingPlanId);
        const isInCooldown = await certificate.isInCooldown(i);

        const statusLabels = ["🟢 Active", "🔴 Withdrawn", "🔄 Renewed"];
        const cooldownStatus = isInCooldown ? "🔒 Yes" : "✅ No";

        certs.push({
          ID: i,
          Plan: plan.name,
          Amount: `${formatUSDC(deposit.amount)} USDC`,
          Owner: `${owner.substring(0, 8)}...${owner.slice(-4)}`,
          Cooldown: cooldownStatus,
          Status: statusLabels[Number(deposit.status)],
        });
      } catch {
        // Certificate might have been burned or doesn't exist
      }
    }

    if (certs.length === 0) {
      console.log("⚠️  No active certificates found.");
      return;
    }

    console.table(certs);

    console.log("\nℹ️  Summary:");
    console.log(`   Total Certificates: ${certs.length}`);
    console.log(`   In Cooldown: ${certs.filter((c) => c.Cooldown === "🔒 Yes").length}`);
    console.log(`   Active Deposits: ${certs.filter((c) => c.Status === "🟢 Active").length}`);
  } catch (error: any) {
    console.error("\n❌ Error viewing certificates:", error.reason || error.message);
  }
};
