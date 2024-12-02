const socket = io();
let videoGrid; // Declare outside to ensure global scope
const localVideo = document.createElement('video');
localVideo.muted = true; // Mute local video to avoid feedback

// WebRTC configuration with STUN servers
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ]
};

let localStream;
const peers = {};
let localPeerId;
let isAudioEnabled = true;
let isVideoEnabled = true;
let isScreenSharing = false;

// Ensure DOM is loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    videoGrid = document.getElementById('video-grid');
    if (!videoGrid) {
        console.error('Video grid element not found. Check your HTML.');
        return;
    }

    // Initialize media stream on load
    setupMediaStream();
});

// Get user media
async function setupMediaStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
        });

        // Set video attributes for local stream
        localVideo.srcObject = localStream;
        localVideo.setAttribute('data-peer-id', 'local');
        localVideo.muted = true;

        // Add local video to grid
        addVideoStream(localVideo, localStream);

        localPeerId = generateUserId(); // Store local user ID
        socket.emit('join-room', ROOM_ID, localPeerId);

        socket.on('user-connected', (userId) => {
            console.log('New user connected:', userId);
            // Only initiate connection if our ID is greater (to avoid double connections)
            if (localPeerId > userId) {
                connectToNewUser(userId, localStream);
            }
            updateParticipantCount();
        });

        // Add error handling for peer connection
        socket.on('user-signal', async ({ userId, signal }) => {
            try {
                await handleUserSignal(userId, signal);
            } catch (error) {
                console.error('Error handling user signal:', error);
            }
        });

        socket.on('user-disconnected', (userId) => {
            removeUserVideo(userId);
        });

    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Unable to access camera or microphone. Please check your permissions.');
    }
}

function connectToNewUser(userId, stream) {
    if (peers[userId]) {
        console.log('Peer connection already exists for:', userId);
        return;
    }

    const peer = new RTCPeerConnection(configuration);
    peers[userId] = peer;

    stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
    });

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                userId: userId,
                signal: {
                    type: 'ice-candidate',
                    candidate: event.candidate
                }
            });
        }
    };

    peer.ontrack = (event) => {
        const video = document.createElement('video');
        video.setAttribute('data-peer-id', userId);
        addVideoStream(video, event.streams[0]);
    };

    peer.createOffer()
        .then(offer => peer.setLocalDescription(offer))
        .then(() => {
            socket.emit('signal', {
                userId: userId,
                signal: {
                    type: 'offer',
                    sdp: peer.localDescription
                }
            });
        })
        .catch(error => console.error('Offer creation error:', error));
}

async function handleUserSignal(userId, signal) {
    try {
        let peer = peers[userId];

        if (!peer) {
          peer = new RTCPeerConnection(configuration);
          peers[userId] = peer;
    
          // Set up peer event handlers
          peer.ontrack = (event) => {
            const video = document.createElement('video');
            video.srcObject = event.streams[0];
            video.autoplay = true;
            video.setAttribute('data-peer-id', userId);
            addVideoStream(video, event.streams[0]);
        };
        
    
          // Add local stream tracks
          localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
        }
    
        // Check if the peer connection is in a non-stable state
        if (peer.signalingState !== 'stable') {
          // Reset the peer connection
          await peer.close();
          delete peers[userId];
          peer = new RTCPeerConnection(configuration);
          peers[userId] = peer;
    
          // Reattach tracks and event handlers
          localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
          peer.ontrack = (event) => {
            const video = document.createElement('video');
            video.setAttribute('data-peer-id', userId);
            addVideoStream(video, event.streams[0]);
          };
        }
    

        switch (signal.type) {
            case 'offer':
                await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('signal', {
                    userId: userId,
                    signal: { type: 'answer', sdp: answer }
                });
                break;

            case 'answer':
                if (peer.signalingState === 'have-local-offer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                }
                break;

            case 'ice-candidate':
                if (peer.remoteDescription) {
                    try {
                        await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    } catch (icError) {
                        console.warn('Error adding ICE candidate:', icError);
                    }
                }
                break;
        }

        console.log(`Signal processed for user ${userId}. Final state: ${peer.signalingState}`);
    } catch (error) {
        console.error(`Critical error handling signal from ${userId}:`, error);
        
        // Additional cleanup
        if (peers[userId]) {
          try {
            peers[userId].close();
            delete peers[userId];
          } catch (cleanupError) {
            console.error('Error during peer cleanup:', cleanupError);
          }
        }
        removeUserVideo(userId);
    }
}

function addVideoStream(video, stream) {
    if (!videoGrid || !stream) {
        console.error('Video grid or stream is missing');
        return;
    }

    try {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(error => {
                console.error('Error playing video:', error);
            });
        });

        video.setAttribute('autoplay', true);
        video.setAttribute('playsinline', true);

        video.onerror = (error) => {
            console.error('Video error:', error);
        };

        videoGrid.appendChild(video);
        updateParticipantCount();
    } catch (error) {
        console.error('Error adding video stream:', error);
    }
}

function removeUserVideo(userId) {
    const videoToRemove = document.querySelector(`[data-peer-id="${userId}"]`);
    if (videoToRemove) {
        videoGrid.removeChild(videoToRemove);
        delete peers[userId];
        updateParticipantCount();
    }
}

// Existing toggle and utility functions remain the same...
function toggleAudio() {
    isAudioEnabled = !isAudioEnabled;
    localStream.getAudioTracks().forEach((track) => (track.enabled = isAudioEnabled));
    updateButtons();
}

function toggleVideo() {
    isVideoEnabled = !isVideoEnabled;
    localStream.getVideoTracks().forEach((track) => (track.enabled = isVideoEnabled));
    updateButtons();
}

function toggleScreenShare() {
    if (!isScreenSharing) {
        navigator.mediaDevices.getDisplayMedia({ video: true }).then((screenStream) => {
            const screenTrack = screenStream.getVideoTracks()[0];
            replaceTrack(screenTrack);
            screenTrack.onended = () => toggleScreenShare(); // Stop sharing when track ends
            isScreenSharing = true;
            updateButtons();
        });
    } else {
        const videoTrack = localStream.getVideoTracks()[0];
        replaceTrack(videoTrack);
        isScreenSharing = false;
        updateButtons();
    }
}

function replaceTrack(newTrack) {
    Object.values(peers).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track.kind === newTrack.kind);
        if (sender) sender.replaceTrack(newTrack);
    });
}

function leaveMeeting() {
    Object.values(peers).forEach((peer) => peer.close());
    socket.emit('leave-room', ROOM_ID);
    window.location.href = '/';
}

function generateUserId() {
    return Math.random().toString(36).substring(2, 15);
}

function updateParticipantCount(count = Object.keys(peers).length + 1) {
    const participantElement = document.getElementById('participantCount');
    if (participantElement) {
        participantElement.innerText = `${count} Participants`;
    }
}

function updateButtons() {
    document.getElementById('audioBtn').classList.toggle('btn-danger', !isAudioEnabled);
    document.getElementById('videoBtn').classList.toggle('btn-danger', !isVideoEnabled);
    document.getElementById('screenBtn').classList.toggle('btn-danger', isScreenSharing);
}
setupMediaStream();
