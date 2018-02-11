
var MAX_POKEMON = 151;
var SRC_POKE_PER_ROW = 13;
var POKE_PER_ROW = 16;
var POKE_RESOLUTION = 32;

var currentColor = "color1";

function makeBoard() {
    POKE_PER_ROW = Number($("#poke-per-row").val());

    currentColor = (CONNECTION_INFO.connectionMode === "master") ? "color1" : "color2";
    $board = $("#board");
    for (var i = 0; i < MAX_POKEMON; i++) {
        var bgStyle = "background: url(img/poke_sprites.png)";
        bgStyle += " -" + ((i % SRC_POKE_PER_ROW) * POKE_RESOLUTION) + "px";
        bgStyle += " -" + (Math.floor(i/SRC_POKE_PER_ROW) * POKE_RESOLUTION) + "px";
        var pokeImg = "<div class='poke-img' style='" + bgStyle + "'></div>";

        $board.append("<div class='poke' onclick='pokeClick(this)' data-poke-id='" + (i+1) + "'>" + pokeImg + "</div>");
        if (i % POKE_PER_ROW === POKE_PER_ROW - 1) {
            $board.append("<br>");
        }
    }
    if ((i%POKE_PER_ROW) >= POKE_PER_ROW - 3) {
        $board.append("<br>");
    }

    $board.append("<div class='square-thing'></div>");
    var classss = "square-thing color1" + ((currentColor === "color1") ? " chosen" : "");
    $board.append("<div id='chooser-color1' class='" + classss + "' onclick='chooseColor(\"color1\")'></div>");
    var classsss = "square-thing color2" + ((currentColor === "color2") ? " chosen" : "");
    $board.append("<div id='chooser-color2' class='" + classsss + "' onclick='chooseColor(\"color2\")'></div>");

    i += 3;
    if ((i%POKE_PER_ROW) >= POKE_PER_ROW - 3) {
        $board.append("<br>");
    }

    $board.append("<div id='connection-status' class='square-thing good' title='connection status'></div>");
    $board.append("<div id='poke-count-color1' class='square-thing text-color1'><div>0</div></div>");
    $board.append("<div id='poke-count-color2' class='square-thing text-color2'><div>0</div></div>");

    peerConnection.onconnectionstatechange = function (e) {
        switch(peerConnection.connectionState) {
            case "connecting":
            case "connected":
                goodConnection();
            case "disconnected":
            case "failed":
            case "closed":
                badConnection();
        }
    };
}

function goodConnection() {
    CONNECTION_INFO.connected = true;
    $("#connection-status").removeClass("bad");
    $("#connection-status").removeClass("warning");
    $("#connection-status").addClass("good");
}

function badConnection() {
    CONNECTION_INFO.connected = false;
    $("#connection-status").removeClass("good");
    $("#connection-status").removeClass("warning");
    $("#connection-status").addClass("bad");
}

function pokeClick(poke) {
    $poke = $(poke);
    var poke_id = $poke.attr("data-poke-id");
    if ($poke.hasClass(currentColor)) {
        $poke.removeClass(currentColor);
        sendEvent({"poke_id": poke_id, "action": "unset", color: currentColor});
    } else if (!$poke.hasClass(otherColor(currentColor))) {
        $poke.addClass(currentColor);
        sendEvent({"poke_id": poke_id, "action": "set", color: currentColor});
    }
    updatePokeCounts();
}

function blankPoke(poke_id, color) {
    $poke = $(".poke[data-poke-id='" + poke_id + "']");
    if ($poke.length < 1) {
        console.log("couldn't find poke!");
        return false;
    }

    if ($poke.hasClass(color)) {
        $poke.removeClass(color);
        return true; // removed it
    } else {
        return false; // can't remove it
    }
}

function setPoke(poke_id, color) {
    $poke = $(".poke[data-poke-id='" + poke_id + "']");
    if ($poke.length < 1) {
        console.log("couldn't find poke!");
        return false;
    }

    if ($poke.hasClass(color)) {
        return "already set"; // already that color
    } else if ($poke.hasClass(otherColor(color))) {
        return false; // can't set it
    } else {
        $poke.addClass(color);
        return true; // set it
    }
}

function receivedPokeEvent(data) {
    var result;
    if (data.action === "set") {
        result = setPoke(data.poke_id, data.color);
    } else if (data.action === "unset") {
        result = blankPoke(data.poke_id, data.color);
    }
    updatePokeCounts();

    if (result === false) {
        console.log("failed to " + data.action);
    } else if (result === "already set") {
        console.log("tryed to set poke to same color from event");
    }
}

function updatePokeCounts() {
    var color1Count = $(".poke.color1").length;
    $("#poke-count-color1 div").text(color1Count);
    var color2Count = $(".poke.color2").length;
    $("#poke-count-color2 div").text(color2Count);
}

function otherColor(color) {
    return color === "color1" ? "color2" : "color1";
}

function chooseColor(color) {
    if (currentColor === color) {
        return;
    }
    $("#chooser-" + currentColor).removeClass("chosen");
    $("#chooser-" + color).addClass("chosen");
    currentColor = color;
}
