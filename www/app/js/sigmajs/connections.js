function updateUi() {
    var tbodyObjet = $("tbody");
    Registry.deployed().LogInfoChanged({}, { fromBlock: 514639 })
        .watch((error, receivedEvent) => {
            if (error) {
                console.error(error);
            } else {
                console.log(receivedEvent);
                findOrCreateAndPopulateConnectionRow(tbody, receivedEvent.args);
            }
        });
}

/**
 * Returns an empty <tr> that is not yet added to the DOM.
 * It will represent a connection in list-connection.html.
 * All fields are ready to be populated.
 */
function createEmptyConnectionRow() {
    var tr = $("<tr/>").addClass("data-row");
    var thIndex = $("<th/>").addClass("index").attr("scope", "row").appendTo(tr);
    var tdPointNameA = $("<td/>").addClass("pointNameA").appendTo(tr);
    var tdPointTypeA = $("<td/>").addClass("pointTypeA").appendTo(tr);
    var tdPointNameB = $("<td/>").addClass("pointNameB").appendTo(tr);
    var tdPointTypeB = $("<td/>").addClass("pointTypeB").appendTo(tr);
    var tdAction = $("<td/>").addClass("text-center").appendTo(tr);
    var buttonConfirm = $("<button/>").html("Confirm").addClass("btn btn-primary confirm").attr({
            "type": "button",
            "data-type": "autoButton",
            "data-action": "get",
            "data-target": "confirm.html"
        }).appendTo(tdAction);
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
 *      who : hex string
 *      nameA : string
 *      nameB : string
 *      pointTypeA : number
 *      pointTypeB : number 
 *      index : number (optional)
 * }
 */
function populateConnectionRow(trObject, connectionInfo) {
    trObject.attr("data-address", connectionInfo.who); 
    if(typeof(connectionInfo.pointIndexA) != "undefined") {
        trObject.find("td.index").html(connectionInfo.pointIndex);
    }
    trObject.find("td.pointNameA").html(connectionInfo.nameA);
    trObject.find("td.pointTypeA").html(connectionInfo.pointTypeA);
    trObject.find("td.pointNameB").html(connectionInfo.nameB);
    trObject.find("td.pointTypeB").html(connectionInfo.pointTypeB);
    trObject.find("button.confirm").attr("data-param", "address="+connectionInfo.who);
    trObject.find("button.remove").attr("data-param", "address="+connectionInfo.who);
}


/**
 * Finds the pertinent row in tableObject, and passes it on to populateConnectionRow.
 * connectionInfo is in the form of: {
 *      who : hex string
 *      nameA : string
 *      nameB : string
 *      pointTypeA : number
 *      pointTypeB : number 
 *      indexA : number (optional)
 *      indexB : number (optional)
 * }
 * Returns the row in question.
 */
function findOrCreateAndPopulateConnectionRow(tbodyObject, connectionInfo) {
    var trFound = tbodyObject.find("tr[data-from=" + connectionInfo.whoA + ", data-to=" + connectionInfo.whoB + "]");
    if (trFound.size() == 0) {
        trFound = createEmptyConnectionRow().appendTo(tbodyObject);
        connectionInfo.pointIndex = tbodyObjet.find("tr").size();
    } else if (trFound.size() > 1) {
        throw "Not expected to find more than one such row";
    }
    populateConnectionRow(trFound, connectionInfo);
    return trFound;
}

// add an appropriate event listener
window.addEventListener("web3Ready", updateUi);