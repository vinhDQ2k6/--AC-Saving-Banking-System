// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title InterestCalculator
 * @dev Pure library for calculating interest and penalty amounts
 * @notice Provides simple interest and penalty calculations with basis points precision
 */
library InterestCalculator {
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10,000 basis points
    uint256 public constant DAYS_PER_YEAR = 365;

    /**
     * @dev Calculate simple interest for a given principal, rate, and term
     * @param principal The principal amount
     * @param annualRateInBasisPoints Annual interest rate in basis points (e.g., 500 = 5%)
     * @param termInDays The term duration in days
     * @return interest The calculated interest amount
     * @notice Uses formula: Interest = (Principal × Rate × Time) / (BASIS_POINTS × DAYS_PER_YEAR)
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
     * @dev Calculate penalty amount based on principal and penalty rate
     * @param principal The principal amount subject to penalty
     * @param penaltyRateInBasisPoints Penalty rate in basis points (e.g., 200 = 2%)
     * @return penalty The calculated penalty amount
     * @notice Uses formula: Penalty = (Principal × Penalty Rate) / BASIS_POINTS
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
     * @dev Calculate the maturity amount (principal + interest)
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
     * @dev Calculate effective annual rate from a term rate
     * @param termRateInBasisPoints The rate for the specific term in basis points
     * @param termInDays The term duration in days
     * @return annualRate The equivalent annual rate in basis points
     */
    function calculateEffectiveAnnualRate(
        uint256 termRateInBasisPoints,
        uint256 termInDays
    ) internal pure returns (uint256 annualRate) {
        require(termInDays > 0, "Term must be positive");
        
        annualRate = (termRateInBasisPoints * DAYS_PER_YEAR) / termInDays;
    }
}