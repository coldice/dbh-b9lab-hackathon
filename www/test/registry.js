const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;
var web3, Registry;
require('../app/js/registry.js');


describe("basic calls", function() {
    var namesArray;
    var addressesArray;    

    beforeEach("prepare spies", function() {

        namesObj = {"0x0": "testName"};
        addressesObj = {"testName": "0x0"};

        web3 = {
            version: {
                getNetworkPromise: () => new Promise(resolve => resolve("45"))
            },
            currentProvider: "currentProvider1"
        };
        Registry = {
            setProvider: function(provider) {},
            setNetwork: function(network) {},
            deployed: function() {
                return Registry._deployed;
            },
            _deployed: {
                names: function(address) {
                    return new Promise(function (resolve, reject) {
                        return resolve(namesObj[address]);
                    });
                },
                addresses: function(name) {
                    var addressesArray = {"testName" : "0x0"};
                    return new Promise(function (resolve, reject) {
                        return resolve(addressesObj[name]);
                        });
                },
                LogNameChanged: function(byWhat, json) {
                    return Registry._filter;
                },
                setName: {
                    sendTransaction: function(newName, json) {
                        return new Promise(function (resolve, reject) {
                            return resolve("txHash");
                        });
                    }
                }
            },
            _filter: {
                watch: function(callback) {},
                stopWatching: function() {}
            }
        };
    
    
        web3.version.getNetworkPromise = chai.spy(web3.version.getNetworkPromise);
        Registry.setProvider = chai.spy(Registry.setProvider);
        Registry.setNetwork = chai.spy(Registry.setNetwork);
        Registry.deployed = chai.spy(Registry.deployed);
        Registry._filter.watch = chai.spy(Registry._filter.watch);
        Registry._filter.stopWatching = chai.spy(Registry._filter.stopWatching);
        Registry._deployed.LogNameChanged = chai.spy(Registry._deployed.LogNameChanged); 
        expect(web3.version.getNetworkPromise).to.be.spy;
        expect(Registry.setProvider).to.be.spy;
        expect(Registry.setNetwork).to.be.spy;
        expect(Registry._filter.watch).to.be.spy;
        expect(Registry._filter.stopWatching).to.be.spy;
        expect(Registry._deployed.LogNameChanged).to.be.spy;
    });

    it("prepare called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => {
                expect(web3.version.getNetworkPromise).to.have.been.called();
                expect(Registry.setProvider).to.have.been.called.with("currentProvider1");
                expect(Registry.setNetwork).to.have.been.called.with('45');
        });
    });

    it("getNameOf called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => {return registry.getNameOf("0x0")})
            .then(function(name) {
                expect(name).to.equal("testName");
                expect(Registry.deployed).to.have.been.called.once;
            });
    });

    it("getAddressOf called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => {return registry.getAddressOf("testName")})
            .then(function(address) {
                expect(address).to.equal("0x0");
                expect(Registry.deployed).to.have.been.called.once();
            });
    });

    it("setNameTo called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => {return registry.setNameTo("newName", "0x0")})
            .then(function(txHash) {
                expect(txHash).to.equal("txHash");
            });
    });

    it("listenToUpdates called sub-functions as expected", function() {
        registry.prepare(web3, Registry)
            .then(() => {return registry.listenToUpdates(() => {}, {} )})
            .then(() => {
                expect(Registry._deployed.LogNameChanged).to.have.been.called.once.with({}, {fromBlock: 0});
                expect(Registry.deployed).to.have.been.called.once();
                expect(Registry._filter.watch).to.have.been.called.once();
            });
    }); 

    it("stopListeningToUpdates called sub-functions as expected", function() {
        registry.filter = null;
        return registry.prepare(web3, Registry)
            .then(() => {return registry.listenToUpdates(() => {}, {} )})
            .then(() => {return registry.stopListeningToUpdates()})
            .then(() => {
                expect(Registry._filter.stopWatching).to.have.been.called.once();
            });
    });


});
