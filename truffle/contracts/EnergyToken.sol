pragma solidity ^0.4.5;

import "Graph.sol";

contract EnergyToken {
    Graph public graph;

    struct Producer {
        uint stock;
        mapping(address => uint) allowance;
    }

    mapping(address => Producer) public producers;

    /**
     * producer is the producer
     * howMuch is the energy just produced in Joule
     * stock is the stock to be sold
     */
    event LogEnergyProduced(address indexed producer, uint howMuch, uint stock);

    /**
     * producer allows consumer to consumer "howMuch" amount.
     */
    event LogConsumptionAllowed(address indexed producer, address indexed consumer, uint howMuch, uint total);

    /**
     * "howMuch" of producer has been consumed by consumer, which corresponds to "adjusted"
     * on the producer side, leaving "stock" in stock
     */
    event LogEnergyConsumed(address indexed producer, address indexed consumer, uint howMuch, uint adjusted, uint stock);

    function EnergyToken(address _graph) {
        if (_graph == 0) {
            throw;
        }
        graph = Graph(_graph);
    }

    function getAllowance(address producer, address consumer)
        constant
        returns (uint allowance) {
        return producers[producer].allowance[consumer];
    }

    /**
     * The energy is 1 Joule.
     */
    function produce(uint howMuch) 
        returns (bool successful) {
        Producer storage producer = producers[msg.sender];
        uint nextStock = producer.stock + howMuch;
        if (nextStock < howMuch) {
            throw;
        }
        producer.stock = nextStock;
        LogEnergyProduced(msg.sender, howMuch, nextStock);
        return true;
    }

    function allow(address consumer, uint howMuch)
        returns (bool successful) {
        if (consumer == msg.sender) {
            throw;
        }
        Producer storage producer = producers[msg.sender];
        uint nextAllowance = producer.allowance[consumer] + howMuch;
        if (nextAllowance < howMuch) {
            throw;
        }
        producers[msg.sender].allowance[consumer] = nextAllowance;
        LogConsumptionAllowed(msg.sender, consumer, howMuch, nextAllowance);
        return true;
    }

    /**
     * adjust consumption according to line losses.
     */
    function adjust(address producer, address consumer, uint original)
        constant
        returns (uint adjusted) {
        uint loss;
        uint throughput;
        (loss, throughput) = graph.directedLinks(producer, consumer);
        if ((100000 + loss) * original <= original) {
            throw;
        }
        adjusted = ((100000 + loss) * original) / 100000;
    }

    /**
     * Consumer indicates how much it has consumed on its own end.
     */
    function consume(address _producer, uint howMuch) 
        returns (bool successful) {
        Producer storage producer = producers[_producer];
        uint adjusted = adjust(_producer, msg.sender, howMuch);
        if (producer.allowance[msg.sender] < adjusted
            || producer.stock < adjusted) {
            throw;
        }
        producer.stock -= adjusted;
        producer.allowance[msg.sender] -= adjusted;
        LogEnergyConsumed(_producer, msg.sender, howMuch, adjusted, producer.stock);
        return true;
    }
}