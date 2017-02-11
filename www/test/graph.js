const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;
const Utils = require("./utils.js");
var Web3 = require('web3');
const web3 = new Web3();
Utils.promisify(web3);

require('../app/js/graph.js');
require('../app/js/registry.js');

describe("understand spies", function() {

    it("reports correctly when called with it", function() {
        var spy1 = chai.spy(() => 12);
        spy1(1);
        expect(spy1).to.have.been.called.with(1);
    });

    it("reports correctly when called and passing variable", function() {
        var spy1 = chai.spy(() => 12);
        var spy2 = chai.spy(() => spy1(2));
        spy2(1);
        expect(spy2).to.have.been.called.with(1);
        expect(spy1).to.have.been.called.with(2);
    });

    it("reports correctly when called with a promise", function() {
        var spy1 = chai.spy((valueIn) => new Promise((resolve, reject) => resolve(valueIn + 1)));
        var spy2 = chai.spy(valueIn => valueIn + 1);
        var lastValue;
        return spy1(1)
            .then(value => spy2(value))
            .then(value => lastValue = value)
            .then(() => {
                expect(spy1).to.have.been.called.with(1);
                expect(spy2).to.have.been.called.with(2);
                expect(lastValue).to.equal(3);
            });
    });

});

describe("basic calls", function() {

    var Graph, Registry;

    beforeEach("prepare spies", function() {
        web3.version.getNetworkPromise = chai.spy(() => new Promise(resolve => resolve("45")));
        web3.currentProvider = "currentProvider1";
        Graph = {
            setProvider: chai.spy(provider => {}),
            setNetwork: chai.spy(network => {}),
            _deployed:{
                directedLinks: chai.spy(() => {}),
                submitLink: {
                    sendTransaction: chai.spy(() => new Promise((resolve) => resolve("txHash1")))
                },
                _OnConfirmationRequired: {
                    watch: chai.spy(() => {}),
                    stopWatching: chai.spy(() => {})
                },
                OnConfirmationRequired: chai.spy(() => Graph._deployed._OnConfirmationRequired),
                _LogLinkAdded: {
                    watch: chai.spy(() => {}),
                    stopWatching: chai.spy(() => {})
                },
                LogLinkAdded: chai.spy(() => Graph._deployed._LogLinkAdded)
            },
            deployed: chai.spy(() => {
                return Graph._deployed;
            })
        };

        namesObj = {
            "0x0": [ web3.toHex("testName"), web3.toBigNumber(2), "somewhere1" ]
        };
        addressesObj = { "testName": "0x0" };
        Registry = {
            deployed: chai.spy(() => Registry._deployed),
            _deployed: {
                infos: chai.spy(address => new Promise(resolve => resolve(namesObj[address]))),
                addresses: chai.spy(name => new Promise(resolve => resolve(addressesObj[name])))
            }
        };
    });

    it("prepare called sub-functions as expected", function() {
        graph.prepare(web3, Graph);
        expect(graph.web3).to.equal(web3);
        expect(graph.graphContract).to.equal(Graph);
    });

    describe("and is already prepared", function() {

        beforeEach("prepare", function() {
            graph.prepare(web3, Graph);
            registry.prepare(web3, Registry);
        })

        it("getLinkInfo called subfunctions as expected", function() {
            // return graph.getLinkInfo("0x01", "0x02")
            //     .then(info => {
            //         expect(Graph.deployed).to.have.been.called.once();
            //         expect(Registry.deployed).to.have.been.called.once();
                    // TODO test more... :(
                // })
        });

        it("submitLink called sub-functions as expected", function() {
            return graph.submitLink({
                    from: "from1",
                    to: "to1",
                    loss: "loss1",
                    throughput: "throughput1"
                }, "0x0001020304")
                .then(() => {
                    expect(Graph.deployed).to.have.been.called.once();
                    expect(Graph._deployed.submitLink.sendTransaction)
                        .to.have.been.called.with( 
                            "from1", "to1", "loss1", "throughput1",
                            { from: "0x0001020304", gas: 1000000 });
                });
        });

        it("listenToUpdates called sub-functions if filters null", function() {
            graph.filterConfirmationRequired = null;
            graph.filterLinkAdded = null;
            var callbackConfirmationRequired = "callbackConfirmationRequired1";
            var callbackLinkAdded = "callbackLinkAdded1";

            graph.listenToUpdates(callbackConfirmationRequired, callbackLinkAdded);        
    
            expect(Graph.deployed).to.have.been.called.twice();
            expect(Graph._deployed.OnConfirmationRequired).to.have.been.called.with({}, { fromBlock: 0 });
            expect(Graph._deployed._OnConfirmationRequired.watch)
                .to.have.been.called.with(callbackConfirmationRequired);
            expect(Graph._deployed.LogLinkAdded).to.have.been.called.with({}, { fromBlock: 0 });
            expect(Graph._deployed._LogLinkAdded.watch)
                .to.have.been.called.once();
        });

        it("listenToUpdates called some sub-functions if not null", function() {
            graph.filterConfirmationRequired = Graph._deployed._OnConfirmationRequired;
            graph.filterLinkAdded = Graph._deployed._LogLinkAdded;
            var callbackConfirmationRequired = "callbackConfirmationRequired1";
            var callbackLinkAdded = "callbackLinkAdded1";

            graph.listenToUpdates(callbackConfirmationRequired, callbackLinkAdded);        
    
            expect(Graph.deployed).to.have.been.called.exactly(0);
            expect(Graph._deployed.OnConfirmationRequired).to.have.been.called.exactly(0);
            expect(Graph._deployed._OnConfirmationRequired.watch)
                .to.have.been.called.with(callbackConfirmationRequired);
            expect(Graph._deployed.LogLinkAdded).to.have.been.called.exactly(0);
            expect(Graph._deployed._LogLinkAdded.watch)
                .to.have.been.called.once();
        });

        it("stopListeningToUpdates called subfunctions and nullified", function() {
            graph.filterConfirmationRequired = Graph._deployed._OnConfirmationRequired;
            graph.filterLinkAdded = Graph._deployed._LogLinkAdded;

            graph.stopListeningToUpdates();

            expect(Graph._deployed._OnConfirmationRequired.stopWatching)
                .to.have.been.called();
            expect(graph.filterConfirmationRequired).to.be.a('null');
            expect(Graph._deployed._LogLinkAdded.stopWatching)
                .to.have.been.called();
            expect(graph.filterLinkAdded).to.be.a('null');
        });

        it("stopListeningToUpdates called subfunctions already null", function() {
            graph.filterConfirmationRequired = null;
            graph.filterLinkAdded = null;

            graph.stopListeningToUpdates();

            expect(Graph._deployed._OnConfirmationRequired.stopWatching)
                .to.have.been.called.exactly(0);
            expect(graph.filterConfirmationRequired).to.be.a('null');
            expect(Graph._deployed._LogLinkAdded.stopWatching)
                .to.have.been.called.exactly(0);
            expect(graph.filterLinkAdded).to.be.a('null');
        });

    });

});