//! callapp.js
//! version 0.1
//! author: Aaren C

define(['lib/class', 'vendor/peer', 'vendor/howler'], function() {
  // Handle prefixed versions
  navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

  var Phone = Class.extend({
    init: function() {
      var self = this;
      this.peer = {};
      this.stream = null;
      this.peers = [];
      this.peerCalls = [];
      this.requestCallID = -1;
      this.currentCallID = -1;
      this.expectingCalls = [];
      this.ringtone = new Howl({ src: ["sounds/pink_panther.ogg"], loop: true });

      if (!navigator.getUserMedia) return unsupported();

      this.setLocalAudioStream(function(err, stream) {
        if (err || !stream) return;

        self.connectToPeerJS(function(err) {
          if (err) return;

          if (self.peers.length) self.callPeers();
        });
      });
    },

    setRequestCallID: function(callID) {
      this.requestCallID = callID;
    },

    setCurrentCallID: function(callID) {
      this.requestCallID = -1;
      this.currentCallID = callID;
    },

    isInCall: function() {
      return this.currentCallID !== -1;
    },

    contactPeers: function(peerIDs) {
      this.closeStreams();
      this.peers = peerIDs;
      this.callPeers();
    },

    // Connect to PeerJS and get an ID
    connectToPeerJS: function(cb) {
      var self = this;

      log.info('Contacting call server...');
      this.peer = new Peer({});

      this.peer.on('call', this.handleIncomingCall.bind(this));

      this.peer.on('open', function() {
        log.info('Connected.');
        log.info('Your ID: ' + self.peer.id);
        cb && cb(null, self.peer);
      });

      this.peer.on('error', function(err) {
        log.error(err);
        cb && cb(err);
      });
    },

    updateIdWithServer: function() {
      //display("Pinging server");
      socket.emit('peerID', me.id);
      //$.post('/id/' + call.id + '/updatepeer/' + me.id);
    },

    // me.disconnection();
    //setInterval(updateIdWithServer, 4000);

    closeStreams: function() {
      log.info("Closed streams");
      for (var index in this.peerCalls) {
        if (this.peerCalls[index].incoming)
          this.peerCalls[index].incoming.close();
        if (this.peerCalls[index].outgoing)
          this.peerCalls[index].outgoing.close();
      }
    },

    // Call each of the peer IDs using PeerJS
    callPeers: function() {
      for (var i = 0; i < this.peers.length; i++) {
        this.callPeer(this.peers[i]);
      }
    },

    callPeer: function(peerId) {
      var self = this;

      log.info('Calling ' + peerId + '...');
      var peer = this.getPeer(peerId);
      peer.outgoing = this.peer.call(peerId, this.stream);

      peer.outgoing.on('error', function(err) {
        log.error(err);
      });

      peer.outgoing.on('stream', function(stream) {
        log.info('Connected to ' + peerId + '.');
        self.addIncomingStream(peer, stream);
      });

      this.peerCalls.push(peer);
    },

    addAllowedCaller: function(peerID) {
      log.info(peerID + " was added as an expected caller");
      this.expectingCalls.push(peerID);
    },

    // When someone initiates a call via PeerJS
    handleIncomingCall: function(incoming) {
      var self = this;

      var expectingCallsLength = this.expectingCalls.length;
      var allowed = false;
      for (var i = 0; i < expectingCallsLength; i++) {
        log.debug("Checking " + this.expectingCalls[i]);
        if (this.expectingCalls[i] === incoming.peer) {
          allowed = true;
          this.expectingCalls.splice(i, 1);
          break;
        }
      }

      if (!allowed) {
        log.info(incoming.peer + " was denied as the call was unexpected");
        return;
      }

      log.info('Automatically answering incoming call from ' + incoming.peer);

      var peer = this.getPeer(incoming.peer);
      peer.incoming = incoming;

      // Answer call
      incoming.answer(this.stream);

      peer.incoming.on('stream', function(stream) {
        self.addIncomingStream(peer, stream);
      });

      this.peerCalls.push(peer);
    },

    // Add the new audio stream. Either from an incoming call, or
    // from the response to one of our outgoing calls
    addIncomingStream: function(peer, stream) {
      log.info('Adding incoming audio stream from ' + peer.id);
      peer.incomingStream = stream;
      this.playStream(stream);
    },

    // Create an <audio> element to play the audio stream
    playStream: function(stream) {
      var audio = $('<audio autoplay />').appendTo('body');
      audio[0].src = (URL || webkitURL || mozURL).createObjectURL(stream);
    },

    // Get access to the microphone
    setLocalAudioStream: function(cb) {
      var self = this;
      log.info('This app requires the use of a Microphone.');

      var accessMethod = navigator;
      if (typeof navigator.mediaDevices.getUserMedia === "function") {
        accessMethod = navigator.mediaDevices;
      }

      accessMethod.getUserMedia({
          video: false,
          audio: true
        },

        function success(audioStream) {
          log.info('Microphone is open.');
          self.stream = audioStream;
          if (cb) cb(null, self.stream);
        },

        function error(err) {
          log.error('Couldn\'t connect to microphone. If you clicked "Block" you must click  the icon with a red x and change to "Ask if..." and reload the page.');
          if (cb) cb(err);
        }
      );
    },

    ////////////////////////////////////
    // Helper functions
    getPeer: function(peerId) {
      return this.peers[peerId] || (this.peers[peerId] = {
        id: peerId
      });
    },

    unsupported: function() {
      display("Your browser doesn't support getUserMedia.");
    }
  });

  return Phone;
});
