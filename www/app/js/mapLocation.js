function updateUi() {
    var markers = {}; // Markers are kept by address
    var infowindow = new google.maps.InfoWindow({
        content: ""
    });
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
                        title: infoChanged.args.name,
                        label: infoChanged.args.pointType + ""
                    });
                    markers[infoChanged.args.who] = marker;
                } else {
                    console.log("update");
                    marker.setPosition(new google.maps.LatLng(position.lat, position.lng));
                    marker.setTitle(infoChanged.args.name);
                    marker.setLabel(infoChanged.args.pointType + "");
                }
                marker.addListener('click', function() {
                    infowindow.setContent(infoChanged.args.name);
                    infowindow.open(map, marker);
                });
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