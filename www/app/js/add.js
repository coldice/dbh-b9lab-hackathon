function updateUi() {
    return web3.eth.getFirstAccountPromise()
        .then(account => {
            $("#lbl_account").html(account);
        })
        .catch(error => {
            console.error(error);
            // Show the UI that there is no account. No need to alert.
        })
}

function loadActions() {
    $("#btn_submit_add").click(function() {
        var pickedAdress = $("#txt_address").val();
        var pickedLoss = $("#txt_loss").val();
        var pickedThroughput = $("#txt_throughput").val();
        $("#lbl_error").hide();
        return web3.eth.getFirstAccountPromise()
            .then(account => {
                $("#lbl_processing").show();
                return graph.submitLink({
                        from: account,
                        to: pickedAdress,
                        loss: pickedLoss,
                        throughput: pickedThroughput
                    }, account);
            })
            .then(web3.eth.getTransactionReceiptMined)
            .then(receipt => {
                $("#lbl_processing").hide();
            })
            .catch(error => {
                console.error(error);
                $("#lbl_processing").hide();
                $("#lbl_error").html(error).show();
                // Did you check that the name is taken or not?
            });
    });
}

// add an appropriate event listener
window.addEventListener(
    "web3Ready",
    () => {
        updateUi();
        loadActions();
    });