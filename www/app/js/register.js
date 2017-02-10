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
                    } else if (whoElse == account) {
                        throw "Name already set";
                    } else {
                        // That's fine should be possible to set it.
                    }
                });
        });
}

function loadActions() {
    $("#btn_submit_register").click(function() {
        var pickedName = $("#txt_name").val();
        var pickedLocation = $("#txt_location").val();
        $("#lbl_error").hide();
        return isNameTaken(pickedName)
            .then(() => web3.eth.getFirstAccountPromise())
            .then(account => {
                $("#lbl_processing").show();
                return registry.setNameTo(pickedName, account);
            })
            .then(txHash => {
                return web3.eth.getTransactionReceiptMined(txHash);
            })
            .then(receipt => {
                $("#lbl_processing").hide();
                $("#lbl_name").html(pickedName);
            })
            .catch(error => {
                console.error(error);
                $("#lbl_processing").hide();
                var errorMessage = "";
                if (error == "No account found") {
                    errorMessage = "There is no account";
                } else if(error == "Name already taken") {
                    errorMessage = "Name already taken by another: " + pickedName;
                } else if(error == "Name already set") {
                    errorMessage = "Your address is already set to this name";
                } else {
                    errorMessage = "Failed to set the name";
                }
                $("#lbl_error").html(errorMessage).show();
                // Did you check that the name is taken or not?
            });
    });
}

function updateUi() {
    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length > 0) {
                return accounts[0];
            }
            throw "No account found";
        })
        .then(account => {
            $("#lbl_account").html(account);
            return registry.getNameOf(account);
        })
        .then(name => {
            $("#lbl_name").html(web3.toUtf8(name));
        })
        .catch(error => {
            console.error(error);
            var errorMessage = "";
            if (error == "No account found") {
                errorMessage = "There is no account";
            } else {
                errorMessage = "Failed to fetch your current name";
            }
            $("#lbl_error").html(errorMessage).show();
        })
}
//lbl_account

// add an appropriate event listener
window.addEventListener(
    "web3Ready",
    () => {
        updateUi();
        loadActions();
    });