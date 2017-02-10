const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;

const web3 = {
	net: {
		getVersion: function() {
			return new Promise(function() {}
				)
		}
	},
	currentProvider: {}
};
const Registry = {
	setProvider: function() {},
	setNetwork: function() {}
};

require('../app/js/registry.js');

describe("basic calls", function() {
	console.log(registry);
	it("prepare called as expected", function() {
		// console.log(Registry);
		var spiedWeb3GetVersion = chai.spy(web3.net.getVersion);
		expect(spiedWeb3GetVersion).to.be.spy;
		registry.prepare(web3, Registry);
		expect(spiedWeb3GetVersion).to.have.been.called();
	});
});
