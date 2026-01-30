import * as readline from "readline";
import { stdin, stdout } from "process";

// Simple readline setup without duplication issues
let rl: readline.Interface;

const getReadlineInterface = () => {
    if (!rl) {
        rl = readline.createInterface({
            input: stdin,
            output: stdout,
            terminal: false
        });
    }
    return rl;
};

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        const rlInterface = getReadlineInterface();
        rlInterface.question(query, (answer) => {
            const cleaned = answer.trim();
            // Auto-fix duplicated single characters (buffer issue)
            if (cleaned.length > 1 && /^(.)\1+$/.test(cleaned)) {
                resolve(cleaned[0]);
            } else {
                resolve(cleaned);
            }
        });
    });
};

export const askInput = async (message: string): Promise<string> => {
    const answer = await question(`${message}: `);
    return answer;
};

export const askForConfirmation = async (message: string): Promise<boolean> => {
    const answer = await question(`${message} (y/N): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
};

export const askForAddress = async (message: string): Promise<string> => {
    let address = "";
    while (true) {
        address = await question(`${message}: `);
        if (address.length === 42 && address.startsWith("0x")) {
            return address;
        }
        console.log("Invalid Ethereum address format. Please try again.");
    }
};

export const askForAmount = async (message: string): Promise<string> => {
    let amount = "";
    while (true) {
        amount = await question(`${message}: `);
        if (!isNaN(Number(amount)) && Number(amount) > 0) {
            return amount;
        }
        console.log("Please enter a valid positive number.");
    }
};

export const pressAnyKey = async () => {
    await question("Press Enter to continue...");
};

export const closeReadline = () => {
    if (rl) {
        rl.close();
        rl = null as any;
    }
};
