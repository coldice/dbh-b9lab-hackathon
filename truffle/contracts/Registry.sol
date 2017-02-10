pragma solidity ^0.4.5;

contract Registry {
	mapping (address => bytes32) names;
	mapping (bytes32 => address) addresses;

	event LogNameChanged(address indexed who, bytes32 indexed name);

	function setName(bytes32 name) returns (bool successful) {
		if (name != 0 // It is ok to set your name back to empty string
			&& addresses[name] != msg.sender) { // This name is given to someone else
			// Already taken
			throw;
		}
		names[msg.sender] = name;
		addresses[name] = msg.sender;
		LogNameChanged(msg.sender, name);
		return true;
	}
}
