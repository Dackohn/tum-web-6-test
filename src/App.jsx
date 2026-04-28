import { useCallback, useEffect, useRef, useState } from 'react';
import { useHostWebRTC } from './webrtc/useHostWebRTC.js';
import { useGuestWebRTC } from './webrtc/useGuestWebRTC.js';
import { initGame, playCard, drawCard, publicView } from './game/crazyEights.js';
import { Lobby } from './components/Lobby.jsx';
import { GameBoard } from './components/GameBoard.jsx';

// ── HostApp ────────────────────────────────────────────────────────────────

function HostApp({ onBack }) {
  const { players, connectedIds, pendingAnswer, setPendingAnswer, acceptGuestOffer, send, broadcast, onMsgRef } =
    useHostWebRTC();

  // Use refs for values needed inside the message handler closure (avoids stale closures)
  const gameStateRef = useRef(null);
  const playerNamesRef = useRef({});

  // State for rendering
  const [gameState, setGameState] = useState(null);
  const [playerNames, setPlayerNames] = useState({});

  // Sync refs whenever state updates
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { playerNamesRef.current = playerNames; }, [playerNames]);

  // Message handler — assigned at render time (not in useEffect) per codebase pattern
  onMsgRef.current = useCallback((fromId, msg) => {
    if (msg.type === 'set-name') {
      const newNames = { ...playerNamesRef.current, [fromId]: msg.name };
      playerNamesRef.current = newNames;
      setPlayerNames(newNames);
      broadcast({ type: 'name-update', names: newNames });
    }

    if (msg.type === 'play-card') {
      const st = gameStateRef.current;
      if (!st) return;
      const result = playCard(st, fromId, msg.card, msg.chosenSuit || null);
      if (result.err) {
        send(fromId, { type: 'error', message: result.err });
        return;
      }
      const newState = result.state;
      gameStateRef.current = newState;
      setGameState(newState);

      const names = playerNamesRef.current;
      broadcast({ type: 'state-update', state: publicView(newState, names) });
      // Send each player their private hand
      for (const id of newState.order) {
        send(id, { type: 'hand-update', hand: newState.hands[id] });
      }
      if (newState.winner) {
        broadcast({ type: 'game-over', winner: newState.winner });
      }
    }

    if (msg.type === 'draw-card') {
      const st = gameStateRef.current;
      if (!st) return;
      const result = drawCard(st, fromId);
      if (result.err) {
        send(fromId, { type: 'error', message: result.err });
        return;
      }
      const newState = result.state;
      gameStateRef.current = newState;
      setGameState(newState);

      const names = playerNamesRef.current;
      broadcast({ type: 'state-update', state: publicView(newState, names) });
      for (const id of newState.order) {
        send(id, { type: 'hand-update', hand: newState.hands[id] });
      }
    }
  }, [broadcast, send]);

  const startGame = useCallback(() => {
    const ids = connectedIds;
    if (ids.length < 1) return;
    const state = initGame(ids);
    gameStateRef.current = state;
    setGameState(state);

    const names = playerNamesRef.current;
    // Send each player their hand + id
    for (const id of ids) {
      send(id, { type: 'init', hand: state.hands[id], playerId: id });
    }
    // Broadcast game start with public view
    broadcast({ type: 'game-start', state: publicView(state, names) });
  }, [connectedIds, send, broadcast]);

  const handleQuit = useCallback(() => {
    gameStateRef.current = null;
    setGameState(null);
    onBack();
  }, [onBack]);

  if (gameState) {
    return (
      <GameBoard
        isHost
        myId={null}
        myHand={[]}
        publicState={publicView(gameState, playerNames)}
        gameOver={!!gameState.winner}
        onPlayCard={() => {}}
        onDrawCard={() => {}}
        onQuit={handleQuit}
      />
    );
  }

  return (
    <Lobby
      role="host"
      players={players}
      connectedIds={connectedIds}
      pendingAnswer={pendingAnswer}
      setPendingAnswer={setPendingAnswer}
      onAcceptOffer={acceptGuestOffer}
      onStartGame={startGame}
      onBack={onBack}
    />
  );
}

// ── GuestApp ───────────────────────────────────────────────────────────────

function GuestApp({ onBack }) {
  const { status, offerSdp, error, generateOffer, finalise, send, onMsgRef } =
    useGuestWebRTC();

  const [myHand, setMyHand] = useState([]);
  const [myId, setMyId] = useState(null);
  const [pubState, setPubState] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [guestName, setGuestName] = useState('');

  // Refs for use inside message handler
  const myIdRef = useRef(null);
  useEffect(() => { myIdRef.current = myId; }, [myId]);

  // Send name as soon as connection is established
  const sentNameRef = useRef(false);
  useEffect(() => {
    if (status === 'connected' && !sentNameRef.current && guestName.trim()) {
      sentNameRef.current = true;
      send({ type: 'set-name', name: guestName.trim() });
    }
  }, [status, guestName, send]);

  // Message handler assigned at render time
  onMsgRef.current = (msg) => {
    if (msg.type === 'init') {
      setMyId(msg.playerId);
      myIdRef.current = msg.playerId;
      setMyHand(msg.hand);
    }
    if (msg.type === 'game-start') {
      setPubState(msg.state);
      setGameStarted(true);
    }
    if (msg.type === 'state-update') {
      setPubState(msg.state);
    }
    if (msg.type === 'hand-update') {
      setMyHand(msg.hand);
    }
    if (msg.type === 'game-over') {
      setGameOver(true);
    }
  };

  const handlePlayCard = useCallback((card, chosenSuit) => {
    send({ type: 'play-card', card, chosenSuit });
  }, [send]);

  const handleDrawCard = useCallback(() => {
    send({ type: 'draw-card' });
  }, [send]);

  const handleQuit = useCallback(() => {
    setGameStarted(false);
    setGameOver(false);
    setPubState(null);
    setMyHand([]);
    setMyId(null);
    onBack();
  }, [onBack]);

  if (gameStarted) {
    return (
      <GameBoard
        isHost={false}
        myId={myId}
        myHand={myHand}
        publicState={pubState}
        gameOver={gameOver}
        onPlayCard={handlePlayCard}
        onDrawCard={handleDrawCard}
        onQuit={handleQuit}
      />
    );
  }

  return (
    <Lobby
      role="guest"
      status={status}
      offerSdp={offerSdp}
      error={error}
      guestName={guestName}
      setGuestName={setGuestName}
      onGenerateOffer={generateOffer}
      onFinalise={finalise}
      onBack={onBack}
    />
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const [role, setRole] = useState(null);

  if (!role) {
    return <Lobby role={null} onSelectRole={setRole} />;
  }
  if (role === 'host') {
    return <HostApp onBack={() => setRole(null)} />;
  }
  return <GuestApp onBack={() => setRole(null)} />;
}
