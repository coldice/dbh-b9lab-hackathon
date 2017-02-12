var G;
function initGraph() {
    console.log("init graph");
    G = new jsnx.DiGraph();

    //G.addNodesFrom([1,2,3,4,5,[9,{color: '#008A00'}]], {color: '#0064C7'});
    //G.addCycle([1,2,3,4,5]);
    //G.addEdgesFrom([[1,9], [9,1]]);

    jsnx.draw(G, {
        element: '#network_map_container',  
        weighted: true,
        edgeStyle: {
            'stroke-width': 10
        }
    }, true);
}

function setupListener() {
    registry.listenToUpdates((error, infoChanged) => {
        console.log(infoChanged);
        if (error) {
            console.error(error);
        } else {
            //try {
                nodeAddress = infoChanged.args.who;
                nodeName = infoChanged.args.name;
                position = infoChanged.args.location; //JSON.parse(infoChanged.args.location);
                nodeType = infoChanged.args.pointType;
                addNode(nodeAddress, nodeName, position, nodeType);
            //} catch(error) {
            //    console.log("Cannot parse", infoChanged.args.location);
            //}
        }
    });
}

function addNode(address, nodeName, position, nodeType) {
    console.log("add node:"+address+" - "+nodeName+position+" - "+nodeType);

    existingNode = G.node.get(address);
    if(existingNode) {
        console.log("update node " + address);
        existingNode.data = {address:address, nodeName:nodeName, position:position, nodeType:nodeType};
    } else {
        G.addNode(address, {data: {address:address, nodeName:nodeName, position:position, nodeType:nodeType}});
    }
}

function addConnection(from, to, capacity, loss) {
    G.addEdge(from, to, {weight: capacity, loss: loss, capacity: capacity});
}

window.addEventListener(
    "web3Ready",
    () => {
        initGraph();
        setupListener();
    });
