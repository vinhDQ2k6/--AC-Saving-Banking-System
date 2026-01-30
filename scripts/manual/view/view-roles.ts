import { getContracts } from "../utils/contracts";
import { askForAddress } from "../utils/prompts";

/**
 * @title Role View Functions
 * @notice View role assignments across the system
 * @dev Displays SavingBank and Vault role assignments
 */

export const viewMyRoles = async () => {
  console.log("\n👤 MY ROLE ASSIGNMENTS");
  console.log("=".repeat(50));

  const { savingBank, vault, signer } = await getContracts();
  const myAddress = await signer.getAddress();

  try {
    console.log(`\n📍 Your Address: ${myAddress}`);

    // Get role hashes
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    const PAUSER_ROLE = await savingBank.PAUSER_ROLE();

    console.log("\n=== SAVING BANK ROLES ===");

    const hasDefaultAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, myAddress);
    const hasAdmin = await savingBank.hasRole(ADMIN_ROLE, myAddress);
    const hasPauser = await savingBank.hasRole(PAUSER_ROLE, myAddress);

    const roles = [
      { name: "DEFAULT_ADMIN_ROLE", has: hasDefaultAdmin, desc: "Full system control" },
      { name: "ADMIN_ROLE", has: hasAdmin, desc: "Manage plans & vault" },
      { name: "PAUSER_ROLE", has: hasPauser, desc: "Emergency pause" },
    ];

    for (const role of roles) {
      const status = role.has ? "✅ GRANTED" : "❌ NOT GRANTED";
      console.log(`\n${role.name}:`);
      console.log(`   Status: ${status}`);
      console.log(`   Purpose: ${role.desc}`);
    }

    // Vault roles
    try {
      const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
      const WITHDRAW_ROLE = await vault.WITHDRAW_ROLE();

      console.log("\n=== VAULT ROLES ===");

      const hasLiquidityManager = await vault.hasRole(LIQUIDITY_MANAGER_ROLE, myAddress);
      const hasWithdraw = await vault.hasRole(WITHDRAW_ROLE, myAddress);

      const vaultRoles = [
        { name: "LIQUIDITY_MANAGER_ROLE", has: hasLiquidityManager, desc: "Manage vault liquidity" },
        { name: "WITHDRAW_ROLE", has: hasWithdraw, desc: "Withdraw from vault" },
      ];

      for (const role of vaultRoles) {
        const status = role.has ? "✅ GRANTED" : "❌ NOT GRANTED";
        console.log(`\n${role.name}:`);
        console.log(`   Status: ${status}`);
        console.log(`   Purpose: ${role.desc}`);
      }
    } catch {
      console.log("\n=== VAULT ROLES ===");
      console.log("⚠️  Vault role information not available");
    }

    // Summary
    const totalRoles = roles.filter((r) => r.has).length;
    console.log("\n" + "=".repeat(50));
    console.log(`Total Roles Granted: ${totalRoles}`);

    if (totalRoles === 0) {
      console.log("\n⚠️  You don't have any administrative roles.");
      console.log("   Contact an administrator to grant you permissions.");
    }
  } catch (error: any) {
    console.error("\n❌ Error viewing roles:", error.reason || error.message);
  }
};

export const viewAddressRoles = async () => {
  console.log("\n🔍 CHECK ADDRESS ROLES");
  console.log("=".repeat(50));

  const { savingBank, vault } = await getContracts();

  try {
    const targetAddress = await askForAddress("Enter address to check");

    console.log(`\n📍 Checking roles for: ${targetAddress}`);

    // Get role hashes
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    const PAUSER_ROLE = await savingBank.PAUSER_ROLE();

    console.log("\n=== SAVING BANK ROLES ===");

    const hasDefaultAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, targetAddress);
    const hasAdmin = await savingBank.hasRole(ADMIN_ROLE, targetAddress);
    const hasPauser = await savingBank.hasRole(PAUSER_ROLE, targetAddress);

    console.log(`DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin ? "✅ GRANTED" : "❌ NOT GRANTED"}`);
    console.log(`ADMIN_ROLE: ${hasAdmin ? "✅ GRANTED" : "❌ NOT GRANTED"}`);
    console.log(`PAUSER_ROLE: ${hasPauser ? "✅ GRANTED" : "❌ NOT GRANTED"}`);

    try {
      const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
      const WITHDRAW_ROLE = await vault.WITHDRAW_ROLE();

      console.log("\n=== VAULT ROLES ===");

      const hasLiquidityManager = await vault.hasRole(LIQUIDITY_MANAGER_ROLE, targetAddress);
      const hasWithdraw = await vault.hasRole(WITHDRAW_ROLE, targetAddress);

      console.log(`LIQUIDITY_MANAGER_ROLE: ${hasLiquidityManager ? "✅ GRANTED" : "❌ NOT GRANTED"}`);
      console.log(`WITHDRAW_ROLE: ${hasWithdraw ? "✅ GRANTED" : "❌ NOT GRANTED"}`);
    } catch {
      console.log("\n=== VAULT ROLES ===");
      console.log("⚠️  Vault role information not available");
    }
  } catch (error: any) {
    console.error("\n❌ Error checking roles:", error.reason || error.message);
  }
};

export const viewAllRoleHolders = async () => {
  console.log("\n👥 SYSTEM ROLE HOLDERS");
  console.log("=".repeat(50));

  const { savingBank, vault, signer } = await getContracts();

  try {
    console.log("\n⚠️  Note: This view shows YOUR role status.");
    console.log("   To check other addresses, use 'Check Address Roles'.");

    const myAddress = await signer.getAddress();
    console.log(`\n📍 Your Address: ${myAddress}`);

    // Get role hashes
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const ADMIN_ROLE = await savingBank.ADMIN_ROLE();
    const PAUSER_ROLE = await savingBank.PAUSER_ROLE();

    console.log("\n=== SAVING BANK ACCESS CONTROL ===");

    const roleData = [];

    const hasDefaultAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, myAddress);
    roleData.push({
      Role: "DEFAULT_ADMIN_ROLE",
      "You Have It": hasDefaultAdmin ? "✅ Yes" : "❌ No",
      Permissions: "Full control, grant/revoke roles",
    });

    const hasAdmin = await savingBank.hasRole(ADMIN_ROLE, myAddress);
    roleData.push({
      Role: "ADMIN_ROLE",
      "You Have It": hasAdmin ? "✅ Yes" : "❌ No",
      Permissions: "Manage plans, vault operations",
    });

    const hasPauser = await savingBank.hasRole(PAUSER_ROLE, myAddress);
    roleData.push({
      Role: "PAUSER_ROLE",
      "You Have It": hasPauser ? "✅ Yes" : "❌ No",
      Permissions: "Emergency pause/unpause",
    });

    console.table(roleData);

    // Vault roles
    try {
      const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
      const WITHDRAW_ROLE = await vault.WITHDRAW_ROLE();

      console.log("\n=== VAULT ACCESS CONTROL ===");

      const vaultRoleData = [];

      const hasLiquidityManager = await vault.hasRole(LIQUIDITY_MANAGER_ROLE, myAddress);
      vaultRoleData.push({
        Role: "LIQUIDITY_MANAGER_ROLE",
        "You Have It": hasLiquidityManager ? "✅ Yes" : "❌ No",
        Permissions: "Deposit to vault",
      });

      const hasWithdraw = await vault.hasRole(WITHDRAW_ROLE, myAddress);
      vaultRoleData.push({
        Role: "WITHDRAW_ROLE",
        "You Have It": hasWithdraw ? "✅ Yes" : "❌ No",
        Permissions: "Withdraw from vault",
      });

      console.table(vaultRoleData);
    } catch {
      console.log("\n=== VAULT ACCESS CONTROL ===");
      console.log("⚠️  Vault role information not available");
    }

    console.log("\n💡 Tips:");
    console.log("   - Use 'Grant Role' in Admin menu to assign roles");
    console.log("   - Use 'Revoke Role' in Admin menu to remove roles");
    console.log("   - DEFAULT_ADMIN_ROLE can manage all other roles");
  } catch (error: any) {
    console.error("\n❌ Error viewing role holders:", error.reason || error.message);
  }
};
