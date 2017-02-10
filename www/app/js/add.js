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