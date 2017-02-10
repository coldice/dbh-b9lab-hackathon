var registry = {
    filter: null,

    /**
     * Call this when web3 is ready.
     * @returns an empty promise.
     */
    prepare: function(web3) {
        Registry.setProvider(web3.currentProvider);
        return web3.net.getVersion()
            .then(version => {
                Registry.setNetwork(version);
            });
    },

    /**
     * Call this to get the name of an address
     * returns a promise with the name.
     */
    getNameOf: function(address) {
        return Registry.deployed()
            .names(address);
    },

    /**
     * Call this to get the address behind a name.
     * returns a promise with the address.
     */
    getAddressOf: function(name) {
        return Registry.deployed()
            .addresses(name);
    },

    /**
     * Call this to set the name to the address
     * returns a promise with the transaction hash.
     * the transaction is not mined yet.
     */
    setNameTo: function(newName, address) {
        return Registry.setName.sendTransaction(newName, { from: address, gas: 500000 });
    },

    /**
     * Call this to start listening for events.
     * callback: a function that accepts (error, updateArguments).
     * updateArguments are like {
     *     some other less important arguments,
     *     args: {
     *         who: an address,
     *         name: a name,
     *     }
     * }
     * @returns nothing.
     */
    listenToUpdates: function(callback, byWhat) {
        if (typeof byWhat == "undefined") {
            byWhat = {};
        }
        if (registry.filter == null) {
            registry.filter = Registry.deployed().LogNameChanged(byWhat, { fromBlock: 0 });
        }
        registry.filter.watch(callback);
    },

    /**
     * Call this to stop listening.
     */
    stopListeningToUpdates: function() {
        registry.filter.stopWatching();
        registry.filter = null;
    }
}