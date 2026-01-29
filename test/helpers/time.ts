import { time } from "@nomicfoundation/hardhat-network-helpers";

export async function advanceTimeByDays(days: number): Promise<void> {
  await time.increase(days * 24 * 60 * 60);
}

export async function advanceTimeBySeconds(seconds: number): Promise<void> {
  await time.increase(seconds);
}

export async function advanceToTimestamp(timestamp: bigint): Promise<void> {
  await time.increaseTo(timestamp);
}

export async function getCurrentTimestamp(): Promise<bigint> {
  return BigInt(await time.latest());
}
