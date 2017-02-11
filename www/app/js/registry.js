registry = {
    filter: null,
    registryContract: null,
    web3: null,

    /**
     * Call this when web3 is ready.
     * pass along the RegistryContract EtherPudding.
     * @returns an empty promise.
     */
    prepare: function(web3Object, registryContract) {
        registry.registryContract = registryContract;
        registry.web3 = web3Object;
        registryContract.setProvider(web3Object.currentProvider);
        return web3Object.version.getNetworkPromise()
            .then(version => {
                registryContract.setNetwork(version);
            });
    },

    _infoIndices: {
        name: 0,
        pointType: 1,
        location: 2
    },

    /**
     * Call this to get the info related to an address
     * returns a promise with the info in the form of:
     * {
     *     address: same as the requested address, hex string
     *     name: the name associated to it, a text string
     *     pointType: the point type, an integer
     *     location: the location, a string
     * }
     */
    getInfoOf: function(address) {
        return registry.registryContract.deployed()
            .infos(address)
            .then(infos => ({
                address: address,
                name: registry.web3.toUtf8(infos[registry._infoIndices.name]),
                pointType: infos[registry._infoIndices.pointType].toNumber(),
                location: infos[registry._infoIndices.location]
            }));
    },

    /**
     * Call this to get the address behind a name.
     * returns a promise with the address.
     */
    getAddressOf: function(name) {
        return registry.registryContract.deployed()
            .addresses(name);
    },

    /**
     * Call this to set the info to the address
     * Expects info of the type: {
     *     name: a 32-byte string at most
     *     pointType: an integer
     *     location: a string
     * }
     * returns a promise with the transaction hash.
     * the transaction may not be mined yet.
     */
    setInfoTo: function(info, address) {
        return registry.registryContract.deployed()
            .setInfo.sendTransaction(
                info.name, info.pointType, info.location,
                { from: address, gas: 500000 });
    },

    /**
     * Call this to start listening for events.
     * callback: a function that accepts (error, updateArguments).
     * updateArguments are like {
     *     some other less important arguments,
     *     args: {
     *         who: an address,
     *         name: a name in string,
     *         pointType: an integer,
     *         location: a string
     *     }
     * }
     * @returns nothing.
     */
    listenToUpdates: function(callback) {
        if (registry.filter == null) {
            registry.filter = registry.registryContract.deployed().LogNameChanged({}, { fromBlock: 0 });
        }
        registry.filter.watch((error, receivedEvent) => {
            if (error) {
                callback(error);
            } else {
                receivedEvent.args.name = registry.web3.toUtf8(receivedEvent.args.name);
                receivedEvent.args.pointType = receivedEvent.args.pointType.toNumber();
                callback(error, receivedEvent);
            }
        });
    },

    /**
     * Call this to stop listening.
     */
    stopListeningToUpdates: function() {
        registry.filter.stopWatching();
        registry.filter = null;
    }
}