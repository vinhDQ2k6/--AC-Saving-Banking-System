import { getContracts } from "../utils/contracts";
import { askForAddress, askForConfirmation, askInput } from "../utils/prompts";

/**
 * @title Role Management Functions
 * @notice Manage access control roles for SavingBank system
 * @dev Supports DEFAULT_ADMIN_ROLE, ADMIN_ROLE, PAUSER_ROLE, and Vault roles
 */

// Role definitions
const ROLES = {
  DEFAULT_ADMIN: {
    name: "DEFAULT_ADMIN_ROLE",
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    description: "Full system control, can grant/revoke all roles",
  },
  ADMIN: {
    name: "ADMIN_ROLE",
    hash: "", // Will be computed
    description: "Manage plans, vault operations",
  },
  PAUSER: {
    name: "PAUSER_ROLE",
    hash: "", // Will be computed
    description: "Emergency pause/unpause",
  },
};

const VAULT_ROLES = {
  LIQUIDITY_MANAGER: {
    name: "LIQUIDITY_MANAGER_ROLE",
    hash: "", // Will be computed
    description: "Manage vault liquidity",
  },
  WITHDRAW: {
    name: "WITHDRAW_ROLE",
    hash: "", // Will be computed
    description: "Withdraw from vault",
  },
};

export const grantRole = async () => {
  console.log("\n👑 GRANT ROLE");
  console.log("=".repeat(50));

  const { savingBank, vault, signer } = await getContracts();

  try {
    // Get role hashes
    ROLES.ADMIN.hash = await savingBank.ADMIN_ROLE();
    ROLES.PAUSER.hash = await savingBank.PAUSER_ROLE();

    try {
      VAULT_ROLES.LIQUIDITY_MANAGER.hash = await vault.LIQUIDITY_MANAGER_ROLE();
      VAULT_ROLES.WITHDRAW.hash = await vault.WITHDRAW_ROLE();
    } catch {
      console.log("⚠️  Note: Vault roles not accessible");
    }

    // Show available roles
    console.log("\n📋 Available Roles:");
    console.log("\n=== SavingBank Roles ===");
    console.log("1. DEFAULT_ADMIN_ROLE - Full control");
    console.log("2. ADMIN_ROLE - Business operations");
    console.log("3. PAUSER_ROLE - Emergency pause");
    console.log("\n=== Vault Roles ===");
    console.log("4. LIQUIDITY_MANAGER_ROLE - Manage vault funds");
    console.log("5. WITHDRAW_ROLE - Vault withdrawals");

    const roleChoice = await askInput("\nSelect role number (1-5)");

    let selectedRole: { name: string; hash: string; description: string; contract: any };

    switch (roleChoice.trim()) {
      case "1":
        selectedRole = { ...ROLES.DEFAULT_ADMIN, contract: savingBank };
        break;
      case "2":
        selectedRole = { ...ROLES.ADMIN, contract: savingBank };
        break;
      case "3":
        selectedRole = { ...ROLES.PAUSER, contract: savingBank };
        break;
      case "4":
        selectedRole = { ...VAULT_ROLES.LIQUIDITY_MANAGER, contract: vault };
        break;
      case "5":
        selectedRole = { ...VAULT_ROLES.WITHDRAW, contract: vault };
        break;
      default:
        console.log("❌ Invalid choice.");
        return;
    }

    const targetAddress = await askForAddress("Enter address to grant role");

    // Check if address already has role
    const hasRole = await selectedRole.contract.hasRole(selectedRole.hash, targetAddress);
    if (hasRole) {
      console.log(`\n⚠️  Address already has ${selectedRole.name}`);
      return;
    }

    console.log("\n📊 Grant Summary:");
    console.log(`   Role: ${selectedRole.name}`);
    console.log(`   Description: ${selectedRole.description}`);
    console.log(`   Target: ${targetAddress}`);
    console.log(`   Contract: ${selectedRole.contract === savingBank ? "SavingBank" : "Vault"}`);

    const confirm = await askForConfirmation("\nGrant this role?");
    if (!confirm) {
      console.log("❌ Cancelled.");
      return;
    }

    console.log("\n💳 Granting role...");
    const tx = await selectedRole.contract.grantRole(selectedRole.hash, targetAddress);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Role granted! Gas used: ${receipt?.gasUsed}`);
  } catch (error: any) {
    console.error("\n❌ Error granting role:", error.reason || error.message);
  }
};

export const revokeRole = async () => {
  console.log("\n🚫 REVOKE ROLE");
  console.log("=".repeat(50));

  const { savingBank, vault, signer } = await getContracts();

  try {
    // Get role hashes
    ROLES.ADMIN.hash = await savingBank.ADMIN_ROLE();
    ROLES.PAUSER.hash = await savingBank.PAUSER_ROLE();

    try {
      VAULT_ROLES.LIQUIDITY_MANAGER.hash = await vault.LIQUIDITY_MANAGER_ROLE();
      VAULT_ROLES.WITHDRAW.hash = await vault.WITHDRAW_ROLE();
    } catch {
      console.log("⚠️  Note: Vault roles not accessible");
    }

    // Show available roles
    console.log("\n📋 Available Roles:");
    console.log("\n=== SavingBank Roles ===");
    console.log("1. DEFAULT_ADMIN_ROLE - Full control");
    console.log("2. ADMIN_ROLE - Business operations");
    console.log("3. PAUSER_ROLE - Emergency pause");
    console.log("\n=== Vault Roles ===");
    console.log("4. LIQUIDITY_MANAGER_ROLE - Manage vault funds");
    console.log("5. WITHDRAW_ROLE - Vault withdrawals");

    const roleChoice = await askInput("\nSelect role number (1-5)");

    let selectedRole: { name: string; hash: string; description: string; contract: any };

    switch (roleChoice.trim()) {
      case "1":
        selectedRole = { ...ROLES.DEFAULT_ADMIN, contract: savingBank };
        break;
      case "2":
        selectedRole = { ...ROLES.ADMIN, contract: savingBank };
        break;
      case "3":
        selectedRole = { ...ROLES.PAUSER, contract: savingBank };
        break;
      case "4":
        selectedRole = { ...VAULT_ROLES.LIQUIDITY_MANAGER, contract: vault };
        break;
      case "5":
        selectedRole = { ...VAULT_ROLES.WITHDRAW, contract: vault };
        break;
      default:
        console.log("❌ Invalid choice.");
        return;
    }

    const targetAddress = await askForAddress("Enter address to revoke role from");

    // Check if address has role
    const hasRole = await selectedRole.contract.hasRole(selectedRole.hash, targetAddress);
    if (!hasRole) {
      console.log(`\n⚠️  Address does not have ${selectedRole.name}`);
      return;
    }

    console.log("\n⚠️  WARNING: Revoking roles can affect system operations!");
    console.log("\n📊 Revoke Summary:");
    console.log(`   Role: ${selectedRole.name}`);
    console.log(`   Target: ${targetAddress}`);
    console.log(`   Contract: ${selectedRole.contract === savingBank ? "SavingBank" : "Vault"}`);

    const confirm = await askForConfirmation("\nRevoke this role?");
    if (!confirm) {
      console.log("❌ Cancelled.");
      return;
    }

    console.log("\n💳 Revoking role...");
    const tx = await selectedRole.contract.revokeRole(selectedRole.hash, targetAddress);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Role revoked! Gas used: ${receipt?.gasUsed}`);
  } catch (error: any) {
    console.error("\n❌ Error revoking role:", error.reason || error.message);
  }
};

export const viewAllRoles = async () => {
  console.log("\n🔍 VIEW ROLE ASSIGNMENTS");
  console.log("=".repeat(50));

  const { savingBank, vault, signer } = await getContracts();
  const signerAddress = await signer.getAddress();

  try {
    // Get role hashes
    ROLES.ADMIN.hash = await savingBank.ADMIN_ROLE();
    ROLES.PAUSER.hash = await savingBank.PAUSER_ROLE();

    console.log("\n=== SAVING BANK ROLES ===");

    // Check DEFAULT_ADMIN_ROLE
    const hasDefaultAdmin = await savingBank.hasRole(ROLES.DEFAULT_ADMIN.hash, signerAddress);
    console.log(`\n👑 DEFAULT_ADMIN_ROLE:`);
    console.log(`   You: ${hasDefaultAdmin ? "✅ YES" : "❌ NO"}`);
    console.log(`   Description: ${ROLES.DEFAULT_ADMIN.description}`);

    // Check ADMIN_ROLE
    const hasAdmin = await savingBank.hasRole(ROLES.ADMIN.hash, signerAddress);
    console.log(`\n🔧 ADMIN_ROLE:`);
    console.log(`   You: ${hasAdmin ? "✅ YES" : "❌ NO"}`);
    console.log(`   Description: ${ROLES.ADMIN.description}`);

    // Check PAUSER_ROLE
    const hasPauser = await savingBank.hasRole(ROLES.PAUSER.hash, signerAddress);
    console.log(`\n⏸️  PAUSER_ROLE:`);
    console.log(`   You: ${hasPauser ? "✅ YES" : "❌ NO"}`);
    console.log(`   Description: ${ROLES.PAUSER.description}`);

    // Vault roles
    try {
      VAULT_ROLES.LIQUIDITY_MANAGER.hash = await vault.LIQUIDITY_MANAGER_ROLE();
      VAULT_ROLES.WITHDRAW.hash = await vault.WITHDRAW_ROLE();

      console.log("\n=== VAULT ROLES ===");

      const hasLiquidityManager = await vault.hasRole(VAULT_ROLES.LIQUIDITY_MANAGER.hash, signerAddress);
      console.log(`\n💰 LIQUIDITY_MANAGER_ROLE:`);
      console.log(`   You: ${hasLiquidityManager ? "✅ YES" : "❌ NO"}`);
      console.log(`   Description: ${VAULT_ROLES.LIQUIDITY_MANAGER.description}`);

      const hasWithdraw = await vault.hasRole(VAULT_ROLES.WITHDRAW.hash, signerAddress);
      console.log(`\n💸 WITHDRAW_ROLE:`);
      console.log(`   You: ${hasWithdraw ? "✅ YES" : "❌ NO"}`);
      console.log(`   Description: ${VAULT_ROLES.WITHDRAW.description}`);
    } catch (error) {
      console.log("\n⚠️  Vault role information not available");
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Your Address: ${signerAddress}`);
  } catch (error: any) {
    console.error("\n❌ Error viewing roles:", error.reason || error.message);
  }
};

export const checkAddressRoles = async () => {
  console.log("\n🔎 CHECK ADDRESS ROLES");
  console.log("=".repeat(50));

  const { savingBank, vault } = await getContracts();

  try {
    const targetAddress = await askForAddress("Enter address to check");

    // Get role hashes
    ROLES.ADMIN.hash = await savingBank.ADMIN_ROLE();
    ROLES.PAUSER.hash = await savingBank.PAUSER_ROLE();

    console.log(`\n=== ROLES FOR ${targetAddress} ===`);
    console.log("\n--- SavingBank ---");

    const hasDefaultAdmin = await savingBank.hasRole(ROLES.DEFAULT_ADMIN.hash, targetAddress);
    const hasAdmin = await savingBank.hasRole(ROLES.ADMIN.hash, targetAddress);
    const hasPauser = await savingBank.hasRole(ROLES.PAUSER.hash, targetAddress);

    console.log(`DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin ? "✅ YES" : "❌ NO"}`);
    console.log(`ADMIN_ROLE: ${hasAdmin ? "✅ YES" : "❌ NO"}`);
    console.log(`PAUSER_ROLE: ${hasPauser ? "✅ YES" : "❌ NO"}`);

    try {
      VAULT_ROLES.LIQUIDITY_MANAGER.hash = await vault.LIQUIDITY_MANAGER_ROLE();
      VAULT_ROLES.WITHDRAW.hash = await vault.WITHDRAW_ROLE();

      console.log("\n--- Vault ---");
      const hasLiquidityManager = await vault.hasRole(VAULT_ROLES.LIQUIDITY_MANAGER.hash, targetAddress);
      const hasWithdraw = await vault.hasRole(VAULT_ROLES.WITHDRAW.hash, targetAddress);

      console.log(`LIQUIDITY_MANAGER_ROLE: ${hasLiquidityManager ? "✅ YES" : "❌ NO"}`);
      console.log(`WITHDRAW_ROLE: ${hasWithdraw ? "✅ YES" : "❌ NO"}`);
    } catch {
      console.log("\n--- Vault ---");
      console.log("⚠️  Vault role information not available");
    }
  } catch (error: any) {
    console.error("\n❌ Error checking roles:", error.reason || error.message);
  }
};
