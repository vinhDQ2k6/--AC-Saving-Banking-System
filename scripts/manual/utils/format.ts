import { formatUnits, parseUnits } from "ethers";

export const formatUSDC = (amount: bigint | number | string) => {
    return formatUnits(amount.toString(), 6);
}

export const parseUSDC = (amount: string) => {
    return parseUnits(amount, 6);
}

export const formatDate = (timestamp: bigint | number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

export const formatDuration = (seconds: bigint | number) => {
    const s = Number(seconds);
    const d = Math.floor(s / (3600 * 24));
    return `${d} days`;
}
