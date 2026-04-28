// STUN: discovers public IP for NAT traversal.
// TURN (openrelay public test servers): relay of last resort when direct paths fail —
// e.g. Chrome mDNS-obfuscated local IPs on Windows, or symmetric NAT.
// These are client-side ICE configs — no server we host.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80',              username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443',             username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

// Vanilla ICE: all candidates baked into the SDP before exchanging.
// Avoids trickle-ICE which needs a persistent signaling channel.
export function createPeerConnection(onMessage, onConnectionChange) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  let channel = null;

  function attachChannel(ch) {
    channel = ch;
    ch.onopen = () => { console.log('[WebRTC] channel open'); onConnectionChange('connected'); };
    ch.onclose = () => onConnectionChange('disconnected');
    ch.onerror = (e) => console.error('[WebRTC] channel error', e);
    ch.onmessage = (e) => onMessage(JSON.parse(e.data));
  }

  pc.addEventListener('iceconnectionstatechange', () =>
    console.log('[WebRTC] ICE state:', pc.iceConnectionState));
  // Only fire 'failed'/'disconnected' from connectionstatechange.
  // 'connected' is fired exclusively from ch.onopen so the data channel
  // is guaranteed open by the time the Game component mounts and tries to send.
  pc.addEventListener('connectionstatechange', () => {
    console.log('[WebRTC] connection state:', pc.connectionState);
    if (pc.connectionState === 'failed')  onConnectionChange('failed');
    if (pc.connectionState === 'closed')  onConnectionChange('disconnected');
  });

  // Wait for ICE gathering to finish (null-candidate sentinel), with a hard timeout.
  // 8 s gives TURN relay candidates time to arrive — they're the reliable fallback.
  function waitForIceGathering(timeoutMs = 8000) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') { resolve(pc.localDescription); return; }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const n = (pc.localDescription?.sdp.match(/a=candidate/g) ?? []).length;
        console.log(`[WebRTC] ICE gathered — ${n} candidate(s)`);
        resolve(pc.localDescription);
      };

      const timer = setTimeout(() => {
        console.warn('[WebRTC] ICE gathering timed out — using partial candidates');
        finish();
      }, timeoutMs);

      pc.addEventListener('icecandidate', (e) => { if (e.candidate === null) finish(); });
    });
  }

  async function createOffer() {
    channel = pc.createDataChannel('game', { ordered: true });
    attachChannel(channel);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const desc = await waitForIceGathering();
    if (!desc) throw new Error('No local description after ICE gathering');
    return JSON.stringify({ type: desc.type, sdp: desc.sdp });
  }

  async function acceptOffer(offerJson) {
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    pc.addEventListener('datachannel', (e) => attachChannel(e.channel));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const desc = await waitForIceGathering();
    if (!desc) throw new Error('No local description after ICE gathering');
    return JSON.stringify({ type: desc.type, sdp: desc.sdp });
  }

  async function acceptAnswer(answerJson) {
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerJson)));
  }

  function send(data) {
    if (channel?.readyState === 'open') channel.send(JSON.stringify(data));
  }

  function close() { channel?.close(); pc.close(); }

  return { createOffer, acceptOffer, acceptAnswer, send, close };
}
