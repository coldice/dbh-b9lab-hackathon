function updateUi() {
    return web3.eth.getFirstAccountPromise()
        .then(account => {
            $("#lbl_account").html(account);
            return registry.getNameOf(account);
        })
        .catch(error => {
            console.error(error);
            // Show the UI that there is no account. No need to alert.
        })
        .then(name => {
            // Show the UI the current name
        })
        .catch(error => {
            console.error(error);
            // Show the UI that there is an error to get name.
        })
}

/**
 * Returns an empty <tr> that is not yet added to the DOM.
 * It will represendt an end-point in list-available.html.
 * All fields are ready to be populated.
 */
function createEmptyEndpointRow() {
    var tr = $("<tr/>");
    var tdIndex = $("<td/>").class("index").appendTo(tr);

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
 */
function findOrCreateAndPopulateEndpointRow(tableObjet, endpointInfo) {
}

// add an appropriate event listener
window.addEventListener("web3Ready", updateUi);