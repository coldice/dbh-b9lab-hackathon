const Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Graph', function(accounts) {

    var graph, user1, user2, user3, user4;
    var uintMax = web3.toBigNumber("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

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
                    web3.toWei(2));
            });
    });

    before("should create a Graph with 2 links", function() {
        return Graph.new({ from: user1 })
            .then(created => {
                graph = created;
                return Promise.all([
                        // 0% loss, throughput 1kW
                        graph.submitLink.sendTransaction(user1, user2, 0, 1000000,
                            { from: user1, gas: 300000 }),
                        graph.submitLink.sendTransaction(user1, user2, 0, 1000000,
                            { from: user2, gas: 300000 }),
                        // 5% loss, throughput 1kW
                        graph.submitLink.sendTransaction(user1, user3, 5000, 1000000,
                            { from: user1, gas: 300000 }),
                        graph.submitLink.sendTransaction(user1, user3, 5000, 1000000,
                            { from: user3, gas: 300000 })
                    ])
            })
            .then(web3.eth.getTransactionReceiptMined);
    });

    describe("basic instantiation", function() {

        it("should have deployed in migration script", function() {
            return EnergyToken.deployed().graph()
                .then(graphAddress => {
                    assert.strictEqual(
                        graphAddress,
                        Graph.deployed().address,
                        "should be the deployed address");
                })
        });

        it("should store the passed Graph address", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(instance => instance.graph())
                .then(graphAddress => {
                    assert.strictEqual(graphAddress, graph.address, "should have been the constructor argument");
                });
        });

        it("should not accept 0 Graph address", function() {
            return Extensions.expectedExceptionPromise(
                () => EnergyToken.new(0, { from: user1, gas: 3000000 }),
                3000000);
        });

    });

    describe("basic operations", function() {

        var energyToken;

        beforeEach("should create a brand new graph", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should be possible to produce electricity", function() {
            return energyToken.produce.call(2300, { from: user1 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible to produce");
                    return energyToken.produce(2300, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyProduced().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 2300, "should be the amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 2300, "should be the stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 2300, "should have saved the stock");
                })
        });

        it("should be possible to produce electricity twice", function() {
            return energyToken.produce(2100, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.produce.call(2300, { from: user1 }))
                .then(successful => {
                    assert.isTrue(successful, "should be possible to produce");
                    return energyToken.produce(2300, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyProduced().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 2300, "should be the amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 4400, "should be the stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 4400, "should have saved the stock");
                })
        });

        it("should be possible to produce up to the max of uint in one go", function() {
            return energyToken.produce.call(uintMax, { from: user1 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible to produce");
                    return energyToken.produce(uintMax, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyProduced().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(
                        receivedArgs.howMuch.toString(10),
                        uintMax.toString(10),
                        "should be the amount");
                    assert.strictEqual(
                        receivedArgs.stock.toString(10),
                        uintMax.toString(10),
                        "should be the stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(
                        producer.toString(10),
                        uintMax.toString(10),
                        "should have saved the stock");
                });
        });

    });

    describe("produce overflow protection", function() {

        var energyToken;

        beforeEach("should create a brand new graph", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should be possible to produce: (max - 1) + 1", function() {
            return energyToken.produce(uintMax.minus(1), { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.produce.call(1, { from: user1 }))
                 .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.produce(1, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyProduced().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 1, "should be the amount");
                    assert.strictEqual(
                        receivedArgs.stock.toString(10),
                        uintMax.toString(10),
                        "should be the stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(
                        producer.toString(10),
                        uintMax.toString(10),
                        "should have saved the stock");
                })
        });

        it("should not be possible to produce above the max: max + 1", function() {
            return energyToken.produce(uintMax, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.produce(1, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to produce above the max: (max - 1) + 2", function() {
            return energyToken.produce(uintMax.minus(1), { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.produce(2, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to produce above the max: (max - 9) + 10", function() {
            return energyToken.produce(uintMax.minus(9), { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.produce(10, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should be possible to produce: 1 + (max - 1)", function() {
            return energyToken.produce(1, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.produce.call(uintMax.minus(1), { from: user1 }))
                 .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.produce(uintMax.minus(1), { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyProduced().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(
                        receivedArgs.howMuch.toString(10),
                        uintMax.minus(1).toString(10),
                        "should be the amount");
                    assert.strictEqual(
                        receivedArgs.stock.toString(10),
                        uintMax.toString(10),
                        "should be the stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(
                        producer.toString(10),
                        uintMax.toString(10),
                        "should have saved the stock");
                })
        });

        it("should not be possible to produce above the max: 1 + max", function() {
            return energyToken.produce(1, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.produce(uintMax, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to produce above the max: 2 + (max - 1)", function() {
            return energyToken.produce(2, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.produce(uintMax.minus(1), { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to produce above the max: 10 + (max - 9)", function() {
            return energyToken.produce(10, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.produce(uintMax.minus(9), { from: user1, gas: 3000000 }),
                    3000000));
        });

    });

    describe("allow operations", function() {

        var energyToken;

        beforeEach("should create a brand new graph", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should be possible to allow other", function() {
            return energyToken.allow.call(user2, 1500, { from: user1 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.allow(user2, 1500, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogConsumptionAllowed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 1500, "should be allowed amount");
                    assert.strictEqual(receivedArgs.total.toNumber(), 1500, "should be total allowed amount");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 1500, "should be the allowed amount");
                });
        });

        it("should be possible to allow additively other twice", function() {
            return energyToken.allow(user2, 1000, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.allow.call(user2, 1500, { from: user1 }))
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.allow(user2, 1500, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogConsumptionAllowed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 1500, "should be just allowed amount");
                    assert.strictEqual(receivedArgs.total.toNumber(), 2500, "should be total allowed amount");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 2500, "should be the allowed amount");
                });
        });

        it("should not be possible to allow oneself", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.allow(user1, 1, { from: user1, gas: 3000000 }),
                3000000);
        });

    });

    describe("allow overflow protection", function() {

        var energyToken;

        beforeEach("should create a brand new graph", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should be possible to allow to the max", function() {
            return energyToken.allow.call(user2, uintMax, { from: user1 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible to allow");
                    return energyToken.allow(user2, uintMax, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogConsumptionAllowed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be consumer");
                    assert.strictEqual(
                        receivedArgs.howMuch.toString(10),
                        uintMax.toString(10),
                        "should be the max amount");
                    assert.strictEqual(
                        receivedArgs.total.toString(10),
                        uintMax.toString(10),
                        "should be the max amount");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toString(10), uintMax.toString(10), "should be max amount");
                });
        });

        it("should not be possible to allow above the max: max + 1", function() {
            return energyToken.allow(user2, uintMax, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.allow(user2, 1, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to allow above the max: (max - 1) + 2", function() {
            return energyToken.allow(user2, uintMax.minus(1), { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.allow(user2, 2, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to allow above the max: (max - 9) + 10", function() {
            return energyToken.allow(user2, uintMax.minus(9), { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.allow(user2, 10, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to allow above the max: 1 + max", function() {
            return energyToken.allow(user2, 1, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.allow(user2, uintMax, { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to allow above the max: 2 + (max - 1)", function() {
            return energyToken.allow(user2, 2, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.allow(user2, uintMax.minus(1), { from: user1, gas: 3000000 }),
                    3000000));
        });

        it("should not be possible to allow above the max: 10 + (max - 9)", function() {
            return energyToken.allow(user2, 10, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => Extensions.expectedExceptionPromise(
                    () => energyToken.allow(user2, uintMax.minus(9), { from: user1, gas: 3000000 }),
                    3000000));
        });

    });

    describe("adjust consumption", function() {

        var energyToken;

        beforeEach("should create a brand new graph", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should keep value when no loss", function() {
            return Promise.all([
                    energyToken.adjust(user1, user2, 1),
                    energyToken.adjust(user1, user2, 1000)
                ])
                .then(adjusted => {
                    assert.strictEqual(adjusted[0].toNumber(), 1, "should be same 1");
                    assert.strictEqual(adjusted[1].toNumber(), 1000, "should be same 1000");
                });
        });

        it("should increase value when has loss", function() {
            return Promise.all([
                    energyToken.adjust(user1, user3, 1),
                    energyToken.adjust(user1, user3, 1000)
                ])
                .then(adjusted => {
                    assert.strictEqual(adjusted[0].toNumber(), 1, "should be same 1 because too small");
                    // 1000 * 1.05 = 1050
                    assert.strictEqual(adjusted[1].toNumber(), 1050, "should be increased to 1050");
                });
        });

    });

    describe("adjust consumption, when no overflow protection", function() {

        var energyToken, limit;

        beforeEach("should create a brand new graph", function() {
            limit = uintMax.dividedBy(100000).floor();
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should adjust value, right below limit", function() {
            return energyToken.adjust(user1, user2, limit)
                .then(adjusted => {
                    assert.strictEqual(adjusted.toString(10), limit.toString(10), "should be same");
                });
        });

        it("should fail, right at limit", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.adjust.sendTransaction(
                    user1, user2, limit.plus(1), { from: user1, gas: 3000000}),
                3000000);
        });

    });

    describe("adjust consumption, when has loss overflow protection", function() {

        var energyToken, limit;

        beforeEach("should create a brand new graph", function() {
            limit = uintMax.dividedBy(105000).floor();
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                });
        });

        it("should adjust value, right below limit", function() {
            return energyToken.adjust(user1, user3, limit)
                .then(adjusted => {
                    assert.strictEqual(
                        adjusted.toString(10), 
                        limit.times(1.05).floor().toString(10),
                        "should be adjusted");
                });
        });

        it("should fail, right at limit", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.adjust.sendTransaction(
                    user1, user3, limit.plus(1), { from: user1, gas: 3000000}),
                3000000);
        });

    });

    describe("consume operations without allowance", function() {

        var energyToken;

        beforeEach("should create a brand new graph with stock", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return energyToken.produce(2500, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should not be possible to consume", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, 1, { from: user2, gas: 3000000 }),
                3000000);
        });

        it("should be possible to consume if allowed first", function() {
            return energyToken.allow(user2, 1, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.consume.call(user1, 1, { from: user2 }))
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.consume(user1, 1, { from: user2 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyConsumed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be the consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 1, "should be the amount");
                    assert.strictEqual(receivedArgs.adjusted.toNumber(), 1, "should be the adjusted amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 2499, "should be the remaining stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 2499, "should be the remaining stock");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 0, "should have consumed all allowance");
                });
        });

    });

    describe("consume operations without stock", function() {

        var energyToken;

        beforeEach("should create a brand new graph with allowance", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return energyToken.allow(user2, 2500, { from: user1 });
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should not be possible to consume", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, 1, { from: user2, gas: 3000000 }),
                3000000);
        });

        it("should be possible to consume if has stock first", function() {
            return energyToken.produce(1, { from: user1 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.consume.call(user1, 1, { from: user2 }))
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.consume(user1, 1, { from: user2 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyConsumed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be the consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 1, "should be the amount");
                    assert.strictEqual(receivedArgs.adjusted.toNumber(), 1, "should be the adjusted amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 0, "should be the remaining stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 0, "should be the remaining stock");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 2499, "should have consumed some allowance");
                });
        });

    });

    describe("consume operations, without loss", function() {

        var energyToken;

        beforeEach("should create a brand new graph with stock and allowance", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(2500, { from: user1 }),
                            energyToken.allow(user2, 5000, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should deduct stock and allowance", function() {
            return energyToken.consume.call(user1, 145, { from: user2 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.consume(user1, 145, { from: user2 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyConsumed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be the consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 145, "should be the amount");
                    assert.strictEqual(receivedArgs.adjusted.toNumber(), 145, "should be the adjusted amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 2355, "should be the remaining stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 2355, "should be the remaining stock");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 4855, "should have consumed some allowance");
                });

        });

        it("should deduct stock and allowance twice", function() {
            return energyToken.consume(user1, 145, { from: user2 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.consume.call(user1, 325, { from: user2 }))
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.consume(user1, 325, { from: user2 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyConsumed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.consumer, user2, "should be the consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 325, "should be the amount");
                    assert.strictEqual(receivedArgs.adjusted.toNumber(), 325, "should be the adjusted amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 2030, "should be the remaining stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 2030, "should be the remaining stock");
                    return energyToken.getAllowance(user1, user2);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 4530, "should have consumed some allowance");
                });

        });

    });

    describe("consume operations, with loss", function() {

        var energyToken;

        beforeEach("should create a brand new graph with stock and allowance", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(2500, { from: user1 }),
                            energyToken.allow(user3, 5000, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should deduct stock and allowance", function() {
            // 145 * 1.05 = 152.25
            return energyToken.consume.call(user1, 145, { from: user3 })
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.consume(user1, 145, { from: user3 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyConsumed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.consumer, user3, "should be the consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 145, "should be the amount");
                    assert.strictEqual(receivedArgs.adjusted.toNumber(), 152, "should be the adjusted amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 2348, "should be the remaining stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 2348, "should be the remaining stock");
                    return energyToken.getAllowance(user1, user3);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 4848, "should have consumed some allowance");
                });
        });

        it("should deduct stock and allowance twice", function() {
            // 145 * 1.05 = 152.25
            return energyToken.consume(user1, 145, { from: user3 })
                .then(web3.eth.getTransactionReceiptMined)
                // 325 * 1.05 = 341.25
                .then(receipt => energyToken.consume.call(user1, 325, { from: user3 }))
                .then(successful => {
                    assert.isTrue(successful, "should be possible");
                    return energyToken.consume(user1, 325, { from: user3 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => {
                    var receivedArgs = energyToken.LogEnergyConsumed().formatter(receipt.logs[0]).args;
                    assert.strictEqual(receivedArgs.producer, user1, "should be the producer");
                    assert.strictEqual(receivedArgs.consumer, user3, "should be the consumer");
                    assert.strictEqual(receivedArgs.howMuch.toNumber(), 325, "should be the amount");
                    assert.strictEqual(receivedArgs.adjusted.toNumber(), 341, "should be the adjusted amount");
                    assert.strictEqual(receivedArgs.stock.toNumber(), 2007, "should be the remaining stock");
                    return energyToken.producers(user1);
                })
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 2007, "should be the remaining stock");
                    return energyToken.getAllowance(user1, user3);
                })
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 4507, "should have consumed some allowance");
                });
        });

    });

    describe("consume without loss, cannot consume more than stock", function() {
        
        var energyToken;

        beforeEach("should create a brand new graph with stock and with allowance to the max", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(2000, { from: user1 }),
                            energyToken.allow(user2, uintMax, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should not be possible to consume more than produced", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, 2001, { from: user2, gas: 3000000 }),
                3000000);
        });

        it("should be possible to consume everything", function() {
            return energyToken.consume.call(user1, 2000, { from: user2 })
                .then(successful => {
                    assert.isTrue(successful, "should have accepted");
                    return energyToken.consume(user1, 2000, { from: user2 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.producers(user1))
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 0, "should be nothing left");
                });
        });

    });
    
    describe("consume with loss, cannot consume more than stock", function() {
        
        var energyToken;

        beforeEach("should create a brand new graph with stock and with allowance to the max", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(2100, { from: user1 }),
                            energyToken.allow(user3, uintMax, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should not be possible to consume more than produced", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, 2001, { from: user3, gas: 3000000 }),
                3000000);
        });

        it("should be possible to consume everything", function() {
            return energyToken.consume.call(user1, 2000, { from: user3 })
                .then(successful => {
                    assert.isTrue(successful, "should have accepted");
                    return energyToken.consume(user1, 2000, { from: user3 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.producers(user1))
                .then(producer => {
                    assert.strictEqual(producer.toNumber(), 0, "should be nothing left");
                });
        });

    });
    
    describe("consume without loss, cannot consume more than allowance", function() {
        
        var energyToken;

        beforeEach("should create a brand new graph with stock and with allowance to the max", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(uintMax, { from: user1 }),
                            energyToken.allow(user2, 2000, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should not be possible to consume more than produced", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, 2001, { from: user2, gas: 3000000 }),
                3000000);
        });

        it("should be possible to consume everything", function() {
            return energyToken.consume.call(user1, 2000, { from: user2 })
                .then(successful => {
                    assert.isTrue(successful, "should have accepted");
                    return energyToken.consume(user1, 2000, { from: user2 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.getAllowance(user1, user2))
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 0, "should be nothing left");
                });
        });

    });
    
    describe("consume with loss, cannot consume more than allowance", function() {
        
        var energyToken;

        beforeEach("should create a brand new graph with stock and with allowance to the max", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(uintMax, { from: user1 }),
                            energyToken.allow(user3, 2100, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should not be possible to consume more than produced", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, 2001, { from: user3, gas: 3000000 }),
                3000000);
        });

        it("should be possible to consume everything", function() {
            return energyToken.consume.call(user1, 2000, { from: user3 })
                .then(successful => {
                    assert.isTrue(successful, "should have accepted");
                    return energyToken.consume(user1, 2000, { from: user3 });
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.getAllowance(user1, user3))
                .then(allowance => {
                    assert.strictEqual(allowance.toNumber(), 0, "should be nothing left");
                });
        });

    });
    
    describe("consume without loss, adjust overflow protection", function() {

        var energyToken, limit;

        beforeEach("should create a brand new graph with max stock and allowance", function() {
            limit = uintMax.dividedBy(100000).floor();
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(uintMax, { from: user1 }),
                            energyToken.allow(user2, uintMax, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should consume, when right below limit", function() {
            return energyToken.consume(user1, limit, { from: user2 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.producers(user1))
                .then(producer => {
                    assert.strictEqual(
                        producer.toString(10),
                        uintMax.minus(limit).toString(10),
                        "should be same");
                });
        });

        it("should fail when no loss, right at limit", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, limit.plus(1), { from: user2, gas: 3000000}),
                3000000);
        });

    });

    describe("consume with loss, adjust overflow protection", function() {

        var energyToken, limit;

        beforeEach("should create a brand new graph with max stock and allowance", function() {
            limit = uintMax.dividedBy(105000).floor();
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(uintMax, { from: user1 }),
                            energyToken.allow(user3, uintMax, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        it("should consume, when right below limit", function() {
            return energyToken.consume(user1, limit, { from: user3 })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt => energyToken.producers(user1))
                .then(producer => {
                    assert.strictEqual(
                        producer.toString(10),
                        uintMax.minus(limit.times(1.05).floor()).toString(10),
                        "should be same");
                });
        });

        it("should fail when no loss, right at limit", function() {
            return Extensions.expectedExceptionPromise(
                () => energyToken.consume(user1, limit.plus(1), { from: user3, gas: 3000000}),
                3000000);
        });

    });

    describe("consume with loss protection against rounding cheat", function() {

        var energyToken;

        beforeEach("should create a brand new graph with stock and allowance", function() {
            return EnergyToken.new(graph.address, { from: user1 })
                .then(created => {
                    energyToken = created;
                    return Promise.all([
                            energyToken.produce(2000, { from: user1 }),
                            energyToken.allow(user3, 2000, { from: user1 })
                        ]);
                })
                .then(web3.eth.getTransactionReceiptMined);
        });

        // TODO

    });
    
});