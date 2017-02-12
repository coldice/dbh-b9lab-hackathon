energyToken = {
    filterEnergyProduced: null,
    filterConsumptionAllowed: null,
    filterEnergyConsumed: null,
    energyContract: null,
    web3: null,

    /**
     * Call this when web3 is ready.
     * pass along the RegistryContract EtherPudding.
     * @returns nothing.
     */
    prepare: function(web3Object, energyContract) {
        registry.energyContract = energyContract;
        registry.web3 = web3Object;
    },

    /**
     * Returns an object: {
     *     address: address,
     *     name: string
     *     stock: number, in Joule
     * }
     */
    getProducerInfo: function(address) {
        return Promise.all([
                registry.getInfoOf(address),
                energyToken.energyContract.deployed().producers(address)
            ])
            .then(values => {
                var info = values[0];
                info.stock = values[1].toNumber();
                return info;
            });
    },

    /**
     * Returns an object: {
     *     producer: {
     *         address: address,
     *         name: name,
     *     },
     *     consumer: {
     *         address: address,
     *         name: name,
     *     },
     *     loss: integer,
     *     allowance: integer,
     *     realAllowance: integer
     * }
     */
    getAllowanceInfo: function(producer, consumer) {
        return Promise.all([
                energyToken.energyContract.deployed().getAllowance(producer, consumer),
                graph.getLinkInfo(producer, consumer)
            ])
            .then(values => {
                var info = {
                    producer: {
                        address: producer,
                        name: values[1].nameFrom
                    },
                    consumer: {
                        address: consumer,
                        name: values[1].nameTo
                    },
                    loss: values[1].loss,
                    allowance: values[0].toNumber(),
                    realAllowance: values[0].times(100000).dividedBy(100000 + values[1].loss).toNumber()
                };
                return info;
            });
    },

    produce: function(producer, amount) {
        return energyToken.energyContract.deployed()
            .produce(amount, { from: producer });
    },

    allow: function(producer, consumer, total) {
        return energyToken.energyContract.deployed()
            .allow(consumer, total, { from: producer });
    },

    consume: function(producer, consumer, amount) {
        return energyToken.energyContract.deployed()
            .consume(producer, amount, { from: consumer });
    },

    _richEnergyProducedCallback: (innerCallbackEnergyProduced) => (error, receivedEvent) => {
        if (!error) {
            receivedEvent.args.howMuch = receivedEvent.args.howMuch.toNumber();
            receivedEvent.args.stock = receivedEvent.args.stock.toNumber();
        }
        innerCallbackEnergyProduced(error, receivedEvent);
    },

    _richConsumptionAllowedCallback: (innerCallbackConsumptionAllowed) => (error, receivedEvent) => {
        if (!error) {
            receivedEvent.args.howMuch = receivedEvent.args.howMuch.toNumber();
            receivedEvent.args.total = receivedEvent.args.total.toNumber();
        }
        innerCallbackConsumptionAllowed(error, receivedEvent);
    },

    _richEnergyConsumedCallback: (innerCallbackEnergyConsumed) => (error, receivedEvent) => {
        if (!error) {
            receivedEvent.args.howMuch = receivedEvent.args.howMuch.toNumber();
            receivedEvent.args.stock = receivedEvent.args.stock.toNumber();
        }
        innerCallbackEnergyConsumed(error, receivedEvent);
    },

    listenToUpdated: function(
        callbackEnergyProduced, callbackConsumptionAllowed, callbackEnergyConsumed) {
        if (graph.filterEnergyProduced == null) {
            graph.filterEnergyProduced = graph.graphContract.deployed()
                .LogEnergyProduced({}, { fromBlock: 516462 });
        }
        if (graph.filterConsumptionAllowed == null) {
            graph.filterConsumptionAllowed = graph.graphContract.deployed()
                .LogConsumptionAllowed({}, { fromBlock: 516462 });
        }
        if (graph.filterEnergyConsumed == null) {
            graph.filterEnergyConsumed = graph.graphContract.deployed()
                .LogEnergyConsumed({}, { fromBlock: 516462 });
        }
        graph.filterEnergyProduced.watch(graph._richEnergyProducedCallback(callbackEnergyProduced));
        graph.filterConsumptionAllowed.watch(graph._richConsumptionAllowedCallback(callbackConsumptionAllowed));
        graph.filterEnergyConsumed.watch(graph._richEnergyConsumedCallback(callbackEnergyConsumed));
    },

    /**
     * Call this to stop listening.
     */
    stopListeningToUpdates: function() {
        if (graph.filterEnergyProduced != null) {
            graph.filterEnergyProduced.stopWatching();
            graph.filterConfilterEnergyProducedfirmationRequired = null;
        }
        if (graph.filterConsumptionAllowed != null) {
            graph.filterConsumptionAllowed.stopWatching();
            graph.filterConsumptionAllowed = null;
        }
        if (graph.filterEnergyConsumed != null) {
            graph.filterEnergyConsumed.stopWatching();
            graph.filterEnergyConsumed = null;
        }
    },
}