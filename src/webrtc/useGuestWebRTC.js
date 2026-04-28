import { useCallback, useRef, useState } from 'react';
import { createPeerConnection } from './peer.js';

export function useGuestWebRTC() {
  const [status, setStatus] = useState('idle'); // 'idle'|'generating'|'ready'|'connected'|'failed'
  const [offerSdp, setOfferSdp] = useState('');
  const [error, setError] = useState(null);

  const peerRef = useRef(null);

  // Consumer sets this each render to receive messages
  const onMsgRef = useRef(null);

  const generateOffer = useCallback(async () => {
    setStatus('generating');
    setError(null);
    try {
      const onMessage = (msg) => {
        if (onMsgRef.current) onMsgRef.current(msg);
      };

      const onConnectionChange = (st) => {
        if (st === 'connected') setStatus('connected');
        if (st === 'failed') { setStatus('failed'); setError('Connection failed.'); }
        if (st === 'disconnected') setStatus('failed');
      };

      const peer = createPeerConnection(onMessage, onConnectionChange);
      peerRef.current = peer;

      const offerJson = await peer.createOffer();
      setOfferSdp(offerJson);
      setStatus('ready');
    } catch (e) {
      setError(String(e));
      setStatus('failed');
    }
  }, []);

  const finalise = useCallback(async (answerJson) => {
    if (!peerRef.current) return;
    try {
      await peerRef.current.acceptAnswer(answerJson);
    } catch (e) {
      setError(String(e));
      setStatus('failed');
    }
  }, []);

  const send = useCallback((msg) => {
    peerRef.current?.send(msg);
  }, []);

  return { status, offerSdp, error, generateOffer, finalise, send, onMsgRef };
}
