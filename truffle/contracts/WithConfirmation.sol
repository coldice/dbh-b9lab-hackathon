pragma solidity ^0.4.5;

contract WithConfirmation {
    uint requiredCount;
    struct Confirmation {
        uint count;
        mapping (address => bool) confirmed;
    }
    mapping (bytes32 => Confirmation) public confirmations;

    event OnConfirmationRequired(bytes32 indexed key);
    
    function WithConfirmation(uint _requiredCount) {
        requiredCount = _requiredCount;
    }

    function calculateKey(bytes data)
        constant
        returns (bytes32 key) {
        return sha3(data);
    }

    modifier isConfirmed {
        bytes32 key = calculateKey(msg.data);
        if (!confirmations[key].confirmed[msg.sender]) {
            confirmations[key].confirmed[msg.sender] = true;
            confirmations[key].count++;
        }
        if (confirmations[key].count < requiredCount) {
            OnConfirmationRequired(key);
            // Do not enter into the rest of the function
            return;
        }
        delete confirmations[key];
        // Enter the rest of the function now
        _;
    }
}