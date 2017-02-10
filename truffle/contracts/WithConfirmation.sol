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

    function getConfirmationOf(bytes32 key, address user)
        constant
        returns (bool confirmed) {
        return confirmations[key].confirmed[user];
    }

    function calculateKey(bytes data)
        constant
        returns (bytes32 key) {
        return sha3(data);
    }

    function confirm(bytes32 key)
        private
        returns (uint count) {
        if (confirmations[key].confirmed[msg.sender]) {
            throw;
        }
        confirmations[key].confirmed[msg.sender] = true;
        confirmations[key].count++;
        return confirmations[key].count;
    }

    function unconfirm(bytes32 key)
        internal
        returns (uint count) {
        if (!confirmations[key].confirmed[msg.sender]) {
            throw;
        }
        confirmations[key].confirmed[msg.sender] = false;
        confirmations[key].count--;
        return confirmations[key].count;
    }

    modifier isConfirmed {
        bytes32 key = calculateKey(msg.data);
        uint count = confirm(key);
        if (count < requiredCount) {
            if (count == 1) {
                // We notify only on first request
                OnConfirmationRequired(key);
            }
            // Do not enter into the rest of the function
            return;
        }
        // TODO improvement? delete confirmations[key];
        // Enter the rest of the function now
        _;
    }
}