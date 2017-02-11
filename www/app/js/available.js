function updateUi() {
    var tbodyObjet = $("tbody#available_endpoint");
    Registry.deployed().LogInfoChanged({}, { fromBlock: 514639 })
        .watch((error, receivedEvent) => {
            if (error) {
                console.error(error);
            } else {
                console.log(receivedEvent);
                findOrCreateAndPopulateEndpointRow(tbody, receivedEvent.args);
            }
        });
}

/**
 * Returns an empty <tr> that is not yet added to the DOM.
 * It will represent an end-point in list-available.html.
 * All fields are ready to be populated.
 */
function createEmptyEndpointRow() {
    var tr = $("<tr/>").addClass("data-row");
    var thIndex = $("<th/>").addClass("index").attr("scope", "row").appendTo(tr);
    var tdPointName = $("<td/>").addClass("pointName").appendTo(tr);
    var tdPointType = $("<td/>").addClass("pointType").appendTo(tr);
    var tdLocation = $("<td/>").addClass("location").appendTo(tr);
    var tdAction = $("<td/>").addClass("text-center").appendTo(tr);
    var buttonAdd = $("<button/>").html("Add").addClass("btn btn-primary add").attr({
            "type": "button",
            "data-type": "autoButton",
            "data-action": "get",
            "data-target": "add.html"
        }).appendTo(tdAction);
    return tr;
}

/**
 * Populates a <tr> object with the info associated.
 * endpointInfo is in the form of: {
 *     who: hex string,
 *     name: string,
 *     pointType: number,
 *     location: string   
 *     pointIndex : number (optional)
 * }
 */
function populateEndpointRow(trObject, endpointInfo) {
    trObject.attr("data-address", endpointInfo.who); 
    if(typeof(endpointInfo.pointIndex) != "undefined") {
        trObject.find("td.index").html(endpointInfo.pointIndex);
    }
    trObject.find("td.pointName").html(endpointInfo.name);
    trObject.find("td.pointType").html(endpointInfo.pointType); 
    trObject.find("td.location").html(endpointInfo.location);
    trObject.find("button.add").attr("data-param", "address="+endpointInfo.who);
}


/**
 * Finds the pertinent row in tableObject, and passes it on to populateEndpointRow.
 * endpointInfo is in the form of: {
 *     who: hex string,
 *     name: string,
 *     pointType: number,
 *     location: string   
 * }
 * Returns the row in question.
 */
function findOrCreateAndPopulateEndpointRow(tbodyObject, endpointInfo) {
    var trFound = tbodyObject.find("tr[data-address=" + endpointInfo.who + "]");
    if (trFound.size() == 0) {
        trFound = createEmptyEndpointRow().appendTo(tbodyObject);
        endpointInfo.pointIndex = tbodyObjet.find("tr").size();
    } else if (trFound.size() > 1) {
        throw "Not expected to find more than one such row";
    }
    populateEndpointRow(trFound, endpointInfo);
    return trFound;
}

// add an appropriate event listener
window.addEventListener("web3Ready", updateUi);