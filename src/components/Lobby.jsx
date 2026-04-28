import { useState } from 'react';
import styles from './Lobby.module.css';

export function Lobby({ status, error, offerSdp, answerSdp, onHost, onJoin, onFinalise }) {
  const [pastedOffer, setPastedOffer] = useState('');
  const [pastedAnswer, setPastedAnswer] = useState('');
  const [mode, setMode] = useState(null);

  function copy(text) { navigator.clipboard.writeText(text).catch(() => {}); }

  if (error) {
    return (
      <div className={styles.lobby}>
        <p className={styles.errorMsg}>{error}</p>
        <button className={styles.btn} onClick={() => window.location.reload()}>Start over</button>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className={styles.lobby}>
        <h1 className={styles.title}>WebRTC Tic-Tac-Toe</h1>
        <p className={styles.sub}>Peer-to-peer · no server · native WebRTC</p>
        <div className={styles.row}>
          <button className={styles.btn} onClick={() => { setMode('host'); onHost(); }}>Host a game</button>
          <button className={styles.btnAlt} onClick={() => setMode('join')}>Join a game</button>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    if (!offerSdp) return <div className={styles.lobby}><p className={styles.wait}>Generating offer (gathering ICE candidates…)</p></div>;

    return (
      <div className={styles.lobby}>
        <h2>Step 1 — Copy this offer and send it to your opponent</h2>
        <textarea className={styles.sdp} readOnly value={offerSdp} />
        <button className={styles.btn} onClick={() => copy(offerSdp)}>Copy offer</button>

        <h2>Step 2 — Paste their answer here, then connect</h2>
        <textarea
          className={styles.sdp}
          placeholder="Paste answer SDP…"
          value={pastedAnswer}
          onChange={(e) => setPastedAnswer(e.target.value)}
        />
        <button className={styles.btn} disabled={!pastedAnswer.trim()} onClick={() => onFinalise(pastedAnswer.trim())}>
          {status === 'connecting' ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    );
  }

  if (mode === 'join') {
    if (!answerSdp) {
      return (
        <div className={styles.lobby}>
          <h2>Paste the host's offer SDP</h2>
          <textarea
            className={styles.sdp}
            placeholder="Paste offer SDP…"
            value={pastedOffer}
            onChange={(e) => setPastedOffer(e.target.value)}
          />
          <button className={styles.btn} disabled={!pastedOffer.trim()} onClick={() => onJoin(pastedOffer.trim())}>
            Generate answer
          </button>
        </div>
      );
    }

    return (
      <div className={styles.lobby}>
        <h2>Copy this answer and send it back to the host</h2>
        <textarea className={styles.sdp} readOnly value={answerSdp} />
        <button className={styles.btn} onClick={() => copy(answerSdp)}>Copy answer</button>
        <p className={styles.wait}>Waiting for host to connect…</p>
      </div>
    );
  }

  return null;
}
