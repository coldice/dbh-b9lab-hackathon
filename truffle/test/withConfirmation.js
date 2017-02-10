const Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Registry', function(accounts) {

    var user1, user2;

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 3, "should have at least 3 accounts");
        user1 = accounts[0];
        user2 = accounts[1];
        user3 = accounts[2];
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

        it("should store the required count", function() {
            return instance.requiredCount()
                .then(requiredCount => {
                    assert.strictEqual(requiredCount.toNumber(), 2, "should have been saved");
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
                    return Promise.all([
                             instance.info(),
                             instance.confirmations(key),
                             instance.getConfirmationOf(key, user1),
                             instance.getConfirmationOf(key, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(web3.toUtf8(infos[0]), "", "should not be set");
                    assert.strictEqual(infos[1].toNumber(), 1, "should have 1 confirmed count");
                    assert.isTrue(infos[2], "should be confirmed");
                    assert.isFalse(infos[3], "should not be confirmed");
                });
        });

    });

    describe("when already 1 pending action", function() {

        var instance, key1;

        beforeEach("should create a brand new withConfirmation with 1 action pending", function() {
            return WithConfirmationMock.new(2, { from: user1 })
                .then(created => {
                    instance = created;
                    return instance.setInfo("hello1");
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => instance.calculateKey(instance.contract.setInfo.getData("hello1")))
                .then(key => { key1 = key; });
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
                    return Promise.all([
                            instance.info(),
                            instance.confirmations(key),
                            instance.getConfirmationOf(key, user1),
                            instance.getConfirmationOf(key, user2),
                            instance.confirmations(key1),
                            instance.getConfirmationOf(key1, user1),
                            instance.getConfirmationOf(key1, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(web3.toUtf8(infos[0]), "", "should not be set");
                    assert.strictEqual(infos[1].toNumber(), 1, "should be 1 confirmation for hello2");
                    assert.isTrue(infos[2], "should mark user1 as confirmed on hello2");
                    assert.isFalse(infos[3], "should mark user2 as not confirmed on hello2");
                    assert.strictEqual(infos[4].toNumber(), 1, "should be 1 confirmation for hello1");
                    assert.isTrue(infos[5], "should mark user1 as confirmed on hello1");
                    assert.isFalse(infos[6], "should mark user2 as not confirmed on hello1");
                });
        });

        it("should be possible to finally set the value", function() {
            return instance.setInfo("hello1", { from: user2 })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    assert.strictEqual(receipt.logs.length, 0, "should have no event");
                    return Promise.all([
                            instance.info(),
                            instance.confirmations(key1),
                            instance.getConfirmationOf(key1, user1),
                            instance.getConfirmationOf(key1, user2)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(web3.toUtf8(infos[0]), "hello1", "should have been set");
                    assert.strictEqual(infos[1].toNumber(), 2, "should have 2 confirmations");
                    assert.isTrue(infos[2], "should have marked user1 as confirmed");
                    assert.isTrue(infos[3], "should have marked user2 as confirmed");
                });
        });

        it("should fail if same user confirm same thing again", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.setInfo("hello1", { from: user1, gas: 3000000 }),
                3000000);
        });

    });

    describe("when already 2 pending actions", function() {

        var instance, key1, key2;

        beforeEach("should create a brand new withConfirmation with 2 actions pending", function() {
            return WithConfirmationMock.new(2)
                .then(created => {
                    instance = created;
                    return Promise.all([
                            instance.setInfo("hello1", { from: user1 }),
                            instance.setInfo("hello2", { from: user1 })
                        ]);
                })
                .then(txHashes => web3.eth.getTransactionReceiptMined(txHashes))
                .then(receipt => Promise.all([
                        instance.calculateKey(instance.contract.setInfo.getData("hello1")),
                        instance.calculateKey(instance.contract.setInfo.getData("hello2"))
                    ]))
                .then(keys => {
                    key1 = keys[0];
                    key2 = keys[1];
                });
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

    describe("when already 2 pending actions, will overwrite each other", function() {

        var instance, key1, key2;

        beforeEach("should create a brand new withConfirmation with 2 actions pending", function() {
            return WithConfirmationMock.new(2)
                .then(created => {
                    instance = created;
                    return Promise.all([
                            instance.setInfo("hello1", { from: user1 }),
                            instance.setInfo("hello2", { from: user1 })
                        ]);
                })
                .then(txHashes => web3.eth.getTransactionReceiptMined(txHashes))
                .then(receipt => Promise.all([
                        instance.calculateKey(instance.contract.setInfo.getData("hello1")),
                        instance.calculateKey(instance.contract.setInfo.getData("hello2"))
                    ]))
                .then(keys => {
                    key1 = keys[0];
                    key2 = keys[1];
                });
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

    describe("when needs 3 confirmations", function() {

        var instance, key1;

        beforeEach("should create a brand new withConfirmation with 1 action pending with 1 confirmation", function() {
            return WithConfirmationMock.new(3)
                .then(created => {
                    instance = created;
                    return instance.setInfo("hello1", { from: user1 });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => instance.calculateKey(instance.contract.setInfo.getData("hello1")))
                .then(key => { key1 = key; });
        });

        it("should not set and not notify when 2nd confirmation", function() {
            return instance.setInfo("hello1", { from: user2 })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(receipt => {
                    assert.strictEqual(receipt.logs.length, 0, "should have no event");
                    return Promise.all([
                            instance.info(),
                            instance.confirmations(key1),
                            instance.getConfirmationOf(key1, user1),
                            instance.getConfirmationOf(key1, user2),
                            instance.getConfirmationOf(key1, user3)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(web3.toUtf8(infos[0]), "", "should have now be set");
                    assert.strictEqual(infos[1].toNumber(), 2, "should have counted 2");
                    assert.isTrue(infos[2], "should be marked user1 as confirmed");
                    assert.isTrue(infos[3], "should be marked user2 as confirmed");
                    assert.isFalse(infos[4], "should be marked user3 as not confirmed");
                })
        });

        it("should be set when sent 3rd confirmation", function() {
            return Promise.all([
                    instance.setInfo("hello1", { from: user2 }),
                    instance.setInfo("hello1", { from: user3 })
                ])
                .then(txHashes => web3.eth.getTransactionReceiptMined(txHashes))
                .then(receipts => {
                    assert.strictEqual(receipts[0].logs.length, 0, "should have no event");
                    assert.strictEqual(receipts[1].logs.length, 0, "should have no event");
                    return Promise.all([
                            instance.info(),
                            instance.confirmations(key1),
                            instance.getConfirmationOf(key1, user1),
                            instance.getConfirmationOf(key1, user2),
                            instance.getConfirmationOf(key1, user3)
                        ]);
                })
                .then(infos => {
                    assert.strictEqual(web3.toUtf8(infos[0]), "hello1", "should have now be set");
                    assert.strictEqual(infos[1].toNumber(), 3, "should have counted 3");
                    assert.isTrue(infos[2], "should be marked user1 as confirmed");
                    assert.isTrue(infos[3], "should be marked user2 as confirmed");
                    assert.isTrue(infos[4], "should be marked user3 as confirmed");
                });
        });

    });

});