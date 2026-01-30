import { getContracts } from "../utils/contracts";
import { askForConfirmation } from "../utils/prompts";

export const pauseSystem = async () => {
    console.log("\n⏸️  PAUSE SYSTEM");
    console.log("=".repeat(40));
    
    const { savingBank } = await getContracts();
    
    try {
        console.log("\n⚠️  WARNING: Pausing the system will:");
        console.log("   - Prevent new deposits");
        console.log("   - Prevent withdrawals");
        console.log("   - Prevent renewals");
        console.log("   - Only admin can unpause");
        
        const confirm = await askForConfirmation("\nAre you sure you want to PAUSE the system?");
        if (!confirm) {
            console.log("❌ Cancelled.");
            return;
        }
        
        console.log("\n⏸️  Pausing system...");
        const tx = await savingBank.pause();
        console.log(`   Tx: ${tx.hash}`);
        
        await tx.wait();
        console.log("   ✅ System is now PAUSED!");
        
    } catch (error: any) {
        if (error.message?.includes("EnforcedPause")) {
            console.log("⚠️  System is already paused.");
        } else {
            console.error("\n❌ Error pausing:", error.reason || error.message);
        }
    }
};

export const unpauseSystem = async () => {
    console.log("\n▶️  UNPAUSE SYSTEM");
    console.log("=".repeat(40));
    
    const { savingBank } = await getContracts();
    
    try {
        console.log("\nThis will re-enable all system operations.");
        
        const confirm = await askForConfirmation("Unpause the system?");
        if (!confirm) {
            console.log("❌ Cancelled.");
            return;
        }
        
        console.log("\n▶️  Unpausing system...");
        const tx = await savingBank.unpause();
        console.log(`   Tx: ${tx.hash}`);
        
        await tx.wait();
        console.log("   ✅ System is now ACTIVE!");
        
    } catch (error: any) {
        if (error.message?.includes("ExpectedPause")) {
            console.log("⚠️  System is not paused.");
        } else {
            console.error("\n❌ Error unpausing:", error.reason || error.message);
        }
    }
};

export const checkSystemStatus = async () => {
    console.log("\n🔒 SYSTEM SECURITY STATUS");
    console.log("=".repeat(40));
    
    const { savingBank, signer, addresses } = await getContracts();
    
    try {
        const signerAddress = await signer.getAddress();
        
        // Check admin role
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const isAdmin = await savingBank.hasRole(DEFAULT_ADMIN_ROLE, signerAddress);
        
        // Check paused status
        let isPaused = false;
        try {
            isPaused = await savingBank.paused();
        } catch {
            // Contract might not have paused() function exposed
        }
        
        console.log("\n=== SECURITY STATUS ===");
        console.table({
            "Your Address": signerAddress,
            "Is Admin?": isAdmin ? "✅ Yes" : "❌ No",
            "System Paused?": isPaused ? "⏸️ Yes" : "▶️ No",
            "SavingBank": addresses.savingBank,
            "Vault": addresses.vault
        });
        
        if (!isAdmin) {
            console.log("\n⚠️  You don't have admin privileges.");
            console.log("   Admin operations require the DEFAULT_ADMIN_ROLE.");
        }
        
    } catch (error: any) {
        console.error("\n❌ Error checking status:", error.reason || error.message);
    }
};
