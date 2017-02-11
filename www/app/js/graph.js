graph = {
    filterConfirmationRequired: null,
    filterLinkAdded: null,
    web3: null,
    graphContract: null,
    registryContract: null,

    /**
     * Call this when web3 is ready.
     * @returns nothing.
     */
    prepare: function(web3Object, graphContract, registryContract) {
        graph.web3 = web3Object;
        graph.graphContract = graphContract;
        graph.registryContract = registryContract;
    },

    _infoIndices: {
        loss: 0,
        throughput: 1
    },

    /**
     * Returns a promise that resolves to the "from-to" link info in the form of: {
     *     from: "0x123",
     *     to: "0x123",
     *     loss: 1000, an integer such that 1% is encoded as 1000
     *     throughput: an integer The unit is microWatt.
     *     nameFrom: string,
     *     nameTo: string,
     *     typeFrom: integer of endpoint type,
     *     typeTo: integer of endpoint type,
     * }
     */
    getLinkInfo: function(from, to) {
        var registryDeployed = registry.registryContract.deployed();
        return Promise.all([
                graph.graphContract.deployed().directedLinks(from, to),
                registryDeployed.getInfoOf(from),
                registryDeployed.getInfoOf(to)
            ])
            .then(infos => {
                var info = infos[0];
                info.loss = info[graph._infoIndices.loss].toNumber();
                info.throughput = info[graph._infoIndices.throughput].toNumber();
                info.nameFrom = infos[1].name;
                info.typeFrom = infos[1].pointType;
                info.nameTo = infos[2].name;
                info.typeTo = infos[2].pointType;
                return info;
            });
    },

    /**
     * Takes a link info, and the address of the sender.
     * submitLinkObject is like: {
     *     from: "0x0001020304050607080900010203040506070809",
     *     to: "0x0908070605040302010009080706050403020100",
     *     loss: an integer 1000, // 1%
     *     throughput: an integer 1000000 // 1 kW
     * }
     * returns a promise that resolves to a txHash. The tx is not mined.
     */
    submitLink: function(submitLinkObject, address) {
        return graph.graphContract.deployed().submitLink.sendTransaction(
            submitLinkObject.from,
            submitLinkObject.to,
            submitLinkObject.loss,
            submitLinkObject.throughput,
            { from: address, gas: 1000000 });
    },

    _richLinkAddedCallback: (innerCallbackLinkAdded) => (error, receivedEvent) => {
        if (!error) {
            receivedEvent.args.loss = receivedEvent.args.loss.toNumber();
            receivedEvent.args.throughput = receivedEvent.args.throughput.toNumber();
            return Promise.all([
                    registry.registryContract.getInfoOf(receivedEvent.args.from),
                    registry.registryContract.getInfoOf(receivedEvent.args.to)
                ])
                .then(infos => {
                    receivedEvent.args.nameFrom = infos[0].name;
                    receivedEvent.args.typeFrom = infos[0].pointType;
                    receivedEvent.args.nameTo = infos[1].name;
                    receivedEvent.args.typeTo = infos[1].pointType;
                    innerCallbackLinkAdded(error, receivedEvent);
                })
        } else {
            innerCallbackLinkAdded(error, receivedEvent);
        }
    },

    /**
     * Call this to start listening for events.
     * - callbackConfirmationRequired: a function that accepts (error, requiredArguments).
     * requiredArguments are like {
     *     some other less important arguments,
     *     args: {
     *         key: a bytes32 with the pending confirmation
     *     }
     * }
     * - callbackLinkAdded: a function that accepts (error, addedArguments).
     * requiredArguments are like {
     *     some other less important arguments,
     *     args: {
     *         from: an address with the first endpoint,
     *         to: an address with the second endpoint,
     *         loss: a BigNumber with the loss where 1% is coded as 1000
     *         throughput: a BigNumber with the throughput where 1 mW is coded as 1 
     *     }
     * }
     * @returns nothing.
     */
    listenToUpdates: function(
            callbackConfirmationRequired, callbackLinkAdded) {
        if (graph.filterConfirmationRequired == null) {
            graph.filterConfirmationRequired = graph.graphContract.deployed()
                .OnConfirmationRequired({}, { fromBlock: 0 });
        }
        if (graph.filterLinkAdded == null) {
            graph.filterLinkAdded = graph.graphContract.deployed()
                .LogLinkAdded({}, { fromBlock: 0 });
        }
        graph.filterConfirmationRequired.watch(callbackConfirmationRequired);
        graph.filterLinkAdded.watch(graph._richLinkAddedCallback(callbackLinkAdded));
    },

    /**
     * Call this to stop listening.
     */
    stopListeningToUpdates: function() {
        if (graph.filterConfirmationRequired != null) {
            graph.filterConfirmationRequired.stopWatching();
            graph.filterConfirmationRequired = null;
        }
        if (graph.filterLinkAdded != null) {
            graph.filterLinkAdded.stopWatching();
            graph.filterLinkAdded = null;
        }
    }
};