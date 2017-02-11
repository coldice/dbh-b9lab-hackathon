var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Graph error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Graph error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Graph contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Graph: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Graph.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Graph not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "3": {
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "requiredCount",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          },
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "directedLinks",
        "outputs": [
          {
            "name": "loss",
            "type": "uint256"
          },
          {
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          }
        ],
        "name": "isYourLink",
        "outputs": [
          {
            "name": "isIndeed",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "key",
            "type": "bytes32"
          },
          {
            "name": "user",
            "type": "address"
          }
        ],
        "name": "getConfirmationOf",
        "outputs": [
          {
            "name": "confirmed",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "calculateKey",
        "outputs": [
          {
            "name": "key",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "loss",
            "type": "uint256"
          },
          {
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "name": "submitLink",
        "outputs": [
          {
            "name": "successful",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "confirmations",
        "outputs": [
          {
            "name": "count",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "loss",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "name": "LogLinkAdded",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "key",
            "type": "bytes32"
          }
        ],
        "name": "OnConfirmationRequired",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405234610000575b60025b60008190555b505b5b610512806100256000396000f300606060405236156100675763ffffffff60e060020a60003504166306c7dbb5811461006c5780631dc2595b1461008b5780633a07bfb3146100c3578063613bf18a146100f6578063a495b15314610126578063bfd58bdf1461018b578063ec95bfe7146101c4575b610000565b34610000576100796101e6565b60408051918252519081900360200190f35b34610000576100aa600160a060020a03600435811690602435166101ec565b6040805192835260208301919091528051918290030190f35b34610000576100e2600160a060020a0360043581169060243516610210565b604080519115158252519081900360200190f35b34610000576100e2600435600160a060020a036024351661024c565b604080519115158252519081900360200190f35b3461000057610079600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284375094965061027b95505050505050565b60408051918252519081900360200190f35b34610000576100e2600160a060020a03600435811690602435166044356064356102e2565b604080519115158252519081900360200190f35b346100005761007960043561045e565b60408051918252519081900360200190f35b60005481565b60026020908152600092835260408084209091529082529020805460019091015482565b600082600160a060020a031633600160a060020a03161480610243575081600160a060020a031633600160a060020a0316145b90505b92915050565b6000828152600160208181526040808420600160a060020a0386168552909201905290205460ff165b92915050565b6000816040518082805190602001908083835b602083106102ad5780518252601f19909201916020918201910161028e565b6001836020036101000a038019825116818451168082178552505050505050905001915050604051809103902090505b919050565b60008484600160a060020a03821615806103035750600160a060020a038116155b8061031557506103138282610210565b155b80610331575080600160a060020a031682600160a060020a0316145b1561033b57610000565b600060006103796000368080601f0160208091040260200160405190810160405280939291908181526020018383808284375061027b945050505050565b915061038482610470565b90506000548110156103ca5780600114156103c55760405182907f4963a972da476bee0ffe33a2b3eb0bfcb1aa1d75717e3ff5103b40e356055e3b90600090a25b610450565b6040805180820182528881526020808201898152600160a060020a03808e16600081815260028552868120928f1680825292855286902094518555915160019094019390935583518b81529182018a90528351929390927fc0e8693a712ee49068f452bfc718b4b43b15252c5c6403e371d956bcd9c588c39281900390910190a3600194505b5b50505b5050949350505050565b60016020526000908152604090205481565b6000818152600160208181526040808420600160a060020a0333168552909201905281205460ff16156104a257610000565b506000818152600160208181526040808420600160a060020a03331685528084018352908420805460ff19168417905592849052819052815401908190555b9190505600a165627a7a72305820e3e41473de986ac0626c5e1d89e9194eb5abdb5a101c71415cf60e3d112fc9b10029",
    "events": {
      "0xc0e8693a712ee49068f452bfc718b4b43b15252c5c6403e371d956bcd9c588c3": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "loss",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "name": "LogLinkAdded",
        "type": "event"
      },
      "0x4963a972da476bee0ffe33a2b3eb0bfcb1aa1d75717e3ff5103b40e356055e3b": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "key",
            "type": "bytes32"
          }
        ],
        "name": "OnConfirmationRequired",
        "type": "event"
      }
    },
    "updated_at": 1486844963757,
    "links": {},
    "address": "0x8a7596eab3a36af7507ffd7c1bf386efd702ddba"
  },
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "requiredCount",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          },
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "directedLinks",
        "outputs": [
          {
            "name": "loss",
            "type": "uint256"
          },
          {
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          }
        ],
        "name": "isYourLink",
        "outputs": [
          {
            "name": "isIndeed",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "key",
            "type": "bytes32"
          },
          {
            "name": "user",
            "type": "address"
          }
        ],
        "name": "getConfirmationOf",
        "outputs": [
          {
            "name": "confirmed",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "calculateKey",
        "outputs": [
          {
            "name": "key",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "loss",
            "type": "uint256"
          },
          {
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "name": "submitLink",
        "outputs": [
          {
            "name": "successful",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "confirmations",
        "outputs": [
          {
            "name": "count",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "loss",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "name": "LogLinkAdded",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "key",
            "type": "bytes32"
          }
        ],
        "name": "OnConfirmationRequired",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405234610000575b60025b60008190555b505b5b610512806100256000396000f300606060405236156100675763ffffffff60e060020a60003504166306c7dbb5811461006c5780631dc2595b1461008b5780633a07bfb3146100c3578063613bf18a146100f6578063a495b15314610126578063bfd58bdf1461018b578063ec95bfe7146101c4575b610000565b34610000576100796101e6565b60408051918252519081900360200190f35b34610000576100aa600160a060020a03600435811690602435166101ec565b6040805192835260208301919091528051918290030190f35b34610000576100e2600160a060020a0360043581169060243516610210565b604080519115158252519081900360200190f35b34610000576100e2600435600160a060020a036024351661024c565b604080519115158252519081900360200190f35b3461000057610079600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284375094965061027b95505050505050565b60408051918252519081900360200190f35b34610000576100e2600160a060020a03600435811690602435166044356064356102e2565b604080519115158252519081900360200190f35b346100005761007960043561045e565b60408051918252519081900360200190f35b60005481565b60026020908152600092835260408084209091529082529020805460019091015482565b600082600160a060020a031633600160a060020a03161480610243575081600160a060020a031633600160a060020a0316145b90505b92915050565b6000828152600160208181526040808420600160a060020a0386168552909201905290205460ff165b92915050565b6000816040518082805190602001908083835b602083106102ad5780518252601f19909201916020918201910161028e565b6001836020036101000a038019825116818451168082178552505050505050905001915050604051809103902090505b919050565b60008484600160a060020a03821615806103035750600160a060020a038116155b8061031557506103138282610210565b155b80610331575080600160a060020a031682600160a060020a0316145b1561033b57610000565b600060006103796000368080601f0160208091040260200160405190810160405280939291908181526020018383808284375061027b945050505050565b915061038482610470565b90506000548110156103ca5780600114156103c55760405182907f4963a972da476bee0ffe33a2b3eb0bfcb1aa1d75717e3ff5103b40e356055e3b90600090a25b610450565b6040805180820182528881526020808201898152600160a060020a03808e16600081815260028552868120928f1680825292855286902094518555915160019094019390935583518b81529182018a90528351929390927fc0e8693a712ee49068f452bfc718b4b43b15252c5c6403e371d956bcd9c588c39281900390910190a3600194505b5b50505b5050949350505050565b60016020526000908152604090205481565b6000818152600160208181526040808420600160a060020a0333168552909201905281205460ff16156104a257610000565b506000818152600160208181526040808420600160a060020a03331685528084018352908420805460ff19168417905592849052819052815401908190555b9190505600a165627a7a7230582082406be3a6677c9dd4dd9350fd414ddd742c53b7cc5664fda026a3b662f301200029",
    "events": {
      "0xc0e8693a712ee49068f452bfc718b4b43b15252c5c6403e371d956bcd9c588c3": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "loss",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "throughput",
            "type": "uint256"
          }
        ],
        "name": "LogLinkAdded",
        "type": "event"
      },
      "0x4963a972da476bee0ffe33a2b3eb0bfcb1aa1d75717e3ff5103b40e356055e3b": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "key",
            "type": "bytes32"
          }
        ],
        "name": "OnConfirmationRequired",
        "type": "event"
      }
    },
    "updated_at": 1486844974665,
    "links": {}
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Graph";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Graph = Contract;
  }
})();
