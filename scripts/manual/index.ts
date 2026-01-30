import { viewSystemStatus } from "./view/view-system-status";
import { viewSavingPlans } from "./view/view-saving-plans";
import { viewUserDeposits } from "./view/view-user-deposits";
import { viewCertificateDetails, checkCertificateCooldown, viewAllCertificates } from "./view/view-certificate";
import { viewDepositDetails, calculatePenaltyPreview, checkDepositMaturity } from "./view/view-deposit-details";
import { viewMyRoles, viewAddressRoles, viewAllRoleHolders } from "./view/view-roles";
import { createDeposit } from "./user/create-deposit";
import { withdrawDeposit } from "./user/withdraw-deposit";
import { renewDeposit } from "./user/renew-deposit";
import { transferCertificate, viewMyCertificates } from "./user/transfer-certificate";
import { createSavingPlan, updateSavingPlan, updateSavingPlanStatus } from "./admin/manage-plans";
import { updatePenaltyReceiver, viewPenaltyReceivers } from "./admin/penalty-receiver";
import { grantRole, revokeRole, viewAllRoles, checkAddressRoles } from "./admin/role-management";
import { viewVaultDetails, depositToVault, withdrawFromVault } from "./admin/vault-operations";
import { pauseSystem, unpauseSystem, checkSystemStatus } from "./admin/emergency";
import { pressAnyKey, closeReadline, askInput, askForAddress } from "./utils/prompts";
import {
  setTestWallet,
  getTestWallet,
  clearTestWallet,
  isUsingTestWallet,
  toggleTestWallet,
} from "./utils/test-wallet";
import { checkUSDCBalance } from "./check-balance";

async function showMainMenu(): Promise<string> {
  console.log("\n" + "═".repeat(50));
  console.log("🏦  AC SAVING BANK - OPERATOR CONSOLE  🏦");
  console.log("═".repeat(50));

  const currentWallet = isUsingTestWallet() ? `🧪 Test: ${getTestWallet()?.substring(0, 8)}...` : "👤 Your Wallet";

  console.log(`Current Mode: ${currentWallet}`);
  console.log("\n--- MAIN MENU ---");
  console.log("1. 📊 View Operations");
  console.log("2. 👤 User Operations");
  console.log("3. 🔧 Admin Operations");
  console.log("4. 💰 Check USDC Balance");
  console.log("5. 🔄 Toggle Test Mode");
  console.log("6. 🏠 Use Your Wallet (Default)");
  console.log("7. ❌ Exit");

  return await askInput("\nSelect option (1-7): ");
}

async function showViewMenu(): Promise<string> {
  console.log("\n--- 📊 VIEW OPERATIONS ---");
  console.log("1. System Status (Vault, Bank, Stats)");
  console.log("2. All Saving Plans");
  console.log("3. My/Test User Deposits");
  console.log("4. Certificate Details");
  console.log("5. Deposit Details");
  console.log("6. My Roles & Permissions");
  console.log("7. Check Address Roles");
  console.log("8. All Certificates Overview");
  console.log("9. Calculate Penalty Preview");
  console.log("0. ← Back to Main Menu");

  return await askInput("\nSelect option: ");
}

async function showUserMenu(): Promise<string> {
  const mode = isUsingTestWallet() ? "Test User" : "Your";
  console.log(`\n--- 👤 USER OPERATIONS (${mode}) ---`);
  console.log("1. 💰 Create New Deposit");
  console.log("2. 💸 Withdraw Deposit");
  console.log("3. 🔄 Renew Deposit");
  console.log("4. 🔄 Transfer Certificate NFT");
  console.log("5. 📋 View My Deposits");
  console.log("6. 🎫 View My Certificates");
  console.log("0. ← Back to Main Menu");

  return await askInput("\nSelect option: ");
}

async function showAdminMenu(): Promise<string> {
  console.log("\n--- 🔧 ADMIN OPERATIONS ---");
  console.log("1. 📝 Create Saving Plan");
  console.log("2. ✏️  Update Saving Plan");
  console.log("3. 🔄 Activate/Deactivate Plan");
  console.log("4. 💸 Update Penalty Receiver");
  console.log("5. 👁️  View Penalty Receivers");
  console.log("6. 👑 Grant Role");
  console.log("7. 🚫 Revoke Role");
  console.log("8. 👥 View All Roles");
  console.log("9. 🏦 Vault Details");
  console.log("10. 💰 Deposit to Vault");
  console.log("11. 💸 Withdraw from Vault");
  console.log("12. 🔒 Security Status");
  console.log("13. ⏸️  Pause System");
  console.log("14. ▶️  Unpause System");
  console.log("0. ← Back to Main Menu");

  return await askInput("\nSelect option: ");
}

async function handleToggleTestMode() {
  console.log("\n🔄 TOGGLE TEST MODE");
  console.log("=".repeat(40));

  const { toggleTestWallet, isUsingTestWallet, getTestWallet } = require("./utils/test-wallet");

  const wasEnabled = isUsingTestWallet();
  const nowEnabled = toggleTestWallet();

  if (nowEnabled && !wasEnabled) {
    console.log(`✅ Test mode ENABLED`);
    console.log(`🧪 Using test wallet: ${getTestWallet()?.substring(0, 8)}...${getTestWallet()?.slice(-4)}`);
    console.log("Now you can test user operations as this address");
  } else if (!nowEnabled && wasEnabled) {
    console.log(`❌ Test mode DISABLED`);
    console.log(`👤 Back to using your wallet`);
  } else if (!nowEnabled && !wasEnabled) {
    console.log(`⚠️  No test wallet address found in .env file`);
    console.log(`Please add TEST_WALLET_ADDRESS to .env to enable test mode`);
  } else {
    console.log(`🔄 Test mode status: ${isUsingTestWallet() ? "ENABLED" : "DISABLED"}`);
  }
}

async function handleViewMenu() {
  while (true) {
    const choice = await showViewMenu();
    try {
      switch (choice.trim()) {
        case "1":
          await viewSystemStatus();
          await pressAnyKey();
          break;
        case "2":
          await viewSavingPlans();
          await pressAnyKey();
          break;
        case "3":
          await viewUserDeposits();
          await pressAnyKey();
          break;
        case "4":
          await viewCertificateDetails();
          await pressAnyKey();
          break;
        case "5":
          await viewDepositDetails();
          await pressAnyKey();
          break;
        case "6":
          await viewMyRoles();
          await pressAnyKey();
          break;
        case "7":
          await viewAddressRoles();
          await pressAnyKey();
          break;
        case "8":
          await viewAllCertificates();
          await pressAnyKey();
          break;
        case "9":
          await calculatePenaltyPreview();
          await pressAnyKey();
          break;
        case "0":
          return;
        default:
          console.log("Invalid option.");
      }
    } catch (error: any) {
      console.error("\n❌ Error:", error.reason || error.message);
      await pressAnyKey();
    }
  }
}

async function handleUserMenu() {
  while (true) {
    const choice = await showUserMenu();
    try {
      switch (choice.trim()) {
        case "1":
          await createDeposit();
          await pressAnyKey();
          break;
        case "2":
          await withdrawDeposit();
          await pressAnyKey();
          break;
        case "3":
          await renewDeposit();
          await pressAnyKey();
          break;
        case "4":
          await transferCertificate();
          await pressAnyKey();
          break;
        case "5":
          await viewUserDeposits();
          await pressAnyKey();
          break;
        case "6":
          await viewMyCertificates();
          await pressAnyKey();
          break;
        case "0":
          return;
        default:
          console.log("Invalid option.");
      }
    } catch (error: any) {
      console.error("\n❌ Error:", error.reason || error.message);
      await pressAnyKey();
    }
  }
}

async function handleAdminMenu() {
  while (true) {
    const choice = await showAdminMenu();
    try {
      switch (choice.trim()) {
        case "1":
          await createSavingPlan();
          await pressAnyKey();
          break;
        case "2":
          await updateSavingPlan();
          await pressAnyKey();
          break;
        case "3":
          await updateSavingPlanStatus();
          await pressAnyKey();
          break;
        case "4":
          await updatePenaltyReceiver();
          await pressAnyKey();
          break;
        case "5":
          await viewPenaltyReceivers();
          await pressAnyKey();
          break;
        case "6":
          await grantRole();
          await pressAnyKey();
          break;
        case "7":
          await revokeRole();
          await pressAnyKey();
          break;
        case "8":
          await viewAllRoles();
          await pressAnyKey();
          break;
        case "9":
          await viewVaultDetails();
          await pressAnyKey();
          break;
        case "10":
          await depositToVault();
          await pressAnyKey();
          break;
        case "11":
          await withdrawFromVault();
          await pressAnyKey();
          break;
        case "12":
          await checkSystemStatus();
          await pressAnyKey();
          break;
        case "13":
          await pauseSystem();
          await pressAnyKey();
          break;
        case "14":
          await unpauseSystem();
          await pressAnyKey();
          break;
        case "0":
          return;
        default:
          console.log("Invalid option.");
      }
    } catch (error: any) {
      console.error("\n❌ Error:", error.reason || error.message);
      await pressAnyKey();
    }
  }
}

async function main() {
  while (true) {
    const choice = await showMainMenu();

    try {
      switch (
        choice.trim() // Fix input buffer
      ) {
        case "1":
          await handleViewMenu();
          break;
        case "2":
          await handleUserMenu();
          break;
        case "3":
          await handleAdminMenu();
          break;
        case "4":
          await checkUSDCBalance();
          await pressAnyKey();
          break;
        case "5":
          await handleToggleTestMode();
          await pressAnyKey();
          break;
        case "6":
          clearTestWallet();
          console.log("✅ Switched back to your wallet");
          await pressAnyKey();
          break;
        case "7":
          console.log("\n👋 Goodbye!");
          closeReadline();
          process.exit(0);
        default:
          console.log("Invalid option. Please select 1-7.");
      }
    } catch (error: any) {
      console.error("\n❌ Error:", error.reason || error.message);
      await pressAnyKey();
    }
  }
}

main().catch((error) => {
  console.error(error);
  closeReadline();
  process.exit(1);
});
