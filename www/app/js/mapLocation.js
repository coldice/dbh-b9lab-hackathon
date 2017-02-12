function updateUi() {
    var markers = {}; // Markers are kept by address
    registry.listenToUpdates((error, infoChanged) => {
        console.log(infoChanged);
        if (error) {
            console.error(error);
        } else {
            console.log(infoChanged.args.location);
            var position;
            try {
                position = JSON.parse(infoChanged.args.location);
                var marker = markers[infoChanged.args.who];
                if (typeof marker == "undefined") {
                    console.log("create");
                    marker = new google.maps.Marker({
                        position: position,
                        map: map,
                        title: infoChanged.args.name
                    });
                    markers[infoChanged.args.who] = marker;
                } else {
                    console.log("update");
                    marker.setPosition(new google.maps.LatLng(position.lat, position.lng));
                    marker.setTitle(infoChanged.args.name);
                }
            } catch(error) {
                console.log("Cannot parse", infoChanged.args.location);
            }
        }
    });
}

// add an appropriate event listener
window.addEventListener("web3Ready", () => {
    console.log()
    setTimeout(() => {
        updateUi();
    }, 100);
});