const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;
const Utils = require("./utils.js");
var Web3 = require('web3');
const web3 = new Web3();
Utils.promisify(web3);
var Registry;
require('../app/js/registry.js');

describe("basic calls", function() {
    var namesArray;
    var addressesArray;    

    beforeEach("prepare spies", function() {

        namesObj = {
            "0x0": [ web3.toHex("testName"), web3.toBigNumber(2), "somewhere1" ]
        };
        addressesObj = { "testName": "0x0" };

        web3.version.getNetworkPromise = chai.spy(() => new Promise(resolve => resolve("45")));
        web3.currentProvider = "currentProvider1";

        Registry = {
            setProvider: chai.spy(provider => {}),
            setNetwork: chai.spy(network => {}),
            deployed: chai.spy(() => Registry._deployed),
            _deployed: {
                infos: address => new Promise(resolve => resolve(namesObj[address])),
                addresses: name => new Promise(resolve => resolve(addressesObj[name])),
                LogNameChanged: chai.spy(() => Registry._filter),
                setInfo: {
                    sendTransaction: () => new Promise(resolve => resolve("txHash"))
                }
            },
            _filter: {
                watch: chai.spy(callback => {}),
                stopWatching: chai.spy(() => {})
            }
        };
    
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
            .then(() => registry.getInfoOf("0x0"))
            .then(function(info) {
                expect(info.name).to.equal("testName");
                expect(info.pointType).to.equal(2);
                expect(info.location).to.equal("somewhere1");
                expect(Registry.deployed).to.have.been.called.once();
            });
    });

    it("getAddressOf called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => registry.getAddressOf("testName"))
            .then(address => {
                expect(address).to.equal("0x0");
                expect(Registry.deployed).to.have.been.called.once();
            });
    });

    it("setNameTo called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => registry.setInfoTo("newName", "0x0"))
            .then(txHash => {
                expect(txHash).to.equal("txHash");
            });
    });

    it("listenToUpdates called sub-functions as expected", function() {
        registry.filter = null;
        registry.prepare(web3, Registry)
            .then(() => registry.listenToUpdates(() => {}))
            .then(() => {
                expect(Registry._deployed.LogNameChanged).to.have.been.called.once.with({}, {fromBlock: 0});
                expect(Registry.deployed).to.have.been.called.once();
                expect(Registry._filter.watch).to.have.been.called.once();
            });
    }); 

    it("stopListeningToUpdates called sub-functions as expected", function() {
        registry.filter = null;
        return registry.prepare(web3, Registry)
            .then(() => registry.listenToUpdates(() => {}))
            .then(() => registry.stopListeningToUpdates())
            .then(() => {
                expect(Registry._filter.stopWatching).to.have.been.called.once();
            });
    });

});
