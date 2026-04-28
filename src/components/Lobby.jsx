import { useState } from 'react';
import styles from './Lobby.module.css';

function copy(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Role selector ──────────────────────────────────────────────────────────

function RoleSelector({ onSelectRole }) {
  return (
    <div className={styles.lobby}>
      <h1 className={styles.title}>Crazy Eights</h1>
      <p className={styles.sub}>Multiplayer card game · WebRTC · no server</p>
      <div className={styles.row}>
        <button className={styles.btn} onClick={() => onSelectRole('host')}>
          Host a Game
        </button>
        <button className={styles.btnAlt} onClick={() => onSelectRole('guest')}>
          Join a Game
        </button>
      </div>
    </div>
  );
}

// ── Host lobby ─────────────────────────────────────────────────────────────

function HostLobby({
  players,
  connectedIds,
  pendingAnswer,
  setPendingAnswer,
  onAcceptOffer,
  onStartGame,
  onBack,
}) {
  const [offerInput, setOfferInput] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerateAnswer() {
    if (!offerInput.trim()) return;
    setLoading(true);
    try {
      await onAcceptOffer(offerInput.trim());
    } finally {
      setLoading(false);
      setOfferInput('');
    }
  }

  return (
    <div className={styles.lobby}>
      <h2 className={styles.title}>Host Lobby</h2>

      {/* Player list */}
      <div className={styles.playerList}>
        {Object.entries(players).length === 0 && (
          <p className={styles.sub}>No players yet.</p>
        )}
        {Object.entries(players).map(([id, p]) => (
          <div key={id} className={styles.playerRow}>
            <span className={styles.playerName}>{p.name !== id ? p.name : `Player (${id})`}</span>
            <span
              className={`${styles.badge} ${
                p.status === 'connected'
                  ? styles.badgeConnected
                  : p.status === 'disconnected'
                  ? styles.badgeDisconnected
                  : styles.badgeWaiting
              }`}
            >
              {p.status}
            </span>
          </div>
        ))}
      </div>

      {/* Add player panel */}
      <button className={styles.btnAlt} onClick={() => setAddOpen((v) => !v)}>
        {addOpen ? 'Hide Add Player' : 'Add Player'}
      </button>

      {addOpen && (
        <div className={styles.panel}>
          <p className={styles.panelLabel}>Paste guest's offer SDP</p>
          <textarea
            className={styles.sdp}
            placeholder="Paste offer SDP…"
            value={offerInput}
            onChange={(e) => setOfferInput(e.target.value)}
          />
          <button
            className={styles.btn}
            disabled={!offerInput.trim() || loading}
            onClick={handleGenerateAnswer}
          >
            {loading ? 'Generating…' : 'Generate Answer'}
          </button>

          {pendingAnswer && (
            <>
              <p className={styles.panelLabel}>Send this answer to the guest</p>
              <textarea className={styles.sdp} readOnly value={pendingAnswer.sdp} />
              <div className={styles.row}>
                <button className={styles.btn} onClick={() => copy(pendingAnswer.sdp)}>
                  Copy Answer
                </button>
                <button
                  className={styles.btnAlt}
                  onClick={() => setPendingAnswer(null)}
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.row}>
        <button
          className={styles.btn}
          disabled={connectedIds.length < 1}
          onClick={onStartGame}
        >
          Start Game {connectedIds.length > 0 ? `(${connectedIds.length} player${connectedIds.length !== 1 ? 's' : ''})` : ''}
        </button>
        <button className={styles.btnAlt} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

// ── Guest lobby ────────────────────────────────────────────────────────────

function GuestLobby({
  status,
  offerSdp,
  error,
  guestName,
  setGuestName,
  onGenerateOffer,
  onFinalise,
  onBack,
}) {
  const [answerInput, setAnswerInput] = useState('');

  return (
    <div className={styles.lobby}>
      <h2 className={styles.title}>Join Game</h2>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {status === 'connected' ? (
        <p className={styles.sub}>Connected! Waiting for host to start the game…</p>
      ) : (
        <>
          {/* Name input */}
          <div className={styles.field}>
            <label className={styles.label}>Your name</label>
            <input
              className={styles.input}
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name…"
              disabled={status !== 'idle' && status !== 'failed'}
            />
          </div>

          {/* Step 1: generate offer */}
          {(status === 'idle' || status === 'failed') && (
            <button
              className={styles.btn}
              disabled={!guestName.trim()}
              onClick={onGenerateOffer}
            >
              Generate Offer
            </button>
          )}

          {status === 'generating' && <p className={styles.sub}>Gathering ICE candidates…</p>}

          {/* Step 2: show offer */}
          {(status === 'ready' || status === 'connected') && offerSdp && (
            <>
              <p className={styles.panelLabel}>Copy this offer and send it to the host</p>
              <textarea className={styles.sdp} readOnly value={offerSdp} />
              <button className={styles.btn} onClick={() => copy(offerSdp)}>
                Copy Offer
              </button>
            </>
          )}

          {/* Step 3: paste answer */}
          {status === 'ready' && (
            <>
              <p className={styles.panelLabel}>Paste the host's answer SDP</p>
              <textarea
                className={styles.sdp}
                placeholder="Paste answer SDP…"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
              />
              <button
                className={styles.btn}
                disabled={!answerInput.trim()}
                onClick={() => onFinalise(answerInput.trim())}
              >
                Connect
              </button>
            </>
          )}
        </>
      )}

      <button className={styles.btnAlt} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function Lobby({
  role,
  onSelectRole,
  // host props
  players,
  connectedIds,
  pendingAnswer,
  setPendingAnswer,
  onAcceptOffer,
  onStartGame,
  // guest props
  status,
  offerSdp,
  error,
  guestName,
  setGuestName,
  onGenerateOffer,
  onFinalise,
  // shared
  onBack,
}) {
  if (!role) return <RoleSelector onSelectRole={onSelectRole} />;

  if (role === 'host') {
    return (
      <HostLobby
        players={players || {}}
        connectedIds={connectedIds || []}
        pendingAnswer={pendingAnswer}
        setPendingAnswer={setPendingAnswer}
        onAcceptOffer={onAcceptOffer}
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );
  }

  return (
    <GuestLobby
      status={status || 'idle'}
      offerSdp={offerSdp || ''}
      error={error}
      guestName={guestName || ''}
      setGuestName={setGuestName}
      onGenerateOffer={onGenerateOffer}
      onFinalise={onFinalise}
      onBack={onBack}
    />
  );
}
