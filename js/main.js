var CFG = {'iceServers': [{'urls': "stun:stun.beam.pro"}, {'urls': "stun:stun.gmx.net"}]};
var CON = {'optional': [{'DtlsSrtpKeyAgreement': true}]};
var sdpConstraints = {optional: []};

var CONNECTION_INFO = {
    "connectionMode": null,
    "connected": false
};
 
var peerConnection = new RTCPeerConnection(CFG, CON);
var dataChannel = null;

// when we need to send a message to the other person, do it like this
peerConnection.onicecandidate = function (e) {
    if (e.candidate === null) {
        CONNECTION_INFO.offerAnswer = JSON.stringify(peerConnection.localDescription);
    }

    var htmlStuff = "<input id='copyMe' type='text'> <button onclick='copyMyThingToClipboard()'>Copy to clipboard</button>";
    if (CONNECTION_INFO.connectionMode === "master") {
        htmlStuff = "Conection info generated.<br>Send this text to whoever is connecting and have them paste it into this page:<br>" + htmlStuff;
        htmlStuff += "<br><button id='sent-button'>Ok did it</button>";
    } else if (CONNECTION_INFO.connectionMode === "not-master") {
        htmlStuff = "Connection info processed.<br>Send this text back to whoever initiated the conection.<br>" + htmlStuff;
    }
    $("#setup").html(htmlStuff);
    $("#copyMe").val(CONNECTION_INFO.offerAnswer);

    if (CONNECTION_INFO.connectionMode === "master") {
        $("#sent-button").click(function () {
            var htmlStuff = "Paste their response here: ";
            htmlStuff += "<input id='remote-val' type='text'> <button id='ok-button'>Ok</button>";
            $("#setup").html(htmlStuff);

            $("#ok-button").click(function () {
                peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse($('#remote-val').val())));

                CONNECTION_INFO.connected = true;
                connectionReady();
            });
        });
    }
};
peerConnection.ondatachannel = function (e) {
    var dc = e.channel || e;
    if (dc.label === "pokedex-data") {
        dataChannel = dc;
        dataChannelCallbacks(dataChannel);
    }

    CONNECTION_INFO.connected = true;
    connectionReady();
};

peerConnection.onpeeridentity = function (e) {
    console.log("PEER IDENTitY!");
    console.log(e);
};

peerConnection.onidentityresult = function (e) {
    console.log("PEER IDENTitY RESULT!");
    console.log(e);
};

$(function () {
    $("#initiate-connection").click(function () {
        console.log("now in master mode");
        $("#initiate-connection").remove();
        $("#join-connection").remove();
        CONNECTION_INFO.connectionMode = "master";
        dataChannel = peerConnection.createDataChannel('pokedex-data', {reliable: true});
        dataChannelCallbacks(dataChannel);
        peerConnection.createOffer(function(desc) {
            peerConnection.setLocalDescription(desc, function() {}, function() {})
        }, function() {}, sdpConstraints);

        $("#setup").text("Waiting...");
    });

    $("#join-connection").click(function () {
        console.log("now in not-master mode");
        $("#initiate-connection").remove();
        $("#join-connection").remove();
        CONNECTION_INFO.connectionMode = "not-master";

        var htmlStuff = "Paste the connection info from whoever is initiating the connection here: ";
        htmlStuff += "<input id='remote-val' type='text'> <button id='ok-button'>Ok</button>";
        $("#setup").html(htmlStuff);
        $("#ok-button").click(function () {
            peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse($('#remote-val').val())));
            peerConnection.createAnswer(function (answerDesc) {
                peerConnection.setLocalDescription(answerDesc);
            }, function () {}, sdpConstraints);

            $("#setup").text("setting up...");
        });
    });
});

function dataChannelCallbacks(dc) {
    dc.onopen = function(e) { };
    dc.onmessage = function(e) {
        if (e.data.size) {
            console.log("theres a size?");
        } else {
            if (e.data.charCodeAt(0) === 2) {
                console.log("2 thing, idk what this means");
                return;
            }
            var data = JSON.parse(e.data);
            if (data.message) {
                //$("#board").append(data.message);
            }
        }
    };
}

function connectionReady() {
    $("#instructions").hide();
    $("#setup").hide();

    $("#board").show();
}

function sendText(text) {
    if (!CONNECTION_INFO.connected) {
        console.log("Not connected!");
        return;
    }
    dataChannel.send(JSON.stringify({message: text}));
}


function copyMyThingToClipboard() {
    $("#copyMe").select();
    document.execCommand("copy");
}
