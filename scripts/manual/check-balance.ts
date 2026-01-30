import { getContracts } from "./utils/contracts";
import { formatUSDC, parseUSDC } from "./utils/format";
import { getTestWallet, isUsingTestWallet } from "./utils/test-wallet";

export const checkUSDCBalance = async (targetAddress?: string) => {
    console.log("\n💰 USDC BALANCE CHECK");
    console.log("=".repeat(40));
    
    try {
        const { usdc, signer, addresses } = await getContracts();
        
        // Determine which address to check
        let checkAddress = targetAddress;
        if (!checkAddress && isUsingTestWallet()) {
            checkAddress = getTestWallet()!;
        }
        if (!checkAddress) {
            checkAddress = await signer.getAddress();
        }
        
        const signerAddress = await signer.getAddress();
        const isTestMode = isUsingTestWallet() && !targetAddress;
        
        // Get USDC balance
        const balance = await usdc.balanceOf(checkAddress);
        
        // Get ETH balance for gas (only for signer)
        const ethBalance = await signer.provider!.getBalance(signerAddress);
        
        console.log("\n=== WALLET BALANCES ===");
        console.table({
            "Checking Address": checkAddress,
            "USDC Balance": `${formatUSDC(balance)} USDC`,
            "Your ETH (Gas)": `${(Number(ethBalance) / 1e18).toFixed(4)} ETH`,
            "USDC Contract": addresses.usdc,
            "Mode": isTestMode ? "🧪 Test Mode" : "👤 Your Wallet"
        });
        
        // Try to mint USDC if balance is 0 (only for signer)
        if (balance === 0n && checkAddress === signerAddress) {
            console.log("\n⚠️  You have 0 USDC!");
            try {
                console.log("🎁 Attempting to mint test USDC...");
                const tx = await usdc.mint(signerAddress, parseUSDC("1000"));
                console.log(`   Tx: ${tx.hash}`);
                await tx.wait();
                
                const newBalance = await usdc.balanceOf(signerAddress);
                console.log(`   ✅ Minted! New balance: ${formatUSDC(newBalance)} USDC`);
            } catch (mintError: any) {
                console.log("   ❌ Cannot mint USDC (not allowed or no mint function)");
                console.log("   Solution: Get USDC from faucet or contact admin");
            }
        }
        
        // Check gas
        if (Number(ethBalance) < 0.001 * 1e18) {
            console.log("\n⚠️  Low ETH balance! You may need more ETH for gas fees.");
        }
        
    } catch (error: any) {
        console.error("\n❌ Error:", error.reason || error.message);
    }
};

// For standalone usage
async function main() {
    await checkUSDCBalance();
}

if (require.main === module) {
    main().catch(console.error);
}