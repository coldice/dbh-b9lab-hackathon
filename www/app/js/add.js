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
//lbl_account
//txt_address

/**
 * Returns an empty <tr> that is not yet added to the DOM.
 * It will represendt an end-point in list-available.html.
 * All fields are ready to be populated.
 */
function createEmptyEndpointRow() {
}

/**
 * Populates a <tr> object with the info associated.
 * endpointInfo is in the form of: {
 *     who: hex string,
 *     name: string,
 *     pointType: number,
 *     location: string   
 * }
 */
function populateEndpointRow(trObject, endpointInfo) {
}

/**
 * Finds the pertinent row in tableObject, and passes it on to populateEndpointRow.
 */
function findOrCreateAndPopulateEndpointRow(tableObjet, endpointInfo) {
}

// add an appropriate event listener
window.addEventListener("web3Ready", updateUi);