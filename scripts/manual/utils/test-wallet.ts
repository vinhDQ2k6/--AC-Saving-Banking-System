// Test Wallet Management System
// Allows testing user operations with different addresses while paying gas from main wallet

import dotenv from "dotenv";
dotenv.config();

let testWalletAddress: string | null = null;
let testWalletEnabled = false;

// Auto-load from .env if available, but don't auto-enable by default  
if (process.env.TEST_WALLET_ADDRESS) {
    testWalletAddress = process.env.TEST_WALLET_ADDRESS;
    testWalletEnabled = false; // Don't auto-enable, let user toggle
    console.log(`🧪 Test wallet available: ${testWalletAddress?.substring(0, 8)}...${testWalletAddress?.slice(-4)} (Toggle to enable)`);
}

export const setTestWallet = (address: string) => {
    testWalletAddress = address;
    testWalletEnabled = true;
};

export const getTestWallet = (): string | null => {
    return testWalletEnabled ? testWalletAddress : null;
};

export const clearTestWallet = () => {
    testWalletEnabled = false;
};

export const isUsingTestWallet = (): boolean => {
    return testWalletEnabled && testWalletAddress !== null;
};

/**
 * Toggle test wallet mode on/off
 */
export const toggleTestWallet = () => {
    if (isUsingTestWallet()) {
        clearTestWallet();
        return false; // Now disabled
    } else {
        // Re-enable from .env
        if (testWalletAddress) {
            testWalletEnabled = true;
            return true; // Now enabled
        }
        return false; // No address in .env
    }
};

/**
 * Get the display name for current wallet mode
 */
export const getWalletDisplayMode = (): string => {
    if (isUsingTestWallet()) {
        return `🧪 Test Wallet (${testWalletAddress?.substring(0, 8)}...${testWalletAddress?.slice(-4)})`;
    } else {
        return "👤 Your Wallet";
    }
};