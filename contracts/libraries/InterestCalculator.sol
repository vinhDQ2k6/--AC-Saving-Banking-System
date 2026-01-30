// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title InterestCalculator
 * @author Saving Banking Team
 * @notice Pure library for calculating interest and penalty amounts
 * @dev All functions are internal pure - no state changes, deterministic results
 * 
 * Formula Reference:
 * - Simple Interest: Interest = (Principal × Rate × Time) / (BASIS_POINTS × DAYS_PER_YEAR)
 * - Penalty: Penalty = (Principal × PenaltyRate) / BASIS_POINTS
 * 
 * Precision:
 * - Uses basis points (1 bp = 0.01%) for rates to avoid floating point
 * - All calculations round down (floor) for protocol safety
 * - Supports up to type(uint256).max without overflow for typical use cases
 * 
 * Example:
 * - 1000 USDC at 8% APR for 30 days:
 *   Interest = (1000 × 800 × 30) / (10000 × 365) = 6.575 USDC
 */
library InterestCalculator {
    /// @notice Basis points constant: 10000 bp = 100%
    /// @dev Used for percentage calculations (1 bp = 0.01%)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Days per year constant for annualized rate calculations
    uint256 public constant DAYS_PER_YEAR = 365;

    /**
     * @notice Calculates simple interest for a given principal, rate, and term
     * @dev Uses formula: Interest = (Principal × Rate × Time) / (BASIS_POINTS × DAYS_PER_YEAR)
     * @param principal The principal amount (e.g., deposit amount in token units)
     * @param annualRateInBasisPoints Annual interest rate in basis points (e.g., 800 = 8%)
     * @param termInDays The term duration in days (e.g., 30, 90, 365)
     * @return interest The calculated interest amount (rounded down)
     * 
     * Example:
     * - principal: 1000000000 (1000 USDC with 6 decimals)
     * - annualRateInBasisPoints: 800 (8% APR)
     * - termInDays: 30
     * - Result: 6575342 (~6.58 USDC)
     */
    function calculateSimpleInterest(
        uint256 principal,
        uint256 annualRateInBasisPoints,
        uint256 termInDays
    ) internal pure returns (uint256 interest) {
        require(principal > 0, "Principal must be positive");
        require(annualRateInBasisPoints > 0, "Rate must be positive");
        require(termInDays > 0, "Term must be positive");

        interest = (principal * annualRateInBasisPoints * termInDays) / 
                  (BASIS_POINTS * DAYS_PER_YEAR);
    }

    /**
     * @notice Calculates penalty amount for early withdrawal
     * @dev Uses formula: Penalty = (Principal × PenaltyRate) / BASIS_POINTS
     * @param principal The principal amount subject to penalty
     * @param penaltyRateInBasisPoints Penalty rate in basis points (e.g., 100 = 1%)
     * @return penalty The calculated penalty amount (rounded down)
     * 
     * Example:
     * - principal: 1000000000 (1000 USDC)
     * - penaltyRateInBasisPoints: 100 (1%)
     * - Result: 10000000 (10 USDC)
     */
    function calculatePenalty(
        uint256 principal,
        uint256 penaltyRateInBasisPoints
    ) internal pure returns (uint256 penalty) {
        require(principal > 0, "Principal must be positive");
        require(penaltyRateInBasisPoints <= BASIS_POINTS, "Penalty rate cannot exceed 100%");

        penalty = (principal * penaltyRateInBasisPoints) / BASIS_POINTS;
    }

    /**
     * @notice Calculates the total maturity amount (principal + interest)
     * @dev Combines principal with calculated simple interest
     * @param principal The principal amount
     * @param annualRateInBasisPoints Annual interest rate in basis points
     * @param termInDays The term duration in days
     * @return maturityAmount The total amount at maturity (principal + interest)
     */
    function calculateMaturityAmount(
        uint256 principal,
        uint256 annualRateInBasisPoints,
        uint256 termInDays
    ) internal pure returns (uint256 maturityAmount) {
        uint256 interest = calculateSimpleInterest(principal, annualRateInBasisPoints, termInDays);
        maturityAmount = principal + interest;
    }

    /**
     * @notice Converts a term-specific rate to equivalent annual rate
     * @dev Uses formula: AnnualRate = (TermRate × DAYS_PER_YEAR) / TermInDays
     * @param termRateInBasisPoints The rate for the specific term in basis points
     * @param termInDays The term duration in days
     * @return annualRate The equivalent annual rate in basis points
     * 
     * Example:
     * - If 30-day rate is 0.65% (65 bp), annual equivalent = (65 × 365) / 30 = 791 bp ≈ 7.91%
     */
    function calculateEffectiveAnnualRate(
        uint256 termRateInBasisPoints,
        uint256 termInDays
    ) internal pure returns (uint256 annualRate) {
        require(termInDays > 0, "Term must be positive");
        
        annualRate = (termRateInBasisPoints * DAYS_PER_YEAR) / termInDays;
    }
}