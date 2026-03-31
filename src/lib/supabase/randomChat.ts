import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Realtime-based matchmaking and WebRTC signaling for random video chat.
 * 
 * Flow:
 * 1. User joins "random-queue" presence channel
 * 2. When 2+ users are in queue, they get matched into a private room
 * 3. Private room uses Supabase broadcast for WebRTC signaling
 * 4. WebRTC handles actual video/audio peer-to-peer
 */

export interface QueueUser {
  userId: string;
  username: string;
  avatar_url: string;
  joinedAt: string;
}

export type MatchmakingCallback = {
  onMatched: (roomId: string, partner: QueueUser) => void;
  onQueueUpdate: (count: number) => void;
};

export class RandomMatchmaker {
  private supabase = createClient();
  private queueChannel: RealtimeChannel | null = null;
  private roomChannel: RealtimeChannel | null = null;
  private userId: string;
  private username: string;
  private avatar_url: string;
  private callbacks: MatchmakingCallback;
  private matched = false;

  constructor(userId: string, username: string, avatar_url: string, callbacks: MatchmakingCallback) {
    this.userId = userId;
    this.username = username;
    this.avatar_url = avatar_url;
    this.callbacks = callbacks;
  }

  async joinQueue() {
    this.matched = false;
    const channelName = 'random-video-queue';

    this.queueChannel = this.supabase.channel(channelName, {
      config: {
        presence: { key: this.userId },
      },
    });

    this.queueChannel.on('presence', { event: 'sync' }, () => {
      if (this.matched) return;
      const state = this.queueChannel!.presenceState();
      const users: QueueUser[] = [];
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((p: any) => {
          users.push({
            userId: p.userId,
            username: p.username,
            avatar_url: p.avatar_url,
            joinedAt: p.joinedAt,
          });
        });
      });

      this.callbacks.onQueueUpdate(users.length);

      // Try to match: pick the user who joined earliest (not ourselves)
      const others = users
        .filter(u => u.userId !== this.userId)
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

      if (others.length > 0 && !this.matched) {
        const partner = others[0];
        // Deterministic room ID: sorted IDs ensure both users get the same room
        const ids = [this.userId, partner.userId].sort();
        const roomId = `random-room-${ids[0].slice(0, 8)}-${ids[1].slice(0, 8)}-${Date.now()}`;

        // Only the "alphabetically first" user initiates the match announcement
        if (this.userId === ids[0]) {
          this.matched = true;
          // Broadcast match to partner
          this.queueChannel!.send({
            type: 'broadcast',
            event: 'match',
            payload: {
              roomId,
              initiator: { userId: this.userId, username: this.username, avatar_url: this.avatar_url },
              partner: partner,
            },
          });
          this.callbacks.onMatched(roomId, partner);
        }
      }
    });

    // Listen for match broadcast
    this.queueChannel.on('broadcast', { event: 'match' }, ({ payload }) => {
      if (this.matched) return;
      if (payload.partner.userId === this.userId) {
        this.matched = true;
        this.callbacks.onMatched(payload.roomId, payload.initiator);
      }
    });

    await this.queueChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.queueChannel!.track({
          userId: this.userId,
          username: this.username,
          avatar_url: this.avatar_url,
          joinedAt: new Date().toISOString(),
        });
      }
    });
  }

  async leaveQueue() {
    if (this.queueChannel) {
      await this.queueChannel.untrack();
      this.supabase.removeChannel(this.queueChannel);
      this.queueChannel = null;
    }
  }

  cleanup() {
    this.leaveQueue();
    if (this.roomChannel) {
      this.supabase.removeChannel(this.roomChannel);
      this.roomChannel = null;
    }
  }
}

/**
 * WebRTC signaling via Supabase Realtime broadcast
 */
export class WebRTCSignaling {
  private supabase = createClient();
  private channel: RealtimeChannel | null = null;
  private roomId: string;
  private userId: string;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }

  async connect(handlers: {
    onOffer: (offer: RTCSessionDescriptionInit) => void;
    onAnswer: (answer: RTCSessionDescriptionInit) => void;
    onIceCandidate: (candidate: RTCIceCandidateInit) => void;
    onChatMessage: (msg: { text: string; userId: string; username: string; time: string }) => void;
    onPartnerLeft: () => void;
  }) {
    this.channel = this.supabase.channel(`webrtc:${this.roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: this.userId },
      },
    });

    this.channel.on('broadcast', { event: 'offer' }, ({ payload }) => {
      if (payload.from !== this.userId) handlers.onOffer(payload.sdp);
    });

    this.channel.on('broadcast', { event: 'answer' }, ({ payload }) => {
      if (payload.from !== this.userId) handlers.onAnswer(payload.sdp);
    });

    this.channel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
      if (payload.from !== this.userId) handlers.onIceCandidate(payload.candidate);
    });

    this.channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (payload.userId !== this.userId) handlers.onChatMessage(payload);
    });

    this.channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
      if (payload.userId !== this.userId) handlers.onPartnerLeft();
    });

    this.channel.on('presence', { event: 'leave' }, () => {
      handlers.onPartnerLeft();
    });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel!.track({ userId: this.userId, online: true });
      }
    });
  }

  async sendOffer(sdp: RTCSessionDescriptionInit) {
    this.channel?.send({ type: 'broadcast', event: 'offer', payload: { from: this.userId, sdp } });
  }

  async sendAnswer(sdp: RTCSessionDescriptionInit) {
    this.channel?.send({ type: 'broadcast', event: 'answer', payload: { from: this.userId, sdp } });
  }

  async sendIceCandidate(candidate: RTCIceCandidateInit) {
    this.channel?.send({ type: 'broadcast', event: 'ice-candidate', payload: { from: this.userId, candidate } });
  }

  async sendChat(text: string, username: string) {
    this.channel?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { text, userId: this.userId, username, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    });
  }

  async sendLeave() {
    this.channel?.send({ type: 'broadcast', event: 'leave', payload: { userId: this.userId } });
  }

  cleanup() {
    if (this.channel) {
      this.channel.untrack();
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

/**
 * Create and manage a WebRTC peer connection
 */
export function createPeerConnection(
  signaling: WebRTCSignaling,
  localStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void,
  isInitiator: boolean,
): RTCPeerConnection {
  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  const pc = new RTCPeerConnection(config);

  // Add local tracks
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // Handle remote tracks
  pc.ontrack = (event) => {
    if (event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  // Send ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      signaling.sendIceCandidate(event.candidate.toJSON());
    }
  };

  // If initiator, create offer
  if (isInitiator) {
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          signaling.sendOffer(pc.localDescription);
        }
      });
  }

  return pc;
}
