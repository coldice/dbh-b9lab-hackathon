module.exports = {
    build: {
        "app.js": [
          "javascripts/app.js"
        ],
    },
    rpc: {
        host: "localhost",
        port: 8545
    },
    networks: {
        ropsten: {
            network_id: 3
        }
    }
};
