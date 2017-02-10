const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;
var web3, Registry;
require('../app/js/registry.js');


describe("basic calls", function() {

    

    beforeEach("prepare spies", function() {
        web3 = {
            version: {
                getNetworkPromise: () => {
                    return new Promise(function (resolve, reject) {
                        return resolve("45")
                    });
                },
            },
            currentProvider: "currentProvider1"
        };
        Registry = {
            setProvider: function(provider) {},
            setNetwork: function(network) {
                console.log(network);
                console.log(typeof network);
            },
            deployed: function() {
            	return {names: function(name) {
            		var namesArray = {"0x0": "testName"};
            		return new Promise(function (resolve, reject) {
            			return resolve(namesArray[name]);
            		});
            	}
           		};	
            }
        }
    
        web3.version.getNetworkPromise = chai.spy(web3.version.getNetworkPromise);
        Registry.setProvider = chai.spy(Registry.setProvider);
        Registry.setNetwork = chai.spy(Registry.setNetwork);
        Registry.deployed = chai.spy(Registry.deployed);
        expect(web3.version.getNetworkPromise).to.be.spy;
        expect(Registry.setProvider).to.be.spy;
        expect(Registry.setNetwork).to.be.spy;
    });

    it("prepare called sub-functions as expected", function() {
        registry.prepare(web3, Registry)
            .then(() => {});
        expect(web3.version.getNetworkPromise).to.have.been.called();
        expect(Registry.setProvider).to.have.been.called.with("currentProvider1");
        expect(Registry.setNetwork).to.have.been.called.with('45'); // This one does not pass
    });

    it("getNameOf called sub-functions as expected", function() {
    	registry.prepare(web3, Registry)
    		.then(() => {});
    	registry.getNameOf("0x0")
    	.then(function(name) {
    		expect(name).to.equal("testName");
    	});
    	expect(Registry.deployed).to.have.been.called.once;
    });

    it("getAdressOf called sub-functions as expected", function() {

    });

    it("setNametTo called sub-functions as expected", function() {
    });

    it("listenToUpdates called sub-functions as expected", function() {
    });

    it("stopListeningToUpdates called sub-functions as expected", function() {
	});


});
