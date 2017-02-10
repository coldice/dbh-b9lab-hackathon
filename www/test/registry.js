const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const compiled = require('../../truffle/build/contracts/Registry.sol.js');
const script = require('../app/js/registry.js');

