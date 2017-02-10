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

    [Graph,Migrations,Registry].forEach(function(contract) {
        contract.setProvider(window.web3.currentProvider);
    });
    
    if (typeof registry != "undefined") {
        registry.prepare(web3);
    }
});
