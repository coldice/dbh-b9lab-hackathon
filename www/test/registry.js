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
                infos: chai.spy(address => new Promise(resolve => resolve(namesObj[address]))),
                addresses: chai.spy(name => new Promise(resolve => resolve(addressesObj[name]))),
                LogInfoChanged: chai.spy(() => Registry._filter),
                setInfo: {
                    sendTransaction: chai.spy(() => { 
                        return new Promise(resolve => resolve("txHash"));
                    })
                }
            },
            _filter: {
                watch: chai.spy(() => {}),
                stopWatching: chai.spy(() => {})
            }
        };
    
        expect(web3.version.getNetworkPromise).to.be.spy;
        expect(Registry.setProvider).to.be.spy;
        expect(Registry.setNetwork).to.be.spy;
        expect(Registry._filter.watch).to.be.spy;
        expect(Registry._filter.stopWatching).to.be.spy;
        expect(Registry._deployed.LogInfoChanged).to.be.spy;
        expect(Registry._deployed.setInfo.sendTransaction).to.be.spy;
    });

    it("prepare called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => {
                expect(web3.version.getNetworkPromise).to.have.been.called();
                expect(Registry.setProvider).to.have.been.called.with("currentProvider1");
                expect(Registry.setNetwork).to.have.been.called.with('45');
                expect(registry.web3).to.equal(web3);
        });
    });

    it("getInfoOf called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => registry.getInfoOf("0x0"))
            .then(function(info) {
                expect(info.name).to.equal("testName");
                expect(info.pointType).to.equal(2);
                expect(info.location).to.equal("somewhere1");
                expect(Registry.deployed).to.have.been.called.once();
                expect(Registry._deployed.infos).to.have.been.called.with("0x0");
            });
    });

    it("getAddressOf called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => registry.getAddressOf("testName"))
            .then(address => {
                expect(address).to.equal("0x0");
                expect(Registry.deployed).to.have.been.called.once();
                expect(Registry._deployed.addresses).to.have.been.called.with("testName");
            });
    });

    it("setNameTo called sub-functions as expected", function() {
        return registry.prepare(web3, Registry)
            .then(() => registry.setInfoTo({
                name: "newName",
                pointType: 2,
                location: "newLocation"
            }, "0x0"))
            .then(txHash => {
                expect(Registry.deployed).to.have.been.called.once();
                expect(Registry._deployed.setInfo.sendTransaction)
                    .to.have.been.called
                    .with("newName", 2, "newLocation", { from: '0x0', gas: 500000 });
                expect(txHash).to.equal("txHash");
            });
    });

    it("listenToUpdates called sub-functions as expected", function() {
        registry.filter = null;
        var error, value;
        var callback = chai.spy((_error, _value) => {
            error = _error;
            value = _value;
        });
        var innerCallback;
        Registry._filter.watch = chai.spy(_innerCallback => {
            innerCallback = _innerCallback;
        });
        return registry.prepare(web3, Registry)
            .then(() => registry.listenToUpdates(callback))
            .then(() => {
                expect(Registry.deployed).to.have.been.called.once();
                expect(Registry._deployed.LogInfoChanged)
                    .to.have.been.called.once.with({}, { fromBlock: 514639 });
                expect(Registry._filter.watch).to.have.been.called.once();
                innerCallback("error1");
                expect(callback).to.have.been.called.once();
                expect(error).to.equal("error1");
                expect(value).to.be.undefined;
                innerCallback(null, { args: {
                    name: web3.toHex("name1"),
                    pointType: web3.toBigNumber(2),
                    location: "location1"
                }});
                expect(callback).to.have.been.called.twice();
                expect(error).to.be.null;
                expect(value).to.deep.equal({ args: {
                    name: "name1",
                    pointType: 2,
                    location: "location1"
                }});
            });
    }); 

    it("stopListeningToUpdates called sub-functions as expected", function() {
        registry.filter = null;
        return registry.prepare(web3, Registry)
            .then(() => registry.listenToUpdates(() => {}))
            .then(() => registry.stopListeningToUpdates())
            .then(() => {
                expect(Registry._filter.stopWatching).to.have.been.called.once();
                expect(registry.filter).to.be.null;
            });
    });

});
