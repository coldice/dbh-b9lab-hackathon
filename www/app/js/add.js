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
        var fromAddress = $("#txt_from").val();
        var toAddress = $("#txt_to").val();
        var pickedLoss = $("#txt_loss").val();
        var pickedThroughput = $("#txt_throughput").val();
        $("#lbl_error").hide();
        return web3.eth.getFirstAccountPromise()
            .then(account => {
                $("#lbl_processing").show();
                if($("#radio_to").is(":checked")) {
                    return graph.submitLink({
                            from: fromAddress,
                            to: toAddress,
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
        $("#txt_to").attr("placeholder", "To this address");
        $("#txt_from").prop("disabled",  true);
        $("#txt_to").prop("disabled", false);
    });
    $("#radio_to").click(function() {        
        $("#txt_from").attr("placeholder", "From this address");
        $("#txt_to").attr("placeholder", $("#lbl_account").text());
        $("#txt_from").prop("disabled",  false);
        $("#txt_to").prop("disabled", true);
    });
}

// add an appropriate event listener
window.addEventListener(
    "web3Ready",
    () => {
        updateUi();
        loadActions();
    });