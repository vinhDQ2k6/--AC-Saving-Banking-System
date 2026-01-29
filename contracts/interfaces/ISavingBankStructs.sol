// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankStructs {
    enum DepositStatus {
        Active,
        Withdrawn,
        Renewed
    }

    struct SavingPlan {
        uint256 id;
        string name;
        uint256 minDepositAmount;
        uint256 maxDepositAmount;
        uint32 minTermInDays;
        uint32 maxTermInDays;
        uint256 annualInterestRateInBasisPoints;
        uint256 penaltyRateInBasisPoints;
        bool isActive;
    }

    struct SavingPlanInput {
        string name;
        uint256 minDepositAmount;
        uint256 maxDepositAmount;
        uint32 minTermInDays;
        uint32 maxTermInDays;
        uint256 annualInterestRateInBasisPoints;
        uint256 penaltyRateInBasisPoints;
    }

    struct Deposit {
        uint256 id;
        address user;
        uint256 savingPlanId;
        uint256 amount;
        uint32 termInDays;
        uint256 expectedInterest;
        uint256 depositDate;
        uint256 maturityDate;
        DepositStatus status;
    }

    // Legacy support
    struct DepositRecord {
        uint256 depositId;
        address depositor;
        uint256 planId;
        uint256 principalAmount;
        uint64 depositTimestamp;
        uint64 maturityTimestamp;
        bool isClosed;
    }
}
