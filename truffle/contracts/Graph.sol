pragma solidity ^0.4.5;

import "WithConfirmation.sol";

contract Graph is WithConfirmation {
    struct Link {
        uint loss; // The unit is such that 1% is encoded as 1000
        uint throughput; // The unit is microWatt.
    }
    
    /**
     * from => to => info associated
     */
    mapping (address => mapping(address => Link)) public directedLinks;
    
    event LogLinkAdded(
        address indexed from,
        address indexed to,
        uint loss,
        uint throughput);

    function Graph()
        WithConfirmation(2) {
    }

    modifier yourLinkOnly(address from, address to) {
        // Checking for dummy values first
        if (from == 0 || to == 0 || !isYourLink(from, to) || from == to) {
            throw;
        }
        _;
    }

    function isYourLink(address from, address to)
        constant
        returns (bool isIndeed) {
        return msg.sender == from
            || msg.sender == to;
    }

    function submitLink(address from, address to, uint loss, uint throughput)
        yourLinkOnly(from, to)
        isConfirmed
        returns (bool successful) {
        directedLinks[from][to] = Link({
            loss: loss,
            throughput: throughput
        });
        LogLinkAdded(from, to, loss, throughput);
        return true;
    }
}