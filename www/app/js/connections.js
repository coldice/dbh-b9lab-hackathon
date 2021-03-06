function updateUi() {
    var tbodyObject = $("tbody#connection");
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
                    $("#spinner-location").remove();
                    spinner = null;
                    findOrCreateAndPopulateConnectionRow(tbodyObject, linkAdded.args);
                }
            }
        );
}

/**
 * Returns an empty <tr> that is not yet added to the DOM.
 * It will represent a connection in list-connection.html.
 * All fields are ready to be populated.
 */
function createEmptyConnectionRow() {
    var tr = $("<tr/>").addClass("data-row");
    var thIndex = $("<th/>").addClass("linkIndex text-center").attr("scope", "row").appendTo(tr);
    var tdNameFrom = $("<td/>").addClass("nameFrom text-center").appendTo(tr);
    var tdTypeFrom = $("<td/>").addClass("typeFrom text-center").appendTo(tr);
    var tdBlockieFrom = $("<td/>").addClass("blockieFrom text-center").appendTo(tr);
    var imgBlockieFrom = $("<img/>").addClass("blockieIcon blockieIconFrom").appendTo(tdBlockieFrom);
    var tdLoss = $("<td/>").addClass("loss text-center").appendTo(tr);
    var tdThroughput = $("<td/>").addClass("throughput text-center-center").appendTo(tr);
    var tdBlockieTo = $("<td/>").addClass("blockieTo text-center").appendTo(tr);
    var imgBlockieTo = $("<img/>").addClass("blockieIcon blockieIconTo").appendTo(tdBlockieTo);
    var tdTypeTo = $("<td/>").addClass("typeTo text-center").appendTo(tr);
    var tdNameTo = $("<td/>").addClass("nameTo text-center").appendTo(tr);

    var tdAction = $("<td/>").addClass("text-center").appendTo(tr);

/*
    var buttonConfirm = $("<button/>").html("Confirm").addClass("btn btn-primary confirm").attr({
            "type": "button",
            "data-type": "autoButton",
            "data-action": "get",
            "data-target": "confirm.html"
        }).appendTo(tdAction);
*/
    var buttonRemove = $("<button/>").html("Remove").addClass("btn btn-primary remove").attr({
            "type": "button",
            "data-type": "autoButton",
            "data-action": "get",
            "data-target": "remove.html"
        }).appendTo(tdAction);
    return tr;

}

/**
 * Populates a <tr> object with the info associated.
 * connection Info is in the form of: {
 *      from : hex string
 *      to : hex string
 *      nameFrom : string
 *      nameTo : string
 *      typeFrom : number
 *      typeTo : number 
 *      linkIndex : number (optional)
 * }
 */
function populateConnectionRow(trObject, connectionInfo) {
    trObject.attr({
        "data-from": connectionInfo.from,
        "data-to": connection.to
    }); 
    if(typeof(connectionInfo.linkIndex) != "undefined") {
        trObject.find("th.linkIndex").html(connectionInfo.linkIndex);
    }
    trObject.find("td.blockieFrom").attr('title', connectionInfo.from);
    trObject.find("img.blockieIconFrom")
        .css(
            'background-image',
            'url(' + blockies.create({ seed:connectionInfo.from, size: 8, scale: 16 }).toDataURL() + ')');
    trObject.find("td.nameFrom").html(connectionInfo.nameFrom);
    trObject.find("td.typeFrom").html(registry.pointTypes[connectionInfo.typeFrom]);
    trObject.find("td.blockieTo").attr('title', connectionInfo.to);
    trObject.find("img.blockieIconTo")
        .css(
            'background-image',
            'url(' + blockies.create({ seed:connectionInfo.to, size: 8, scale: 16 }).toDataURL() + ')');
    trObject.find("td.nameTo").html(connectionInfo.nameTo);
    trObject.find("td.typeTo").html(registry.pointTypes[connectionInfo.typeTo]);
    trObject.find("td.loss").html(connectionInfo.loss);
    trObject.find("td.throughput").html(connectionInfo.throughput);
    // TODO Look again at what to put
    trObject.find("button.confirm").attr("data-param", "address=" + connectionInfo.from);
    trObject.find("button.remove").attr("data-param", "address=" + connectionInfo.from);
}


/**
 * Finds the pertinent row in tableObject, and passes it on to populateConnectionRow.
 * connectionInfo is in the form of: {
 *      from : hex string
 *      to : hex string
 *      nameFrom : string
 *      NameTo : string
 *      typeFrom : number
 *      typeTo : number
 * }
 * Returns the row in question.
 */
function findOrCreateAndPopulateConnectionRow(tbodyObject, connectionInfo) {
    var trFound = tbodyObject.find("tr[data-from=" + connectionInfo.from + "][data-to=" + connectionInfo.to + "]");
    if (trFound.length == 0) {
        trFound = createEmptyConnectionRow().appendTo(tbodyObject);
        connectionInfo.linkIndex = tbodyObject.find("tr").length;
    } else if (trFound.length > 1) {
        throw "Not expected to find more than one such row";
    }
    populateConnectionRow(trFound, connectionInfo);
    return trFound;
}

// add an appropriate event listener
window.addEventListener("web3Ready", () => {
    setTimeout(() => {
        updateUi();
    }, 100);
});