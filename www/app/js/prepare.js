window.addEventListener('load', function() {                    
    // Supports Mist, and other wallets that provide 'web3'.      
    if (typeof web3 !== 'undefined') {
        // Use the Mist/wallet provider.
        window.web3 = new Web3(web3.currentProvider);
    } else {                                                      
        // Use the provider from the config.                        
        window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
    }

    // Our own utils
    Utils.init(web3);

    [Graph,Migrations,Registry,EnergyToken].forEach(function(contract) {
        contract.setProvider(window.web3.currentProvider);
    });
    
    return web3.version.getNetworkPromise()
        .then(version => {
            [Graph,Migrations,Registry,EnergyToken].forEach(function(contract) {
                contract.setNetwork(version);
            });
        
            if (typeof registry != "undefined") {
                registry.prepare(web3, Registry);
            }
            if (typeof graph != "undefined") {
                graph.prepare(web3, Graph);
            }
            if (typeof energyToken != "undefined") {
                energyToken.prepare(web3, EnergyToken);
            }
        })
        .then(() => {
            var event = new CustomEvent("web3Ready", {});
            window.dispatchEvent(event);
        });
});
