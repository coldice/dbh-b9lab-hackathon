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
        withLabels: true,
        withEdgeLabels: true,
        labels: function(obj) {
            return obj.data.nodeType;
        },
        labelStyle: {fill: "#378E43"},
        edgeLabels: function(obj) {
            return getEnergyFormatString(obj.data.throughput);
        },
        edgeStyle: {
            'stroke-width': 5,
            fill: '#378E43'
        },
        nodeStyle: {
            fill: '#81C784'
        },
        layoutAttr: {
            size:10,
            linkDistance:200,
            /*linkStrength:2,*/
            friction:0.5,
            /*charge:10,
            theta:0.1,
            gravity:0.2*/
        },
        panZoom: {
            enabled: true,
            scale: false
        }
    }, true);
}

function setupListener() {
    addGraphListener();
    addRegistryListener();
}

function addGraphListener() {
    graph.listenToUpdates(
        (error, confirmationRequired) => {
            if (error) {
                console.error(error);
            } else {
                // TODO show pending confirmation
            }
        },
        (error, linkAdded) => {
            if (error) {
                console.error(error);
            } else {
                var from = linkAdded.args.from;
                var to = linkAdded.args.to;
                var throughput = linkAdded.args.throughput;
                var loss = linkAdded.args.loss;
                addConnection(from, to, throughput, loss);
            }
        }
    );
}

function addRegistryListener() {
    registry.listenToUpdates((error, infoChanged) => {
        console.log(infoChanged);
        if (error) {
            console.error(error);
        } else {
            nodeAddress = infoChanged.args.who;
            nodeName = infoChanged.args.name;
            position = infoChanged.args.location; //JSON.parse(infoChanged.args.location);
            nodeType = infoChanged.args.pointType;
            addNode(nodeAddress, nodeName, position, nodeType);
        }
    });
}

function addNode(address, nodeName, position, nodeType) {
    $("#network_map_container .spinner").remove();
    spinner = null;
    console.log("add node:"+address+" - "+nodeName+position+" - "+nodeType);

    existingNode = G.node.get(address);
    if(existingNode) {
        console.log("update node " + nodeName + "("+address+")");
        existingNode.data = {address:address, nodeName:nodeName, position:position, nodeType:nodeType};
    } else {
        console.log("add new node " + nodeName + "("+address+")")
        //address, {data: {address:address, nodeName:nodeName, position:position, nodeType:nodeType}}
        G.addNode(address, {address:address, nodeName:nodeName, position:position, nodeType:nodeType});
    }
}

function addConnection(from, to, throughput, loss) {
    console.log("add connection from " + from + " to " + to);
    G.addEdge(from, to, {weight: throughput, loss: loss, throughput: throughput, linkDistance: 100});
}

// some helpers
function getEnergyFormatString(energyAmount) {
    if (energyAmount>1000*1000) return energyAmount/(1000*1000) + " MVA";
    if (energyAmount>1000) return energyAmount/(1000) + " kVA";
    return energyAmount + " VA";
}

window.addEventListener(
    "web3Ready",
    () => {
        initGraph();
        setupListener();
    });
