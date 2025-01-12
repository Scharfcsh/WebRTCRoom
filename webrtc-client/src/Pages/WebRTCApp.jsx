import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const WebRTCApp = () => {
  const [userName] = useState(`Rob-${Math.floor(Math.random() * 100000)}`);
  const [availableOffers, setAvailableOffers] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const didIOfferRef = useRef(false);

  const peerConfiguration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ]
      }
    ]
  };

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3000/', {
      auth: {
        userName,
        password: 'x'
      }
    });

    // Socket event listeners
    socketRef.current.on('availableOffers', (offers) => {
      setAvailableOffers(offers);
    });

    socketRef.current.on('newOfferAwaiting', (offer) => {
      setAvailableOffers(prev => [...prev, ...offer]);
    });

    socketRef.current.on('answerResponse', (offerObj) => {
      addAnswer(offerObj);
    });

    socketRef.current.on('receivedIceCandidateFromServer', (iceCandidate) => {
      addNewIceCandidate(iceCandidate);
    });

    return () => {
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [userName]);

  const fetchUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  };

  const createPeerConnection = async (offerObj) => {
    peerConnectionRef.current = new RTCPeerConnection(peerConfiguration);
    remoteStreamRef.current = new MediaStream();
    remoteVideoRef.current.srcObject = remoteStreamRef.current;

    localStreamRef.current.getTracks().forEach(track => {
      peerConnectionRef.current.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current.addEventListener('icecandidate', (e) => {
      if (e.candidate) {
        socketRef.current.emit('sendIceCandidateToSignalingServer', {
          iceCandidate: e.candidate,
          iceUserName: userName,
          didIOffer: didIOfferRef.current,
        });
      }
    });

    peerConnectionRef.current.addEventListener('track', (e) => {
      e.streams[0].getTracks().forEach(track => {
        remoteStreamRef.current.addTrack(track);
      });
    });

    if (offerObj) {
      await peerConnectionRef.current.setRemoteDescription(offerObj.offer);
    }
  };

  const initiateCall = async () => {
    await fetchUserMedia();
    await createPeerConnection();

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      didIOfferRef.current = true;
      socketRef.current.emit('newOffer', offer);
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const answerOffer = async (offerObj) => {
    await fetchUserMedia();
    await createPeerConnection(offerObj);
    
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    
    offerObj.answer = answer;
    const offerIceCandidates = await socketRef.current.emitWithAck('newAnswer', offerObj);
    
    offerIceCandidates.forEach(candidate => {
      peerConnectionRef.current.addIceCandidate(candidate);
    });
  };

  const addAnswer = async (offerObj) => {
    await peerConnectionRef.current.setRemoteDescription(offerObj.answer);
  };

  const addNewIceCandidate = (iceCandidate) => {
    peerConnectionRef.current.addIceCandidate(iceCandidate);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">WebRTC Video Chat</h1>
      <div className="mb-4">
        <p>Your username: {userName}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Local Video</h2>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full border border-gray-300 rounded"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Remote Video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={initiateCall}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start Call
        </button>
      </div>

      {availableOffers.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Available Offers</h2>
          <ul className="space-y-2">
            {availableOffers.map((offer, index) => (
              <li key={index} className="flex items-center gap-2">
                <span>Call from {offer.offererUserName}</span>
                <button
                  onClick={() => answerOffer(offer)}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Answer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WebRTCApp;