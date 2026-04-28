import { useCallback, useRef, useState } from 'react';
import { createPeerConnection } from './peer.js';

function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useHostWebRTC() {
  const peersRef = useRef({}); // { [id]: peerApi }

  const [players, setPlayers] = useState({}); // { [id]: { name, status } }
  const [pendingAnswer, setPendingAnswer] = useState(null); // { id, sdp } | null

  // Consumer sets this each render to receive messages
  const onMsgRef = useRef(null);

  const acceptGuestOffer = useCallback(async (offerJson) => {
    const id = randomId();

    const onMessage = (msg) => {
      if (onMsgRef.current) onMsgRef.current(id, msg);
    };

    const onConnectionChange = (status) => {
      setPlayers((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? { name: id }), status },
      }));
    };

    const peer = createPeerConnection(onMessage, onConnectionChange);
    peersRef.current[id] = peer;

    // Register player as waiting
    setPlayers((prev) => ({
      ...prev,
      [id]: { name: id, status: 'waiting' },
    }));

    const answerJson = await peer.acceptOffer(offerJson);
    setPendingAnswer({ id, sdp: answerJson });
    return answerJson;
  }, []);

  const send = useCallback((toId, msg) => {
    peersRef.current[toId]?.send(msg);
  }, []);

  const broadcast = useCallback((msg) => {
    for (const peer of Object.values(peersRef.current)) {
      peer.send(msg);
    }
  }, []);

  const connectedIds = Object.entries(players)
    .filter(([, p]) => p.status === 'connected')
    .map(([id]) => id);

  return {
    players,
    connectedIds,
    pendingAnswer,
    setPendingAnswer,
    acceptGuestOffer,
    send,
    broadcast,
    onMsgRef,
  };
}
