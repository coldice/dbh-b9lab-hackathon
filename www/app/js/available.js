function updateUi() {
    var tbodyObject = $("tbody#available_endpoint");
    registry.listenToUpdates((error, receivedEvent) => {
            if (error) {
                console.error(error);
            } else {
                findOrCreateAndPopulateEndpointRow(tbodyObject, receivedEvent.args);
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
    var thIndex = $("<th/>").addClass("pointIndex text-center").attr("scope", "row").appendTo(tr);
    var tdBlockie = $("<td/>").addClass("blockie").appendTo(tr);
    var imgBlockie = $("<img/>").addClass("blockieIcon").appendTo(tdBlockie);
    var tdPointName = $("<td/>").addClass("pointName").appendTo(tr);
    var tdPointType = $("<td/>").addClass("pointType text-center").appendTo(tr);
    var tdLocation = $("<td/>").addClass("location").appendTo(tr);
    var tdAction = $("<td/>").addClass("text-center").appendTo(tr);
    var buttonAdd = $("<button/>").html("Link It Up").addClass("btn btn-primary add").attr({
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
 *     location: string,
 *     pointIndex : number (optional)
 * }
 */
function populateEndpointRow(trObject, endpointInfo) {
    trObject.attr("data-address", endpointInfo.who);
    console.log(endpointInfo);
    if(typeof(endpointInfo.pointIndex) != "undefined") {
        trObject.find("th.pointIndex").html(endpointInfo.pointIndex);
    }
    trObject.find("td.blockie").attr('title', endpointInfo.who);
    trObject.find("img.blockieIcon")
        .css(
            'background-image',
            'url(' + blockies.create({ seed:endpointInfo.who, size: 8, scale: 16 }).toDataURL() + ')');
    trObject.find("td.pointName").html(endpointInfo.name);
    trObject.find("td.pointType").html(registry.pointTypes[endpointInfo.pointType]); 
    trObject.find("td.location").html(endpointInfo.location);
    trObject.find("button.add").attr("data-param", "address=" + endpointInfo.who);

    setupAutoButtons(trObject);
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
    if (trFound.length == 0) {
        trFound = createEmptyEndpointRow().appendTo(tbodyObject);
        endpointInfo.pointIndex = tbodyObject.find("tr").length;
    } else if (trFound.length > 1) {
        throw "Not expected to find more than one such row";
    }
    populateEndpointRow(trFound, endpointInfo);
    return trFound;
}

// add an appropriate event listener
window.addEventListener("web3Ready", () => {
    // Careful! For some reason, we need this timeout for the events to not fail.
    setTimeout(() => {
        updateUi();
    }, 100);
});