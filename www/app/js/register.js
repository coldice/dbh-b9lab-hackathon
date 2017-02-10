function isNameTaken() {
    return web3.eth.getFirstAccountPromise()
        .catch(error => {
            console.error(error);
            // Show the UI that there is no account
        })
        .then(account => {
            return registry.getAddressOf(n_name)
                .catch(error => {
                    console.error(error);
                    // Show the UI that there is a problem connecting the contract.
                })
                .then(whoElse => {
                    if (whoElse != account) {
                        // Show the UI that the name is already taken.
                    } else if (whoElse == account) {
                        // Show the UI that the name is already set.
                    } else {
                        // That's fine should be possible to set it.
                    }
                });
        });
}

function loadActions() {
    $("#btn_submit_register").click(function() {
        var n_name = $("#txt_name").val();
        var n_location = $("#txt_location").val();

    return web3.eth.getFirstAccountPromise()
        .catch(error => {
            console.error(error);
            // Show the UI that there is no account
        })
        .then(account => registry.setMyName(n_name, account))
        .then(txHash => {
            // Show the UI that transaction is processing
            return web3.eth.getTransactionReceiptMined(txHash);
        })
        .catch(error => {
            console.error(error);
            // Show the UI that there is a problem with setting the name.
            // Did you check that the name is taken or not?
        })
        .then(receipt => {
            // Show the UI that it went through
        });
    });
}

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

// add an appropriate event listener
window.addEventListener("web3Ready", updateUi);