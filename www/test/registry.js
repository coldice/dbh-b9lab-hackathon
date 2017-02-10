const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;

require('../app/js/registry.js');

describe("basic calls", function() {

    var web3, Registry;

    beforeEach("prepare spies", function() {
        web3 = {
            net: {
                getVersionPromise: () => {
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
            }
        };
        web3.net.getVersionPromise = chai.spy(web3.net.getVersionPromise);
        Registry.setProvider = chai.spy(Registry.setProvider);
        Registry.setNetwork = chai.spy(Registry.setNetwork);
        expect(web3.net.getVersionPromise).to.be.spy;
        expect(Registry.setProvider).to.be.spy;
        expect(Registry.setNetwork).to.be.spy;
    });

    it("prepare called sub-functions as expected", function() {
        registry.prepare(web3, Registry)
            .then(() => {});
        expect(web3.net.getVersionPromise).to.have.been.called();
        expect(Registry.setProvider).to.have.been.called.with("currentProvider1");
        expect(Registry.setNetwork).to.have.been.called.with("45"); // This one does not pass
    });
});
