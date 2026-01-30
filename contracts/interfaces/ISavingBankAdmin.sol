// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISavingBankStructs.sol";

interface ISavingBankAdmin is ISavingBankStructs {
    function createSavingPlan(SavingPlanInput calldata input) external;
    function updateSavingPlan(uint256 planId, SavingPlanInput calldata input) external;
    function updateSavingPlanStatus(uint256 planId, bool isEnabled) external;
    function updatePenaltyReceiver(uint256 planId, address newReceiver) external;
    function activateSavingPlan(uint256 planId) external;
    function deactivateSavingPlan(uint256 planId) external;
    function depositToVault(uint256 amount) external;
    function withdrawFromVault(uint256 amount) external;
    function pause() external;
    function unpause() external;
}
