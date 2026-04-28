import { useCallback, useRef, useState } from 'react';
import { createPeerConnection } from './peer.js';

export function useWebRTC(onMessage) {
  const [status, setStatus] = useState('idle');
  const [offerSdp, setOfferSdp] = useState('');
  const [answerSdp, setAnswerSdp] = useState('');
  const [error, setError] = useState(null);
  const peerRef = useRef(null);

  const handleConnectionChange = useCallback((state) => setStatus(state), []);
  const handleMessage = useCallback((data) => onMessage(data), [onMessage]);

  const host = useCallback(async () => {
    setError(null);
    setStatus('hosting');
    try {
      peerRef.current = createPeerConnection(handleMessage, handleConnectionChange);
      const sdp = await peerRef.current.createOffer();
      setOfferSdp(sdp);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [handleMessage, handleConnectionChange]);

  const join = useCallback(async (offerJson) => {
    setError(null);
    setStatus('joining');
    try {
      peerRef.current = createPeerConnection(handleMessage, handleConnectionChange);
      const sdp = await peerRef.current.acceptOffer(offerJson);
      setAnswerSdp(sdp);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [handleMessage, handleConnectionChange]);

  const finalise = useCallback(async (answerJson) => {
    setError(null);
    try {
      await peerRef.current.acceptAnswer(answerJson);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  const send = useCallback((data) => peerRef.current?.send(data), []);

  const disconnect = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    setStatus('idle');
    setOfferSdp('');
    setAnswerSdp('');
    setError(null);
  }, []);

  return { status, error, offerSdp, answerSdp, host, join, finalise, send, disconnect };
}
