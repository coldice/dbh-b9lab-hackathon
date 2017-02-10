const Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Graph', function(accounts) {

    var user1, user2, user3, user4;

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 4, "should have at least 4 accounts");
        user1 = accounts[0];
        user2 = accounts[1];
        user3 = accounts[2];
        user4 = accounts[3];
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

        beforeEach("should create a brand new graph", function() {
            return Graph.new({ from: user1 })
                .then(created => {
                    instance = created;
                });
        });

        it("should have proper initial values", function() {
            return instance.requiredCount()
                .then(requiredCount => {
                    assert.strictEqual(requiredCount.toNumber(), 2, "should have been in constructor");
                })
        });

        it("should test if you are from or to", function() {
            return Promise.all([
                    instance.isYourLink(user1, user2, { from: user1 }),
                    instance.isYourLink(user1, user2, { from: user2 }),
                    instance.isYourLink(user1, user2, { from: user3 })
                ])
                .then(isYourLinks => {
                    assert.isTrue(isYourLinks[0], "user1 should be");
                    assert.isTrue(isYourLinks[1], "user2 should be");
                    assert.isFalse(isYourLinks[2], "user3 should not be");
                });
        });

        it("should fail if you are not from or to", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.submitLink(user1, user2, 1000, 1000000, { from: user3, gas: 3000000 }),
                3000000);
        });

        it("should fail if from is 0", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.submitLink(0, user2, 1000, 1000000, { from: user2, gas: 3000000 }),
                3000000);
        });

        it("should fail if to is 0", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.submitLink(user1, 0, 1000, 1000000, { from: user1, gas: 3000000 }),
                3000000);
        });

        it("should fail if from equals to", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.submitLink(user1, user1, 1000, 1000000, { from: user1, gas: 3000000 }),
                3000000);
        });

        it("should wait for a confirmation when submitting a link as from", function() {
            var callData = instance.contract.submitLink.getData(user1, user2, 1000, 1000000);
            return instance.submitLink.call(user1, user2, 1000, 1000000, { from: user1 })
                .then(successful => {
                    assert.isFalse(successful, "should not pass because it is the first");
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user1 });
                })
                .then(txHash => Promise.all([
                        web3.eth.getTransactionReceiptMined(txHash),
                        instance.calculateKey(callData)
                    ]))
                .then(receiptAndKey => {
                    var receivedEvent = instance.OnConfirmationRequired().formatter(receiptAndKey[0].logs[0]);
                    var key = receiptAndKey[1];
                    assert.strictEqual(receivedEvent.args.key, key, "should be the key");
                    return Promise.all([
                            instance.directedLinks(user1),
                            instance.confirmations(key),
                            instance.getConfirmationOf(key, user1),
                            instance.getConfirmationOf(key, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(infos[0][0], "0x0000000000000000000000000000000000000000", "should not set link");
                    assert.strictEqual(infos[1].toNumber(), 1, "should have 1 confirmed count");
                    assert.isTrue(infos[2], "should be confirmed");
                    assert.isFalse(infos[3], "should not be confirmed");
                });
        });

        it("should wait for a confirmation when submitting a link as to", function() {
            var callData = instance.contract.submitLink.getData(user1, user2, 1000, 1000000);
            return instance.submitLink.call(user1, user2, 1000, 1000000, { from: user2 })
                .then(successful => {
                    assert.isFalse(successful, "should not pass because it is the first");
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user2 });
                })
                .then(txHash => Promise.all([
                        web3.eth.getTransactionReceiptMined(txHash),
                        instance.calculateKey(callData)
                    ]))
                .then(receiptAndKey => {
                    var receivedEvent = instance.OnConfirmationRequired().formatter(receiptAndKey[0].logs[0]);
                    var key = receiptAndKey[1];
                    assert.strictEqual(receivedEvent.args.key, key, "should be the key");
                    return Promise.all([
                            instance.directedLinks(user1),
                            instance.confirmations(key),
                            instance.getConfirmationOf(key, user1),
                            instance.getConfirmationOf(key, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(infos[0][0], "0x0000000000000000000000000000000000000000", "should not set link");
                    assert.strictEqual(infos[1].toNumber(), 1, "should have 1 confirmed count");
                    assert.isFalse(infos[2], "should not be confirmed");
                    assert.isTrue(infos[3], "should be confirmed");
                });
        });

    });

    describe("create link start with from", function() {

        var instance, key1;

        beforeEach("should create a brand new graph with a pending link", function() {
            return Graph.new({ from: user1 })
                .then(created => {
                    instance = created;
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user1 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    var receivedEvent = instance.OnConfirmationRequired().formatter(receipt.logs[0]);
                    key1 = receivedEvent.args.key;
                });
        });

        it("should fail if submit with user1 again", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.submitLink(user1, user2, 1000, 1000000, { from: user1, gas: 3000000 }),
                3000000);
        });

        it("should create link with user2", function() {
            return instance.submitLink.call(user1, user2, 1000, 1000000, { from: user2 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible to add link");
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user2 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    var receivedEvent = instance.LogLinkAdded().formatter(receipt.logs[0]);
                    assert.strictEqual(receivedEvent.args.from, user1, "should be the from");
                    assert.strictEqual(receivedEvent.args.to, user2, "should be the to");
                    assert.strictEqual(receivedEvent.args.loss.toNumber(), 1000, "should be the loss");
                    assert.strictEqual(receivedEvent.args.throughput.toNumber(), 1000000, "should be the throughput");
                    return instance.getConfirmationOf(key1, user2);
                })
                .then(isConfirmed => {
                    assert.isTrue(isConfirmed, "should have been marked");
                })
        });

    });

    describe("create link start with to", function() {

        var instance, key1;

        beforeEach("should create a brand new graph with a pending link", function() {
            return Graph.new({ from: user1 })
                .then(created => {
                    instance = created;
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user2 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    var receivedEvent = instance.OnConfirmationRequired().formatter(receipt.logs[0]);
                    key1 = receivedEvent.args.key;
                });
        });

        it("should fail if submit with user2 again", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.submitLink(user1, user2, 1000, 1000000, { from: user2, gas: 3000000 }),
                3000000);
        });

        it("should create link with user1", function() {
            return instance.submitLink.call(user1, user2, 1000, 1000000, { from: user1 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible to add link");
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user1 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    var receivedEvent = instance.LogLinkAdded().formatter(receipt.logs[0]);
                    assert.strictEqual(receivedEvent.args.from, user1, "should be the from");
                    assert.strictEqual(receivedEvent.args.to, user2, "should be the to");
                    assert.strictEqual(receivedEvent.args.loss.toNumber(), 1000, "should be the loss");
                    assert.strictEqual(receivedEvent.args.throughput.toNumber(), 1000000, "should be the throughput");
                    return instance.getConfirmationOf(key1, user1);
                })
                .then(isConfirmed => {
                    assert.isTrue(isConfirmed, "should have been marked");
                })
        });

    });

    describe("create symmetrical bidirectional link", function() {

        var instance, keyLeft, keyRight;

        beforeEach("should create a brand new graph with a full link", function() {
            return Graph.new({ from: user1 })
                .then(created => {
                    instance = created;
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user1 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    var receivedEvent = instance.OnConfirmationRequired().formatter(receipt.logs[0]);
                    keyLeft = receivedEvent.args.key;
                    return instance.submitLink(user1, user2, 1000, 1000000, { from: user2 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash));
        });

        it("should wait for a confirmation when submitting the other direction", function() {
            var callData = instance.contract.submitLink.getData(user2, user1, 1000, 1000000);
            return instance.submitLink.call(user2, user1, 1000, 1000000, { from: user1 })
                .then(successful => {
                    assert.isFalse(successful, "should not pass because it is the first");
                    return instance.submitLink(user2, user1, 1000, 1000000, { from: user1 });
                })
                .then(txHash => Promise.all([
                        web3.eth.getTransactionReceiptMined(txHash),
                        instance.calculateKey(callData)
                    ]))
                .then(receiptAndKey => {
                    var receivedEvent = instance.OnConfirmationRequired().formatter(receiptAndKey[0].logs[0]);
                    keyRight = receiptAndKey[1];
                    assert.strictEqual(receivedEvent.args.key, keyRight, "should be the key");
                    return Promise.all([
                            instance.directedLinks(user1),
                            instance.directedLinks(user2),
                            instance.confirmations(keyRight),
                            instance.getConfirmationOf(keyRight, user1),
                            instance.getConfirmationOf(keyRight, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(infos[0][0], user2, "should have set link");
                    assert.strictEqual(infos[1][0], "0x0000000000000000000000000000000000000000", "should not set link");
                    assert.strictEqual(infos[2].toNumber(), 1, "should have 1 confirmed count");
                    assert.isTrue(infos[3], "should be confirmed");
                    assert.isFalse(infos[4], "should not be confirmed");
                });
        });

        it("should make a link in the other direction when confirmed", function() {
            var callData = instance.contract.submitLink.getData(user2, user1, 1000, 1000000);
            return instance.submitLink(user2, user1, 1000, 1000000, { from: user1 })
                .then(txHash => Promise.all([
                        web3.eth.getTransactionReceiptMined(txHash),
                        instance.calculateKey(callData)
                    ]))
                .then(receiptAndKey => {
                    keyRight = receiptAndKey[1];
                    return instance.submitLink(user2, user1, 1000, 1000000, { from: user2 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    var receivedEvent = instance.LogLinkAdded().formatter(receipt.logs[0]);
                    assert.strictEqual(receivedEvent.args.from, user2, "should be the from");
                    assert.strictEqual(receivedEvent.args.to, user1, "should be the to");
                    assert.strictEqual(receivedEvent.args.loss.toNumber(), 1000, "should be the loss");
                    assert.strictEqual(receivedEvent.args.throughput.toNumber(), 1000000, "should be the throughput");
                    return Promise.all([
                            instance.directedLinks(user1),
                            instance.directedLinks(user2),
                            instance.confirmations(keyRight),
                            instance.getConfirmationOf(keyRight, user1),
                            instance.getConfirmationOf(keyRight, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(infos[0][0], user2, "should have set link");
                    assert.strictEqual(infos[1][0], user1, "should not set link");
                    assert.strictEqual(infos[2].toNumber(), 2, "should have both confirmed count");
                    assert.isTrue(infos[3], "should be confirmed");
                    assert.isTrue(infos[4], "should be confirmed");
                });
        });

    });

});