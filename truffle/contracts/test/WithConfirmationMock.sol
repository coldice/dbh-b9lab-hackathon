pragma solidity ^0.4.5;

import "../WithConfirmation.sol";

contract WithConfirmationMock is WithConfirmation {
	bytes32 public info;

	function WithConfirmationMock(uint _requiredCount)
		WithConfirmation(_requiredCount) {
	}

	function setInfo(bytes32 _info) 
		isConfirmed {
		info = _info;
	}
}