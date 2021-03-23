
var MAX_POKEMON = 251;
var SRC_POKE_PER_ROW = 13;
var POKE_PER_ROW = 16;
var POKE_RESOLUTION = 32;

var currentColor = "color1";


var lastSyncTime = null;
// interval in miliseconds to check if the boards are in sync
var SYNC_INTERVAL = 15000;

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
    // didn't just put in a linebreak, but within 3 of the end of the line
    if ((i%POKE_PER_ROW) !== 0 && (i%POKE_PER_ROW) > POKE_PER_ROW - 3) {
        $board.append("<br>");
        i += POKE_PER_ROW - (i%POKE_PER_ROW);
    }

    $board.append("<div class='square-thing'></div>");
    var classss = "square-thing color1" + ((currentColor === "color1") ? " chosen" : "");
    $board.append("<div id='chooser-color1' class='" + classss + "' onclick='chooseColor(\"color1\")'></div>");
    var classsss = "square-thing color2" + ((currentColor === "color2") ? " chosen" : "");
    $board.append("<div id='chooser-color2' class='" + classsss + "' onclick='chooseColor(\"color2\")'></div>");

    i += 3;
    if ((i%POKE_PER_ROW) > POKE_PER_ROW - 3) {
        $board.append("<br>");
    }

    $board.append("<div id='connection-status' class='square-thing good' title='connection status'></div>");
    $board.append("<div id='poke-count-color1' class='square-thing text-color1'><div>0</div></div>");
    $board.append("<div id='poke-count-color2' class='square-thing text-color2'><div>0</div></div>");

    i += 1;
    if ((i%POKE_PER_ROW) > POKE_PER_ROW - 1) {
        $board.append("<br>");
    }
    $board.append("<div id='new-game-button' class='square-thing'></div>");

    if (CONNECTION_INFO.connectionMode === "master") {
        lastSyncTime = $.now();
    }

    $("#connection-status").click(function() {
        if ($(this).hasClass("warning")) {
            // we want to sync the boards, we'll use the master board
            forceBoardSyncMessage(false);
        }
    });

    $(".poke").mousedown(function (e) {
        if (e.which === 3) {
            $(this).toggleClass("marked");
        }
    });

    $("#new-game-button").click(function () {
        var btns = "<button id='yesbtn'>Yes</button><button id='nobtn'>No</button>";
        $("#board").append("<div id='new-game-dialog'>Are you sure you want to clear the board? " + btns + "</div>");
        $("#nobtn").click(function () {$("#new-game-dialog").remove();});
        $("#yesbtn").click(function () {$("#new-game-dialog").remove(); newGame();});
    });
}

function forceBoardSyncMessage(notMe) {
    $("#sync-cover").show();
    if (notMe) {
        if (CONNECTION_INFO.connectionMode === "master") {
            var boardData = serializeBoard();
            sendMessage("sync", {"sync_event": "force-sync", "board_data": boardData});
            $("#sync-cover").hide();
            goodConnection();
        } else {
            sendMessage("sync", {"sync_event": "force-sync-request"});
        }
    } else {
        sendMessage("sync", {"sync_event": "force-sync-request"});
    }
}

function boardSync() {
    if ($.now() - lastSyncTime > SYNC_INTERVAL) {
        sendMessage("sync", {"sync_event": "start"});
        $("#sync-cover").show();
    }
}

function syncHandler(syncData) {
    switch (syncData.sync_event) {
        case "start":
            sendMessage("sync", {"sync_event": "start-received"});
            $("#sync-cover").show();
            break;
        case "start-received":
            var boardData = serializeBoard();
            sendMessage("sync", {"sync_event": "sync-board", "board_data": boardData});
            break;
        case "sync-board":
            var result = compareBoard(syncData.board_data);
            sendMessage("sync", {"sync_event": "sync-board-response", "result": result});
            if (!result) {
                connectionWarning();
            } else if ($("#connection-status").hasClass("warning")) {
                goodConnection();
            }
            $("#sync-cover").hide();
            break;
        case "sync-board-response":
            lastSyncTime = $.now();
            if (!syncData.result) {
                connectionWarning();
            } else if ($("#connection-status").hasClass("warning")) {
                goodConnection();
            }
            $("#sync-cover").hide();
            break;
        case "force-sync":
            forceSyncBoard(syncData.board_data);
            break;
        case "force-sync-request":
            forceBoardSyncMessage(true);
            break;
    }
}

function compareBoard(theirBoard) {
    var myBoard = serializeBoard();
    return JSON.stringify(myBoard) === JSON.stringify(theirBoard);
}

function forceSyncBoard(theirBoard) {
    for (var i = 1; i < MAX_POKEMON + 1; i++) {
        var pokeColor = theirBoard[i].color;
        var $poke = $(".poke[data-poke-id='" + i + "']");
        $poke.removeClass("color1");
        $poke.removeClass("color2");
        if (pokeColor === "color1" || pokeColor === "color2") {
            $poke.addClass(pokeColor);
        }
    }
    updatePokeCounts();
    $("#sync-cover").hide();
    goodConnection();
}

function newGame() {
    if (!CONNECTION_INFO.connected) {
        clearBoard();
        return false;
    }
    sendMessage("clearBoard", true);
    clearBoard();
    goodConnection(); // we know the board isn't out of sync
}

function clearBoard() {
    for (var i = 1; i < MAX_POKEMON + 1; i++) {
        var $poke = $(".poke[data-poke-id='" + i + "']");
        $poke.removeClass("color1 color2 marked");
    }
    updatePokeCounts();
}

function serializeBoard() {
    $pokes = $(".poke");
    var data = {};
    $pokes.each(function (i, elem) {
        var $elem = $(elem);
        var color = $elem.hasClass("color1") ? "color1" : ($elem.hasClass("color2") ? "color2" : "none");
        data[$elem.attr("data-poke-id")] = {"color": color};
    });
    return data;
}

function goodConnection() {
    CONNECTION_INFO.connected = true;
    $("#connection-status").removeClass("bad");
    $("#connection-status").removeClass("warning");
    $("#connection-status").addClass("good");

    $("#connection-status").attr("title", "Connected");
}

function badConnection() {
    CONNECTION_INFO.connected = false;
    $("#connection-status").removeClass("good");
    $("#connection-status").removeClass("warning");
    $("#connection-status").addClass("bad");

    $("#connection-status").attr("title", "Connection Lost");
}

function connectionWarning() {
    $("#connection-status").removeClass("good");
    $("#connection-status").removeClass("bad");
    $("#connection-status").addClass("warning");

    $("#connection-status").attr("title", "Pokedex Out Of Sync (click to synchronize)");
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
