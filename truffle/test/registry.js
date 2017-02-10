const Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Registry', function(accounts) {

    var user1, user2;

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 2, "should have at least 2 accounts");
        user1 = accounts[0];
        user2 = accounts[1];
        return Extensions.makeSureAreUnlocked(
                [ user1, user2 ])
            .then(function() {
                return Extensions.makeSureHasAtLeast(
                    user1,
                    [ user2 ],
                    web3.toWei(1));
            });
    });

    describe("basic testing", function() {

        var instance;

        beforeEach("should create a brand new registry", function() {
            return Registry.new()
                .then(created => {
                    instance = created;
                });
        });

        it("should be able to register my name", function() {
            return instance.setName("userName1", { from: user1 })
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    var receivedEvent = instance.LogNameChanged().formatter(receipt.logs[0])
                    assert.strictEqual(receivedEvent.args.who, user1, "should be sender");
                    assert.strictEqual(web3.toUtf8(receivedEvent.args.name), "userName1", "should be the name");
                    return Promise.all([
                            instance.names(user1),
                            instance.addresses("userName1")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0]), "userName1", "should save name");
                    assert.strictEqual(results[1], user1, "should save address");
                });
        });

        it("should be able to set my name back to empty string", function() {
            return instance.setName("userName1", { from: user1 })
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    return instance.setName("", { from: user1 });
                })
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    var receivedEvent = instance.LogNameChanged().formatter(receipt.logs[0])
                    assert.strictEqual(receivedEvent.args.who, user1, "should be sender");
                    assert.strictEqual(web3.toUtf8(receivedEvent.args.name), "", "should be the empty string");
                    return Promise.all([
                            instance.names(user1),
                            instance.addresses("")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0]), "", "should save name");
                    assert.strictEqual(results[1], "0x0000000000000000000000000000000000000000", "should keep the 0 at 0");
                });
        });

        it("should be able to register 2 names for 2 different people", function() {
        });

    });

    describe("conflict protection", function() {

        beforeEach("should create a brand new registry with a name in already", function() {
        });

        it("should be able to change my existing name", function() {
        });

        it("should refuse to overwrite the name if someone else", function() {
        });

    });

    describe("erase possibility", function() {

        beforeEach("should create a brand new registry with 2 names in already", function() {
        });

        it("should be able to possible for both to set name back to empty string", function() {
        });

    });

});
