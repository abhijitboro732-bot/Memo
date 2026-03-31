import { ICE_SERVERS } from './constants';

export function createPeerConnection(
  onICECandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (stream: MediaStream) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onICECandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    if (event.streams[0]) {
      onTrack(event.streams[0]);
    }
  };

  pc.onconnectionstatechange = () => {
    onConnectionStateChange?.(pc.connectionState);
  };

  return pc;
}

export async function getLocalStream(video = true, audio = true): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio });
  } catch (error) {
    console.error('Failed to get local stream:', error);
    throw error;
  }
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function handleOffer(
  pc: RTCPeerConnection,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
}

export async function handleAnswer(
  pc: RTCPeerConnection,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleICECandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Failed to add ICE candidate:', error);
  }
}

export function closeConnection(pc: RTCPeerConnection, stream?: MediaStream): void {
  stream?.getTracks().forEach((track) => track.stop());
  pc.close();
}
