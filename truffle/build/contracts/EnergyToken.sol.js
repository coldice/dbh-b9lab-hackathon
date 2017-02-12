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
      throw new Error("EnergyToken error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("EnergyToken error: contract binary not set. Can't deploy new instance.");
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

      throw new Error("EnergyToken contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of EnergyToken: " + unlinked_libraries);
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
      throw new Error("Invalid address passed to EnergyToken.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: EnergyToken not deployed or address not set.");
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
        "inputs": [
          {
            "name": "producer",
            "type": "address"
          },
          {
            "name": "consumer",
            "type": "address"
          },
          {
            "name": "original",
            "type": "uint256"
          }
        ],
        "name": "adjust",
        "outputs": [
          {
            "name": "adjusted",
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
            "name": "producer",
            "type": "address"
          },
          {
            "name": "consumer",
            "type": "address"
          }
        ],
        "name": "getAllowance",
        "outputs": [
          {
            "name": "allowance",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_producer",
            "type": "address"
          },
          {
            "name": "howMuch",
            "type": "uint256"
          }
        ],
        "name": "consume",
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
            "type": "address"
          }
        ],
        "name": "producers",
        "outputs": [
          {
            "name": "stock",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "howMuch",
            "type": "uint256"
          }
        ],
        "name": "produce",
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
        "constant": false,
        "inputs": [
          {
            "name": "consumer",
            "type": "address"
          },
          {
            "name": "howMuch",
            "type": "uint256"
          }
        ],
        "name": "allow",
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
        "inputs": [],
        "name": "graph",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_graph",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyProduced",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "total",
            "type": "uint256"
          }
        ],
        "name": "LogConsumptionAllowed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "adjusted",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyConsumed",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052346100005760405160208061055d83398101604052515b600160a060020a038116151561003057610000565b60008054600160a060020a031916600160a060020a0383161790555b505b6105008061005d6000396000f300606060405236156100675763ffffffff60e060020a60003504166303b175db811461006c5780630af4187d146100a0578063224b5c72146100d157806326324eff1461010157806365da56031461012c5780636c6f31f214610150578063bf20f50214610180575b610000565b346100005761008e600160a060020a03600435811690602435166044356101a9565b60408051918252519081900360200190f35b346100005761008e600160a060020a036004358116906024351661025f565b60408051918252519081900360200190f35b34610000576100ed600160a060020a036004351660243561028f565b604080519115158252519081900360200190f35b346100005761008e600160a060020a0360043516610366565b60408051918252519081900360200190f35b34610000576100ed600435610378565b604080519115158252519081900360200190f35b34610000576100ed600160a060020a03600435166024356103f3565b604080519115158252519081900360200190f35b346100005761018d6104c5565b60408051600160a060020a039092168252519081900360200190f35b6000805460408051810183905280517f1dc2595b000000000000000000000000000000000000000000000000000000008152600160a060020a0387811660048301528681166024830152825185948594921692631dc2595b92604480830193919282900301818787803b156100005760325a03f1156100005750506040518051602090910151909350915050620186a08201840284901161024957610000565b620186a082810185020492505b50509392505050565b600160a060020a038083166000908152600160208181526040808420948616845293909101905220545b92915050565b600160a060020a0382166000908152600160205260408120816102b38533866101a9565b600160a060020a0333166000908152600184016020526040902054909150819010806102e0575081548190105b156102ea57610000565b81548190038255600160a060020a033381166000818152600185016020908152604091829020805486900390558554825189815291820186905281830152905191928816917f12e7b6d1129f0c3f7220b86811327fd6a28f796a2202d63580273f046d982d4f9181900360600190a3600192505b505092915050565b60016020526000908152604090205481565b600160a060020a033316600090815260016020526040812080548301838110156103a157610000565b80825560408051858152602081018390528151600160a060020a033316927f839739a3668f7238e9668f81cea9e3b427d87f4a8ed9a95f1bb51270dc82b742928290030190a2600192505b5050919050565b60006000600033600160a060020a031685600160a060020a0316141561041857610000565b5050600160a060020a0333811660009081526001602081815260408084209488168452918401905290205483018381101561045257610000565b600160a060020a033381166000818152600160208181526040808420958b1680855295909201815291819020859055805188815291820185905280517f01e608736b5a93796f6bfc17d3a4460b141d4f8e1c6cbf5afd368c99e147f6219281900390910190a3600192505b505092915050565b600054600160a060020a0316815600a165627a7a7230582018bce311bcdb65ad2e0c3b2d0fc23517253eb26b953aeb164667e52c8ee139040029",
    "events": {
      "0x839739a3668f7238e9668f81cea9e3b427d87f4a8ed9a95f1bb51270dc82b742": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyProduced",
        "type": "event"
      },
      "0x01e608736b5a93796f6bfc17d3a4460b141d4f8e1c6cbf5afd368c99e147f621": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "total",
            "type": "uint256"
          }
        ],
        "name": "LogConsumptionAllowed",
        "type": "event"
      },
      "0x12e7b6d1129f0c3f7220b86811327fd6a28f796a2202d63580273f046d982d4f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "adjusted",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyConsumed",
        "type": "event"
      }
    },
    "updated_at": 1486866005325,
    "links": {},
    "address": "0x63fbb981296e668fb64c0bd14bf20fafd0e6435c"
  },
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "producer",
            "type": "address"
          },
          {
            "name": "consumer",
            "type": "address"
          },
          {
            "name": "original",
            "type": "uint256"
          }
        ],
        "name": "adjust",
        "outputs": [
          {
            "name": "adjusted",
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
            "name": "producer",
            "type": "address"
          },
          {
            "name": "consumer",
            "type": "address"
          }
        ],
        "name": "getAllowance",
        "outputs": [
          {
            "name": "allowance",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_producer",
            "type": "address"
          },
          {
            "name": "howMuch",
            "type": "uint256"
          }
        ],
        "name": "consume",
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
            "type": "address"
          }
        ],
        "name": "producers",
        "outputs": [
          {
            "name": "stock",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "howMuch",
            "type": "uint256"
          }
        ],
        "name": "produce",
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
        "constant": false,
        "inputs": [
          {
            "name": "consumer",
            "type": "address"
          },
          {
            "name": "howMuch",
            "type": "uint256"
          }
        ],
        "name": "allow",
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
        "inputs": [],
        "name": "graph",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_graph",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyProduced",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "total",
            "type": "uint256"
          }
        ],
        "name": "LogConsumptionAllowed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "adjusted",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyConsumed",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052346100005760405160208061055d83398101604052515b600160a060020a038116151561003057610000565b60008054600160a060020a031916600160a060020a0383161790555b505b6105008061005d6000396000f300606060405236156100675763ffffffff60e060020a60003504166303b175db811461006c5780630af4187d146100a0578063224b5c72146100d157806326324eff1461010157806365da56031461012c5780636c6f31f214610150578063bf20f50214610180575b610000565b346100005761008e600160a060020a03600435811690602435166044356101a9565b60408051918252519081900360200190f35b346100005761008e600160a060020a036004358116906024351661025f565b60408051918252519081900360200190f35b34610000576100ed600160a060020a036004351660243561028f565b604080519115158252519081900360200190f35b346100005761008e600160a060020a0360043516610366565b60408051918252519081900360200190f35b34610000576100ed600435610378565b604080519115158252519081900360200190f35b34610000576100ed600160a060020a03600435166024356103f3565b604080519115158252519081900360200190f35b346100005761018d6104c5565b60408051600160a060020a039092168252519081900360200190f35b6000805460408051810183905280517f1dc2595b000000000000000000000000000000000000000000000000000000008152600160a060020a0387811660048301528681166024830152825185948594921692631dc2595b92604480830193919282900301818787803b156100005760325a03f1156100005750506040518051602090910151909350915050620186a08201840284901161024957610000565b620186a082810185020492505b50509392505050565b600160a060020a038083166000908152600160208181526040808420948616845293909101905220545b92915050565b600160a060020a0382166000908152600160205260408120816102b38533866101a9565b600160a060020a0333166000908152600184016020526040902054909150819010806102e0575081548190105b156102ea57610000565b81548190038255600160a060020a033381166000818152600185016020908152604091829020805486900390558554825189815291820186905281830152905191928816917f12e7b6d1129f0c3f7220b86811327fd6a28f796a2202d63580273f046d982d4f9181900360600190a3600192505b505092915050565b60016020526000908152604090205481565b600160a060020a033316600090815260016020526040812080548301838110156103a157610000565b80825560408051858152602081018390528151600160a060020a033316927f839739a3668f7238e9668f81cea9e3b427d87f4a8ed9a95f1bb51270dc82b742928290030190a2600192505b5050919050565b60006000600033600160a060020a031685600160a060020a0316141561041857610000565b5050600160a060020a0333811660009081526001602081815260408084209488168452918401905290205483018381101561045257610000565b600160a060020a033381166000818152600160208181526040808420958b1680855295909201815291819020859055805188815291820185905280517f01e608736b5a93796f6bfc17d3a4460b141d4f8e1c6cbf5afd368c99e147f6219281900390910190a3600192505b505092915050565b600054600160a060020a0316815600a165627a7a7230582018bce311bcdb65ad2e0c3b2d0fc23517253eb26b953aeb164667e52c8ee139040029",
    "events": {
      "0x839739a3668f7238e9668f81cea9e3b427d87f4a8ed9a95f1bb51270dc82b742": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyProduced",
        "type": "event"
      },
      "0x01e608736b5a93796f6bfc17d3a4460b141d4f8e1c6cbf5afd368c99e147f621": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "total",
            "type": "uint256"
          }
        ],
        "name": "LogConsumptionAllowed",
        "type": "event"
      },
      "0x12e7b6d1129f0c3f7220b86811327fd6a28f796a2202d63580273f046d982d4f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "producer",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "consumer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "howMuch",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "adjusted",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "stock",
            "type": "uint256"
          }
        ],
        "name": "LogEnergyConsumed",
        "type": "event"
      }
    },
    "updated_at": 1486866073168
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

  Contract.contract_name   = Contract.prototype.contract_name   = "EnergyToken";
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
    window.EnergyToken = Contract;
  }
})();
