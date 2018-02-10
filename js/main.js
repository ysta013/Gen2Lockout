var CFG = {'iceServers': [{'url': "stun.beam.pro"}, {'url': "stun:stun.gmx.net"}]};
var CON = { 'optional': [{'DtlsSrtpKeyAgreement': true}] }
 
var peerConnection = new RTCPeerConnection(CFG, CON), dc1 = null, tn1 = null, activedc, pc1icedone = false;

