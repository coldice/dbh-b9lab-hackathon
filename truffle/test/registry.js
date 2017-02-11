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
            return instance.setInfo("userName1", 2, "somewhere1", { from: user1 })
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    var receivedEvent = instance.LogInfoChanged().formatter(receipt.logs[0])
                    assert.strictEqual(receivedEvent.args.who, user1, "should be sender");
                    assert.strictEqual(web3.toUtf8(receivedEvent.args.name), "userName1", "should be the name");
                    assert.strictEqual(receivedEvent.args.pointType.toNumber(), 2, "should be the pointType");
                    assert.strictEqual(receivedEvent.args.location, "somewhere1", "should be the location");
                    return Promise.all([
                            instance.infos(user1),
                            instance.addresses("userName1")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0][0]), "userName1", "should save name");
                    assert.strictEqual(results[0][1].toNumber(), 2, "should save pointType");
                    assert.strictEqual(results[0][2], "somewhere1", "should save location");
                    assert.strictEqual(results[1], user1, "should save address");
                });
        });

        it("should be able to set my name back to empty string", function() {
            return instance.setInfo("userName1", 3, "somewhere1", { from: user1 })
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    return instance.setInfo("", 4, "somewhere2", { from: user1 });
                })
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    var receivedEvent = instance.LogInfoChanged().formatter(receipt.logs[0])
                    assert.strictEqual(receivedEvent.args.who, user1, "should be sender");
                    assert.strictEqual(web3.toUtf8(receivedEvent.args.name), "", "should be the empty string");
                    assert.strictEqual(receivedEvent.args.pointType.toNumber(), 4, "should be the updated pointType");
                    assert.strictEqual(receivedEvent.args.location, "somewhere2", "should be the updated location");
                    return Promise.all([
                            instance.infos(user1),
                            instance.addresses(""),
                            instance.addresses("userName1")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0][0]), "", "should save name");
                    assert.strictEqual(results[0][1].toNumber(), 4, "should save new pointType");
                    assert.strictEqual(results[0][2], "somewhere2", "should save new location");
                    assert.strictEqual(results[1], "0x0000000000000000000000000000000000000000", "should keep the 0 at 0");
                    assert.strictEqual(results[2], "0x0000000000000000000000000000000000000000", "should have reset the userName1");
                });
        });

        it("should be able to register 2 names for 2 different people", function() {
            return Promise.all([
                    instance.setInfo("userName1", 4, "somewhere1", { from: user1 }),
                    instance.setInfo("userName2", 5, "somewhere2", { from: user2 })
                ])
                .then(txHashes => {
                    return web3.eth.getTransactionReceiptMined(txHashes);
                })
                .then((receipts) => {
                    var receivedEvent1 = instance.LogInfoChanged().formatter(receipts[0].logs[0]);
                    var receivedEvent2 = instance.LogInfoChanged().formatter(receipts[1].logs[0]);
                    assert.strictEqual(receivedEvent1.args.who, user1, "should be sender 1");
                    assert.strictEqual(receivedEvent2.args.who, user2, "should be sender 2");
                    assert.strictEqual(web3.toUtf8(receivedEvent1.args.name), "userName1", "should be the name of user1");
                    assert.strictEqual(web3.toUtf8(receivedEvent2.args.name), "userName2", "should be the name of user2");
                    assert.strictEqual(receivedEvent1.args.pointType.toNumber(), 4, "should be pointType 1");
                    assert.strictEqual(receivedEvent2.args.pointType.toNumber(), 5, "should be pointType 2");
                    assert.strictEqual(receivedEvent1.args.location, "somewhere1", "should be location 1");
                    assert.strictEqual(receivedEvent2.args.location, "somewhere2", "should be location 2");
                    return Promise.all([
                            instance.infos(user1),
                            instance.infos(user2),
                            instance.addresses("userName1"),
                            instance.addresses("userName2")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0][0]), "userName1", "should save name");
                    assert.strictEqual(results[0][1].toNumber(), 4, "should save pointType");
                    assert.strictEqual(results[0][2], "somewhere1", "should save location");
                    assert.strictEqual(results[2], user1, "should save address");
                    assert.strictEqual(web3.toUtf8(results[1][0]), "userName2", "should save name");
                    assert.strictEqual(results[1][1].toNumber(), 5, "should save pointType");
                    assert.strictEqual(results[1][2], "somewhere2", "should save location");
                    assert.strictEqual(results[3], user2, "should save address");
                })
        });

    });

    describe("conflict protection", function() {

        beforeEach("should create a brand new registry with a name in already", function() {
            return Registry.new()
                .then(created => {
                    instance = created;
                    instance.setInfo("userName1", 4, "somewhere1", {from: user1});
                });
        });

        it("should be able to change my existing name without changing type or location", function() {
            return instance.setInfo("newUserName1", 4, "somewhere1", {from: user1})
                .then(txHash => {
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    var receivedEvent = instance.LogInfoChanged().formatter(receipt.logs[0])
                    assert.strictEqual(receivedEvent.args.who, user1, "should be sender");
                    assert.strictEqual(web3.toUtf8(receivedEvent.args.name), "newUserName1", "should be the new name");
                    assert.strictEqual(receivedEvent.args.pointType.toNumber(), 4, "should be same pointType");
                    assert.strictEqual(receivedEvent.args.location, "somewhere1", "should be same location");
                    return Promise.all([
                            instance.infos(user1),
                            instance.addresses("newUserName1"),
                            instance.addresses("userName1")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0][0]), "newUserName1", "should save new name");
                    assert.strictEqual(results[0][1].toNumber(), 4, "should not change pointType");
                    assert.strictEqual(results[0][2], "somewhere1", "should not change location");
                    assert.strictEqual(results[1], user1, "should save address");
                    assert.strictEqual(results[2], "0x0000000000000000000000000000000000000000", "should map the former name to 0");
                });
        });

        it("should refuse to overwrite the name if someone else", function() {
            return Extensions.expectedExceptionPromise(
                () => instance.setInfo("userName1", 4, "somewhere2", {from: user2}), 
                3000000, 3000000);
        });

    });

    describe("erase possibility", function() {

        beforeEach("should create a brand new registry with 2 names in already", function() {
            return Registry.new()
                .then(created => {
                    instance = created;
                    instance.setInfo("userName1", 5, "somewhere1", {from: user1});
                    instance.setInfo("userName2", 6, "somewhere2", {from: user2});
                });
        });

        it("should be able to possible for both to set name back to empty string", function() {
            return Promise.all([
                instance.setInfo("", 0, "", { from: user1 }),
                instance.setInfo("", 0, "", { from: user2 })
                ])
                .then(txHashes => {
                    return web3.eth.getTransactionReceiptMined(txHashes);
                })
                .then((receipts) => {
                    var receivedEvent1 = instance.LogInfoChanged().formatter(receipts[0].logs[0]);
                    var receivedEvent2 = instance.LogInfoChanged().formatter(receipts[1].logs[0]);
                    assert.strictEqual(receivedEvent1.args.who, user1, "should be sender 1");
                    assert.strictEqual(receivedEvent2.args.who, user2, "should be sender 2");
                    assert.strictEqual(web3.toUtf8(receivedEvent1.args.name), "", "should be the empty string");
                    assert.strictEqual(web3.toUtf8(receivedEvent2.args.name), "", "should be the empty string");
                    assert.strictEqual(receivedEvent1.args.pointType.toNumber(), 0, "should be pointType 1");
                    assert.strictEqual(receivedEvent2.args.pointType.toNumber(), 0, "should be pointType 2");
                    assert.strictEqual(receivedEvent1.args.location, "", "should be location 1");
                    assert.strictEqual(receivedEvent2.args.location, "", "should be location 2");
                    return Promise.all([
                            instance.infos(user1),
                            instance.infos(user2),
                            instance.addresses(""),
                            instance.addresses("userName1"),
                            instance.addresses("userName2")
                        ]);
                })
                .then(results => {
                    assert.strictEqual(web3.toUtf8(results[0][0]), "", "should save name of user 1");
                    assert.strictEqual(results[0][1].toNumber(), 0, "should save pointType of user 1");
                    assert.strictEqual(results[0][2], "", "should save location of user 1");
                    assert.strictEqual(web3.toUtf8(results[1][0]), "", "should save name of user 2");
                    assert.strictEqual(results[1][1].toNumber(), 0, "should save pointType of user 2");
                    assert.strictEqual(results[1][2], "", "should save location of user 2");
                    assert.strictEqual(results[2], "0x0000000000000000000000000000000000000000", "should keep the 0 at 0");
                    assert.strictEqual(results[3], "0x0000000000000000000000000000000000000000", "should map the former name of user1 to 0");
                    assert.strictEqual(results[4], "0x0000000000000000000000000000000000000000", "should map the former name of user2 to 0");
                });
        });

    });

});
