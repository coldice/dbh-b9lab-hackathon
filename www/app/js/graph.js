graph = {
    filterConfirmationRequired: null,
    filterLinkAdded: null,
    graphContract: null,

    sampleSubmitLinkObject: {
        from: "0x0001020304050607080900010203040506070809",
        to: "0x0908070605040302010009080706050403020100",
        loss: 1000, // 1%
        throughput: 1000000 // 1 kW
    },

    /**
     * Call this when web3 is ready.
     * @returns an empty promise.
     */
    prepare: function(web3, graphContract) {
        graph.graphContract = graphContract;
        graphContract.setProvider(web3.currentProvider);
        return web3.version.getNetworkPromise()
            .then(version => {
                graphContract.setNetwork(version);
            });
    },

    /**
     * Takes a link as per the sample above, and the address of the sender.
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
        if (typeof requiredByWhat == "undefined") {
            requiredByWhat = {};
        }
        if (typeof addedByWhat == "undefined") {
            addedByWhat = {};
        }
        if (graph.filterConfirmationRequired == null) {
            graph.filterConfirmationRequired = graph.graphContract.deployed()
                .OnConfirmationRequired({}, { fromBlock: 0 });
        }
        if (graph.filterLinkAdded == null) {
            graph.filterLinkAdded = graph.graphContract.deployed()
                .LogLinkAdded({}, { fromBlock: 0 });
        }
        graph.filterConfirmationRequired.watch(callbackConfirmationRequired);
        graph.filterLinkAdded.watch(callbackLinkAdded);
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