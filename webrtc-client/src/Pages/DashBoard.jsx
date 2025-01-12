import React, { useEffect, useRef, useState } from "react";
import { PhoneCall, Users, Video } from "lucide-react";
import useFetchUsers from "../hooks/useFetchUsers";
import Button from "../components/Button";
import useOnlineUsers from "../hooks/useOnlineUsers";
import Badge from "../components/Badge";
// import { call, } from "../socket/socketListeners";
import { useAuthContext } from "../context/AuthContext";
import { useSocketContext } from "../context/SocketContext";

let pc1;

const Dashboard = () => {
  const peerConfiguration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };
  const { authUser } = useAuthContext();
  const { socket, anyoffer, offerObject, addIceCandidates } =
    useSocketContext();
  const { users } = useFetchUsers();
  const { onlineUsers } = useOnlineUsers();

  const [incomingCall, setIncomingCall] = useState(null);
  useEffect(() => {
    console.log("incoming call", anyoffer);
    setIncomingCall(anyoffer[0]);
  }, [anyoffer]);

  const [selectedUser, setSelectedUser] = useState("");
  const socketRef = useRef(null);
  socketRef.current = socket;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const didIOfferRef = useRef(false);

  // useEffect(() => {
  //   return () => {
  //     cleanupCall();
  //   };
  // }, []);

  // const cleanupCall = () => {
  //   if (localStreamRef.current) {
  //     localStreamRef.current.getTracks().forEach((track) => track.stop());
  //   }
  //   if (peerConnectionRef.current) {
  //     peerConnectionRef.current.close();
  //   }
  //   setIsCallActive(false);
  // };
  // const fetchUserMedia = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: true,
  //     });
  //     localVideoRef.current.srcObject = stream;
  //     localStreamRef.current = stream;
  //   } catch (err) {
  //     console.error("Error accessing media devices:", err);
  //   }
  // };

  const fetchUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true, // Added audio support
      });

      localVideoRef.current.srcObject = stream;

      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      throw err;
    }
  };

  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection(peerConfiguration);
    peerConnectionRef.current = pc;

    // Set up media streams
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        socketRef.current.emit("sendIceCandidateToSignalingServer", {
          iceCandidate: event.candidate,
          iceUserId: authUser._id,
          didIOffer: didIOfferRef.current,
        });
      }
    });

    // Handle incoming tracks
    pc.addEventListener("track", (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
    });

    // Debug signaling state changes
    pc.addEventListener("signalingstatechange", () => {
      console.log("Signaling State:", pc.signalingState);
    });

    // Debug connection state changes
    pc.addEventListener("connectionstatechange", () => {
      console.log("Connection State:", pc.connectionState);
    });

    return pc;
  };
  //----------------------------------------------------------------------------------------------
  const initiateCall = async () => {
    try {
      await fetchUserMedia();
      const pc = await setupPeerConnection();

      console.log(
        "Creating offer..................................................................."
      );
      console.log(
        "................................................................................."
      );
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      didIOfferRef.current = true;
      socketRef.current.emit("newOffer", authUser._id, offer);
      console.log(offer);
      console.log(
        "Offer Created..................................................................."
      );
      console.log(
        "................................................................................."
      );
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  const answerOffer = async (offerObj) => {
    await fetchUserMedia();
    const pc = await setupPeerConnection();

    await pc.setRemoteDescription(offerObj.offer);

    console.log(
      "--------------------------------------------------------------"
    );
    console.log("-------------------------creating answer---------");

    const answer = await pc.createAnswer({});
    await pc.setLocalDescription(answer);
    console.log(offerObj);
    console.log(
      "--------------------------------------------------------------"
    );
    console.log(
      "answer created----------------------------------------------",
      answer
    );
    offerObj.answer = answer;
    const offerIceCandidates = await socket.emitWithAck(
      "newAnswer",
      offerObj
    );
    console.log("offerIceCandidates", offerIceCandidates);
    // offerIceCandidates.forEach((candidate) => {
    //   peerConnectionRef.current.addIceCandidate(candidate);
    //   console.log("======Added Ice Candidate======");
    // });
    offerIceCandidates.forEach((candidate) => {
      pc.addIceCandidate(candidate);
    });
    console.log(offerIceCandidates);
  };

  // const addAnswer = async (offerObject) => {
  //   await peerConnectionRef.current.setRemoteDescription(offerObject.answer);
  // };

  // if (offerObject) {
  //   addAnswer(offerObject);
  // }
  const addAnswer = async (offerObject) => {
    try {
      if (peerConnectionRef.current && offerObject?.answer) {
        await peerConnectionRef.current.setRemoteDescription(
          offerObject.answer
        );
      }
    } catch (err) {
      console.error("Error adding answer:", err);
    }
  };

  // Handle offer object updates
  useEffect(() => {
    if (offerObject) {
      addAnswer(offerObject);
    }
  }, [offerObject]);

  const handleUserClick = (id) => {
    setSelectedUser(id);
    console.log("selected user detail", selectedUser);
    // call();
    initiateCall();
  };
  const handleAnswerCall = () => {
    setSelectedUser(incomingCall);
    answerOffer(incomingCall);
    setIncomingCall(null);
  };

  useEffect(() => {
    if (peerConnectionRef.current && addIceCandidates) {
      peerConnectionRef.current
        .addIceCandidate(addIceCandidates)
        .catch((err) => console.error("Error adding ICE candidate:", err));
    }
  }, [addIceCandidates]);


  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
    }
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    peerConnectionRef.current = null;
  };
  
  // Add this to your "End Call" button click handler
  const handleEndCall = () => {
    cleanupCall();
    setSelectedUser(null);
  };
  // if (addIceCandidates) {
  //   pc.addIceCandidate(addIceCandidates);
  // }
  // useEffect(() => {
  //   if (selectedUser) {
  //     fetchUserMedia();
  //   }
  // }, [selectedUser]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Video Chat Dashboard</h1>
        <Button />
      </header>
      <main className="container mx-auto p-4">
        {!selectedUser ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Users className="mr-2" /> Available Users
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="bg-white p-4 relative rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-center"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {user.name.charAt(0)}
                  </div>
                  <span className="w-1/3">{user.name}</span>
                  <span className="text-end w-1/3 ml-10">
                    {onlineUsers.includes(user.id) ? (
                      // "Online"
                      <Badge colour="green" value="Online" />
                    ) : (
                      // "Offline"
                      <Badge colour="red" value="Offline" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Video className="mr-2" /> Video Call with {selectedUser.name}
              </h2>
              <button
                onClick={handleEndCall}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                End Call
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-gray-300 rounded-lg aspect-video flex items-center justify-center text-gray-600">
                <video
                  id="Outgoing-video"
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                >
                  localVideoEl
                </video>
              </div>
              <div className="flex-1 bg-gray-300 rounded-lg aspect-video flex items-center justify-center text-gray-600">
                <video
                  id="Incoming-video"
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{ transform: 'scaleX(-1)' }}
                >
                  {selectedUser.name}'s Video
                </video>
              </div>
            </div>
          </div>
        )}
      </main>
      {incomingCall && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <p className="mb-2">Incoming call</p>
          <button
            onClick={handleAnswerCall}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <PhoneCall className="mr-2" size={18} />
            Answer Call
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
