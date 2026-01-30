import { getContracts } from "../utils/contracts";
import { askForAddress, askForConfirmation, askInput } from "../utils/prompts";
import { formatUSDC, formatDate } from "../utils/format";

/**
 * @title Certificate Transfer Operations
 * @notice Transfer deposit certificate NFTs to another address
 * @dev Includes 24-hour cooldown security feature
 */

export const transferCertificate = async () => {
  console.log("\n🔄 TRANSFER CERTIFICATE NFT");
  console.log("=".repeat(50));

  const { savingBank, certificate, signer } = await getContracts();
  const userAddress = await signer.getAddress();

  try {
    // Get user's deposits
    console.log("\n📋 Your Deposit Certificates:");

    const depositIds: bigint[] = await savingBank.getUserDepositIds(userAddress);

    if (depositIds.length === 0) {
      console.log("⚠️  No deposits found.");
      return;
    }

    const ownedCerts: any[] = [];

    for (const id of depositIds) {
      try {
        // Check if user still owns the certificate
        const owner = await certificate.ownerOf(id);
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          const deposit = await savingBank.getDeposit(id);
          const plan = await savingBank.getSavingPlan(deposit.savingPlanId);

          // Check cooldown status
          const isInCooldown = await certificate.isInCooldown(id);
          const cooldownLabel = isInCooldown ? "🔒 Locked (Cooldown)" : "✅ Transferable";

          ownedCerts.push({
            id: id,
            deposit: deposit,
            plan: plan,
            isInCooldown: isInCooldown,
          });

          console.log(`  [${id}] ${plan.name} - ${formatUSDC(deposit.amount)} USDC (${cooldownLabel})`);
        }
      } catch {
        // Certificate doesn't exist or not owned
      }
    }

    if (ownedCerts.length === 0) {
      console.log("⚠️  No certificates available for transfer.");
      console.log("   You may have already transferred all your certificates.");
      return;
    }

    // Select certificate to transfer
    const depositIdStr = await askInput("\nEnter Deposit ID to transfer");
    const depositId = parseInt(depositIdStr);

    const selected = ownedCerts.find((c) => Number(c.id) === depositId);
    if (!selected) {
      console.log("❌ Invalid deposit ID or you don't own this certificate.");
      return;
    }

    // Check cooldown
    if (selected.isInCooldown) {
      const remainingCooldown = await certificate.getRemainingCooldown(depositId);
      const hours = Math.floor(Number(remainingCooldown) / 3600);
      const minutes = Math.floor((Number(remainingCooldown) % 3600) / 60);

      console.log("\n⚠️  This certificate is in cooldown period!");
      console.log(`   Remaining time: ${hours}h ${minutes}m`);
      console.log("   You cannot transfer it until cooldown expires.");
      return;
    }

    // Get recipient address
    const recipientAddress = await askForAddress("\nEnter recipient address");

    if (recipientAddress.toLowerCase() === userAddress.toLowerCase()) {
      console.log("❌ Cannot transfer to yourself.");
      return;
    }

    // Show transfer details
    const now = Math.floor(Date.now() / 1000);
    const isMatured = now >= Number(selected.deposit.maturityDate);

    console.log("\n📊 Transfer Details:");
    console.log(`   Certificate ID: ${depositId}`);
    console.log(`   Plan: ${selected.plan.name}`);
    console.log(`   Principal: ${formatUSDC(selected.deposit.amount)} USDC`);
    console.log(`   Expected Interest: ${formatUSDC(selected.deposit.expectedInterest)} USDC`);
    console.log(`   Maturity Date: ${formatDate(selected.deposit.maturityDate)}`);
    console.log(`   Status: ${isMatured ? "✅ Matured" : "⏳ Active"}`);
    console.log(`\n   From: ${userAddress}`);
    console.log(`   To: ${recipientAddress}`);

    console.log("\n⚠️  IMPORTANT SECURITY NOTICES:");
    console.log("   1. The recipient will have FULL CONTROL over this deposit");
    console.log("   2. They can withdraw or renew it");
    console.log("   3. After transfer, a 24-hour cooldown will activate");
    console.log("   4. During cooldown, the recipient CANNOT withdraw/renew");
    console.log("   5. You will LOSE access to this deposit permanently");

    const confirm = await askForConfirmation("\nAre you sure you want to transfer this certificate?");
    if (!confirm) {
      console.log("❌ Transfer cancelled.");
      return;
    }

    // Double confirmation for security
    const doubleConfirm = await askForConfirmation("This action is IRREVERSIBLE. Confirm transfer?");
    if (!doubleConfirm) {
      console.log("❌ Transfer cancelled.");
      return;
    }

    // Execute transfer
    console.log("\n💳 Transferring certificate...");
    const tx = await certificate.transferFrom(userAddress, recipientAddress, depositId);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Certificate transferred! Gas used: ${receipt?.gasUsed}`);

    console.log("\n🎉 SUCCESS! Certificate transferred to new owner.");
    console.log(`\n⏰ 24-hour cooldown activated for recipient.`);
    console.log(`   New owner can withdraw/renew after cooldown expires.`);
  } catch (error: any) {
    console.error("\n❌ Error transferring certificate:", error.reason || error.message);
  }
};

export const viewMyCertificates = async () => {
  console.log("\n🎫 MY CERTIFICATE NFTs");
  console.log("=".repeat(50));

  const { savingBank, certificate, signer } = await getContracts();
  const userAddress = await signer.getAddress();

  try {
    console.log(`\n📊 Checking certificates for: ${userAddress}`);

    const depositIds: bigint[] = await savingBank.getUserDepositIds(userAddress);

    if (depositIds.length === 0) {
      console.log("⚠️  No deposit records found.");
      return;
    }

    const certificates: any[] = [];

    for (const id of depositIds) {
      try {
        const owner = await certificate.ownerOf(id);
        const isOwned = owner.toLowerCase() === userAddress.toLowerCase();
        const isInCooldown = await certificate.isInCooldown(id);

        const deposit = await savingBank.getDeposit(id);
        const plan = await savingBank.getSavingPlan(deposit.savingPlanId);

        let status = "";
        if (!isOwned) {
          status = "❌ Transferred";
        } else if (isInCooldown) {
          const remaining = await certificate.getRemainingCooldown(id);
          const hours = Math.floor(Number(remaining) / 3600);
          status = `🔒 Cooldown (${hours}h)`;
        } else {
          status = "✅ Ready";
        }

        certificates.push({
          ID: Number(id),
          Plan: plan.name,
          Amount: `${formatUSDC(deposit.amount)} USDC`,
          Owner: isOwned ? "You" : `${owner.substring(0, 8)}...`,
          Status: status,
        });
      } catch {
        // Certificate doesn't exist
      }
    }

    if (certificates.length === 0) {
      console.log("⚠️  No certificates found.");
      return;
    }

    console.log("\n=== YOUR CERTIFICATES ===");
    console.table(certificates);

    console.log("\nℹ️  Legend:");
    console.log("   ✅ Ready - Can be transferred/withdrawn/renewed");
    console.log("   🔒 Cooldown - Recently received, wait for cooldown");
    console.log("   ❌ Transferred - You no longer own this certificate");
  } catch (error: any) {
    console.error("\n❌ Error viewing certificates:", error.reason || error.message);
  }
};
