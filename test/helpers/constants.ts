export const BASIS_POINTS = 10000n;
export const SECONDS_PER_DAY = 86400n;
export const SECONDS_PER_YEAR = 31536000n;

export const USDC_DECIMALS = 6;
export const ONE_USDC = 10n ** BigInt(USDC_DECIMALS);

export const DEFAULT_PLAN_INPUT = {
  tenorSeconds: 30n * SECONDS_PER_DAY,
  annualInterestRateBps: 800n,
  minimumDeposit: 100n * ONE_USDC,
  maximumDeposit: 0n,
  earlyWithdrawalPenaltyBps: 100n,
};
