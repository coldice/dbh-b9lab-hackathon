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

        beforeEach("should create a brand new withConfirmation", function() {
            return WithConfirmationMock.new(2, { from: user1 })
                .then(created => {
                    instance = created;
                });
        });

        it("should not set info if only one wants", function() {
            var callData = instance.contract.setInfo.getData("hello1");
            return instance.setInfo("hello1", { from: user1 })
                .then(txHash => Promise.all([
                        web3.eth.getTransactionReceiptMined(txHash),
                        instance.calculateKey(callData)
                    ]))
                .then(receiptAndKey => {
                    var receivedEvent = instance.OnConfirmationRequired()
                        .formatter(receiptAndKey[0].logs[0]);
                    var key = receiptAndKey[1];
                    assert.strictEqual(receivedEvent.args.key, key, "should be the key");
                    return instance.info();
                })
                .then(info => {
                    assert.strictEqual(web3.toUtf8(info), "", "should not be set");
                });
        });

    });

    describe("when already 1 pending action", function() {

        var instance;

        beforeEach("should create a brand new withConfirmation with 1 action pending", function() {
            return WithConfirmationMock.new(2, { from: user1 })
                .then(created => {
                    instance = created;
                    return instance.setInfo("hello1");
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash));
        });

        it("should be able to create an independent pending confirmation", function() {
            var callData = instance.contract.setInfo.getData("hello2");
            return instance.setInfo("hello2", { from: user1 })
                .then(txHash => Promise.all([
                        web3.eth.getTransactionReceiptMined(txHash),
                        instance.calculateKey(callData)
                    ]))
                .then(receiptAndKey => {
                    var receivedEvent = instance.OnConfirmationRequired()
                        .formatter(receiptAndKey[0].logs[0]);
                    var key = receiptAndKey[1];
                    assert.strictEqual(receivedEvent.args.key, key, "should be the key");
                    return instance.info();
                })
                .then(info => {
                    assert.strictEqual(web3.toUtf8(info), "", "should not be set");
                });
        });

    });

    describe("when already 2 pending actions", function() {

        var instance;

        beforeEach("should create a brand new withConfirmation with 2 actions pending", function() {
            return WithConfirmationMock.new(2)
                .then(created => {
                    instance = created;
                    return Promise.all([
                            instance.setInfo("hello1", { from: user1 }),
                            instance.setInfo("hello2", { from: user1 })
                        ]);
                })
                .then(txHashes => web3.eth.getTransactionReceiptMined(txHashes));
        });

        it("should be hello1 if it is sent first", function() {
            return instance.setInfo("hello1", { from: user2 })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    assert.strictEqual(receipt.logs.length, 0, "should have no event");
                    return instance.info();
                })
                .then(info => {
                    assert.strictEqual(web3.toUtf8(info), "hello1", "should have now be set");
                });
        });

        it("should be hello2 if it is sent first", function() {
            return instance.setInfo("hello2", { from: user2 })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    assert.strictEqual(receipt.logs.length, 0, "should have no event");
                    return instance.info();
                })
                .then(info => {
                    assert.strictEqual(web3.toUtf8(info), "hello2", "should have now be set");
                });
        });

    });

    describe("when already 2 pending actions, will overwrite", function() {

        var instance;

        beforeEach("should create a brand new withConfirmation with 2 actions pending", function() {
            return WithConfirmationMock.new(2)
                .then(created => {
                    instance = created;
                    return Promise.all([
                            instance.setInfo("hello1", { from: user1 }),
                            instance.setInfo("hello2", { from: user1 })
                        ]);
                })
                .then(txHashes => web3.eth.getTransactionReceiptMined(txHashes));
        });

        it("should be hello1 if it is sent first, overwritten by hello2", function() {
            return instance.setInfo("hello1", { from: user2 })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => instance.setInfo("hello2", { from: user2 }))
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    assert.strictEqual(receipt.logs.length, 0, "should have no event");
                    return instance.info();
                })
                .then(info => {
                    assert.strictEqual(web3.toUtf8(info), "hello2", "should have now be set");
                });
        });

        it("should be hello2 if it is sent first, overwritten by hello1", function() {
            return instance.setInfo("hello2", { from: user2 })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => instance.setInfo("hello1", { from: user2 }))
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    assert.strictEqual(receipt.logs.length, 0, "should have no event");
                    return instance.info();
                })
                .then(info => {
                    assert.strictEqual(web3.toUtf8(info), "hello1", "should have now be set");
                });
        });

    });

});