import { getContracts } from "../utils/contracts";
import { parseUSDC, formatUSDC } from "../utils/format";
import { askForAmount, askForConfirmation } from "../utils/prompts";

export const viewVaultDetails = async () => {
    console.log("\n🏦 VAULT DETAILS");
    console.log("=".repeat(40));
    
    const { vault, usdc, signer } = await getContracts();
    
    try {
        const vaultAddress = await vault.getAddress();
        const vaultBalance = await vault.getBalance();
        const usdcBalance = await usdc.balanceOf(vaultAddress);
        const tokenAddress = await vault.getToken();
        const signerAddress = await signer.getAddress();
        const canSignerWithdraw = await vault.canWithdraw(signerAddress);
        
        console.log("\n=== VAULT STATUS ===");
        console.table({
            "Vault Address": vaultAddress,
            "Managed Balance": `${formatUSDC(vaultBalance)} USDC`,
            "Direct USDC Balance": `${formatUSDC(usdcBalance)} USDC`,
            "Token Address": tokenAddress,
            "Your Address": signerAddress,
            "Can You Withdraw?": canSignerWithdraw ? "✅ Yes" : "❌ No"
        });
        
    } catch (error: any) {
        console.error("\n❌ Error fetching vault:", error.reason || error.message);
    }
};

export const depositToVault = async () => {
    console.log("\n💰 DEPOSIT TO VAULT");
    console.log("=".repeat(40));
    
    const { savingBank, usdc, vault, signer } = await getContracts();
    
    try {
        const signerAddress = await signer.getAddress();
        const userBalance = await usdc.balanceOf(signerAddress);
        
        console.log(`\n   Your USDC Balance: ${formatUSDC(userBalance)} USDC`);
        
        const amountStr = await askForAmount("Enter amount to deposit to vault (USDC)");
        const amount = parseUSDC(amountStr);
        
        if (amount > userBalance) {
            console.log("❌ Insufficient USDC balance.");
            return;
        }
        
        console.log("\n📊 Deposit Summary:");
        console.log(`   Amount: ${formatUSDC(amount)} USDC`);
        console.log(`   From: ${signerAddress}`);
        console.log(`   To: Vault (${await vault.getAddress()})`);
        
        const confirm = await askForConfirmation("\nProceed with vault deposit?");
        if (!confirm) {
            console.log("❌ Cancelled.");
            return;
        }
        
        // Approve USDC first
        const savingBankAddress = await savingBank.getAddress();
        const allowance = await usdc.allowance(signerAddress, savingBankAddress);
        
        if (allowance < amount) {
            console.log("\n🔐 Approving USDC...");
            const approveTx = await usdc.approve(savingBankAddress, amount);
            console.log(`   Tx: ${approveTx.hash}`);
            await approveTx.wait();
            console.log("   ✅ Approved!");
        }
        
        // Deposit to vault via SavingBank
        console.log("\n💳 Depositing to vault...");
        const tx = await savingBank.depositToVault(amount);
        console.log(`   Tx: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Deposit complete! Gas used: ${receipt?.gasUsed}`);
        
        const newBalance = await vault.getBalance();
        console.log(`\n   New Vault Balance: ${formatUSDC(newBalance)} USDC`);
        
    } catch (error: any) {
        console.error("\n❌ Error depositing:", error.reason || error.message);
    }
};

export const withdrawFromVault = async () => {
    console.log("\n💸 WITHDRAW FROM VAULT (ADMIN)");
    console.log("=".repeat(40));
    
    const { savingBank, vault } = await getContracts();
    
    try {
        const vaultBalance = await vault.getBalance();
        console.log(`\n   Current Vault Balance: ${formatUSDC(vaultBalance)} USDC`);
        
        const amountStr = await askForAmount("Enter amount to withdraw (USDC)");
        const amount = parseUSDC(amountStr);
        
        if (amount > vaultBalance) {
            console.log("❌ Insufficient vault balance.");
            return;
        }
        
        console.log("\n⚠️  WARNING: This is an admin withdrawal!");
        console.log("   This operation should only be used for emergencies.");
        
        const confirm = await askForConfirmation("\nProceed with admin withdrawal?");
        if (!confirm) {
            console.log("❌ Cancelled.");
            return;
        }
        
        console.log("\n💳 Withdrawing from vault...");
        const tx = await savingBank.withdrawFromVault(amount);
        console.log(`   Tx: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Withdrawal complete! Gas used: ${receipt?.gasUsed}`);
        
        const newBalance = await vault.getBalance();
        console.log(`\n   New Vault Balance: ${formatUSDC(newBalance)} USDC`);
        
    } catch (error: any) {
        console.error("\n❌ Error withdrawing:", error.reason || error.message);
    }
};
