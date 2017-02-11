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

function getUrlParams(strParams) {
    var params = {};
    
    // TODO: unescape
    $.each(strParams.split("&"), function() {
        // should be key=val
        console.log("setup " + strParams);
        param = strParams.split("=");
        if (param.length != 2) return;
        params[param[0]] = param[1];
    });

    return params;
}

function setupAutoForms(obj) {
    if (window.location.search != "") {
        var params = getUrlParams(window.location.search.substr(1));
        console.log("in:");
        console.log(params);
        console.log(params.length);

        autoFields = obj.find("[data-auto-param]");
        $.each(params, function(key, val) {
            console.log("looking for " + "[data-auto-param="+key+"]");
            console.log("in:");
            console.log()
            autoFields.find("[data-auto-param="+key+"]").each(function() {
                console.log($(this));
                console.log(val);
                $(this).val(val);
            })
        });
    }
}

function performGet(btn) {
    target = btn.attr("data-target");
    param = btn.attr("data-param");
    url = target + "?" + param;
    window.location.href = url;
}

getInputElements = function(obj) {
    obj.find("input").each(idx, function() {

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
