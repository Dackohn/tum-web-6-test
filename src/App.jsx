import { useCallback, useState } from 'react';
import { useWebRTC } from './webrtc/useWebRTC.js';
import { Lobby } from './components/Lobby.jsx';
import { Game } from './components/Game.jsx';

export default function App() {
  const [lastMessage, setLastMessage] = useState(null);
  const [gameRole, setGameRole] = useState(null);

  const onMessage = useCallback((data) => setLastMessage(data), []);

  const { status, error, offerSdp, answerSdp, host, join, finalise, send, disconnect } = useWebRTC(onMessage);

  const handleHost = useCallback(() => { setGameRole('host'); host(); }, [host]);
  const handleJoin = useCallback((sdp) => { setGameRole('join'); join(sdp); }, [join]);
  const handleDisconnect = useCallback(() => {
    disconnect();
    setGameRole(null);
    setLastMessage(null);
  }, [disconnect]);

  if (status === 'connected') {
    return <Game role={gameRole} send={send} lastMessage={lastMessage} onDisconnect={handleDisconnect} />;
  }

  return (
    <Lobby
      status={status}
      error={error}
      offerSdp={offerSdp}
      answerSdp={answerSdp}
      onHost={handleHost}
      onJoin={handleJoin}
      onFinalise={finalise}
    />
  );
}
