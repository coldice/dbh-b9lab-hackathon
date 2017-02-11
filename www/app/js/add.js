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
        var pickedAddress = $("#txt_address").val();
        var pickedLoss = $("#txt_loss").val();
        var pickedThroughput = $("#txt_throughput").val();
        $("#lbl_error").hide();
        return web3.eth.getFirstAccountPromise()
            .then(account => {
                $("#lbl_processing").show();
                if($("#radio_to").is(":checked")) {
                    return graph.submitLink({
                            from: pickedAddress,
                            to: account,
                            loss: pickedLoss,
                            throughput: pickedThroughput
                        }, account);
                }
                else {
                    return graph.submitLink({
                            from: account,
                            to: pickedAddress,
                            loss: pickedLoss,
                            throughput: pickedThroughput
                        }, account);
                }
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
    $("#radio_from").click(function() {
        $("#txt_from").attr("placeholder", ($("#lbl_account").text()));
        $("#txt_to").attr("placeholder", "to your address");
    });
    $("#radio_to").click(function() {        
        $("#txt_from").attr("placeholder", "from your address");
        $("#txt_to").attr("placeholder", $("#lbl_account").text());
    });
}

// add an appropriate event listener
window.addEventListener(
    "web3Ready",
    () => {
        updateUi();
        loadActions();
    });