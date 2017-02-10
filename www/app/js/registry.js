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
	listenToUpdates: function(callback) {
		if (registry.filter == null) {
			registry.filter = Registry.deployed().LogNameChanged({}, { fromBlock: 0 });
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