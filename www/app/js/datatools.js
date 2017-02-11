function autoSetup(obj) {
    //setupAutoButtons(obj);
    //setupAutoForms(obj);
}

function setupAutoButtons(obj) {
    obj.find("[data-type=autoButton]").each(function(idx) {
        addButtonAction($(this));
    })
}

function addButtonAction(btn) {
    console.log(btn);
    action = btn.attr("data-action");
    console.log(action);

    if(action=="get") {
        btn.click(function() {
            performGet($(this));
        });
    }
}

function setupAutoForms(obj) {
    var params = {};
    if (window.location.search != "") {
        // params = 
    }
}

function performGet(btn) {
    target = btn.attr("data-target");
    param = btn.attr("data-param");
    url = target + "?" + param;
    window.location.href = url;
}

getInputElements = function(obj) {
    obj.find("input").each(obj, function(obj) {

    })
}

addData = function (obj, hash) {
    $.each(hash, function(key, value) {
        obj.attr("data-"+key, value);
    });
};

addMultiData = function (objects, datasets) {
    if (objects.length != datasets.length) { console.log("addMultiData error! count mismatch"); return false;}

    for (i=0; i<objects.length; i++)
    {
        addData(objects[i], datasets[i]);
    }
}

window.addEventListener(
    "web3Ready",
    () => {
        autoSetup($(document));
    });