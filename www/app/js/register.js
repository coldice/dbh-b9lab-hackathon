function isNameTaken(name) {
    return web3.eth.getFirstAccountPromise()
        .then(account => {
            return registry.getAddressOf(name)
                .then(whoElse => {
                    if (whoElse == "0x0000000000000000000000000000000000000000"
                        || whoElse == "0x" || whoElse == 0) {
                        // That's fine, it is available
                    } else if (whoElse != account) {
                        throw "Name already taken";
                    } else {
                        // That's fine should be possible to set it.
                    }
                });
        });
}

function loadActions() {
    $("#btn_submit_register").click(function() {
        var pickedName = $("#txt_name").val();
        var pickedPointType = $("#select_point_type").val();
        var pickedLatitude = $("#txt_latitude").val();
        var pickedLongitude = $("#txt_longitude").val();
        $("#lbl_error").hide();
        return isNameTaken(pickedName)
            .then(web3.eth.getFirstAccountPromise)
            .then(account => {
                $("#lbl_processing").show();
                return registry.setInfoTo({name: pickedName,pointType: pickedPointType,
                        location: JSON.stringify({ lat: pickedLatitude, lng: pickedLongitude })
                    }, account);
            })
            .then(web3.eth.getTransactionReceiptMined)
            .then(receipt => {
                $("#lbl_processing").hide();
                $("#lbl_name").html(pickedName);
                $("#lbl_pointType").html(pickedPointType);
            })
            .catch(error => {
                processLoadError(error, pickedName);
            });
    });
}

function processLoadError(error, pickedName) {
    console.error(error);
    $("#lbl_processing").hide();
    var errorMessage = "";
    if (error == "No account found") {
        errorMessage = "There is no account";
    } else if(error == "Name already taken") {
        errorMessage = "Name already taken by another: " + pickedName;
    } else {
        errorMessage = "Failed to set the name";
    }
    $("#lbl_error").html(errorMessage).show();
    // Did you check that the name is taken or not?
}

function updateUi() {
    var selectObj = $("select#select_point_type");
    Object.keys(registry.pointTypes).forEach(function(key) {
        $("<option/>").val(key).html(registry.pointTypes[key]).appendTo(selectObj);
    })
    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length > 0) {
                return accounts[0];
            }
            throw "No account found";
        })
        .then(registry.getInfoOf)
        .then(info => {
            updateUiInfo(info);            
        })
        .catch(error => {
            console.error(error);
            var errorMessage = "";
            if (error == "No account found") {
                errorMessage = "There is no account";
            } else {
                errorMessage = "Failed to fetch your current info";
            }
            $("#lbl_error").html(errorMessage).show();
        })
}

function updateUiInfo(info) {
    $("#lbl_account").html(info.address);
    $("#txt_name").val(info.name);
    $("#select_point_type").val(info.pointType);
    try {
        var parsedLocation = JSON.parse(info.location);
        $("#txt_latitude").val(parsedLocation.lat);
        $("#txt_longitude").val(parsedLocation.lng);
    } catch(error) {
        console.error("Failed to parse", info.location)
    }
}
//lbl_account

// add an appropriate event listener
window.addEventListener(
    "web3Ready",
    () => {
        updateUi();
        loadActions();
    });