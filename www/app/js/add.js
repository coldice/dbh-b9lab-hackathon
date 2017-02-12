function updateUi() {
    return web3.eth.getFirstAccountPromise()
        .then(account => {
            $("#lbl_account").html(account);
            updateSelectUI($('.nav-tabs .active').attr("href")); // must be called after we set the textfield
            autoSetup($(document));
            return registry.getInfoOf(account);
        })
        .then(info => {
            $("#txt_account_name").html(info.name);
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
                return graph.submitLink({
                        from: fromAddress,
                        to: toAddress,
                        loss: pickedLoss,
                        throughput: pickedThroughput
                    }, account);
            })
            .then(web3.eth.getTransactionReceiptMined)
            .then(receipt => {
                $("#lbl_processing").hide();
                console.log(web3.sha3(receipt.logs[0].args));
            })
            .catch(error => {
                console.error(error);
                $("#lbl_processing").hide();
                $("#lbl_error").html(error).show();
                // Did you check that the name is taken or not?
            });
    });
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href"); // activated tab
        updateSelectUI(target);
    });
}

function updateSelectUI(target) {
    if(target === "#to"){
        $("#txt_from").val($("#lbl_account").text());
        $("#txt_to").val("").attr("placeholder", "To this address");
        $("#txt_from").prop("disabled",  true);
        $("#txt_to").prop("disabled", false);
    }
    else if(target === "#from") {
        $("#txt_from").val("").attr("placeholder", "From this address");
        $("#txt_to").val($("#lbl_account").text());
        $("#txt_from").prop("disabled",  false);
        $("#txt_to").prop("disabled", true);
    }

}

// add an appropriate event listener
window.addEventListener(
    "web3Ready",
    () => {
        updateUi();
        loadActions();
    });
