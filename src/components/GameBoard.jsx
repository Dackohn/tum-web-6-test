import { useState } from 'react';
import { canPlay } from '../game/crazyEights.js';
import { Card, CardBack } from './Card.jsx';
import styles from './GameBoard.module.css';

const SUITS = ['♥', '♦', '♣', '♠'];

export function GameBoard({
  isHost,
  myId,
  myHand,
  publicState,
  gameOver,
  onPlayCard,
  onDrawCard,
  onQuit,
}) {
  const [suitChooser, setSuitChooser] = useState(null); // card awaiting suit choice | null

  if (!publicState) {
    return (
      <div className={styles.board}>
        <p className={styles.waiting}>Waiting for game to start…</p>
      </div>
    );
  }

  const { top, suit, currentId, winner, players } = publicState;
  const isMyTurn = !isHost && currentId === myId;

  function canPlayCard(card) {
    return canPlay(card, { suit, discard: [top] });
  }

  function handleCardClick(card) {
    if (!isMyTurn) return;
    if (card.value === '8') {
      setSuitChooser(card);
    } else {
      onPlayCard(card, null);
    }
  }

  function handleSuitChoice(chosenSuit) {
    if (suitChooser) {
      onPlayCard(suitChooser, chosenSuit);
      setSuitChooser(null);
    }
  }

  const suitColor = (s) => (s === '♥' || s === '♦' ? styles.redSuit : styles.darkSuit);

  return (
    <div className={styles.board}>
      {/* Top bar: players */}
      <div className={styles.topBar}>
        {players.map((p) => (
          <div
            key={p.id}
            className={`${styles.playerChip} ${p.id === currentId ? styles.activePlayer : ''}`}
          >
            <span className={styles.playerName}>{p.name}</span>
            <span className={styles.cardCount}>{p.cards} cards</span>
          </div>
        ))}
      </div>

      {/* Center: discard + deck + suit */}
      <div className={styles.center}>
        <div className={styles.pileArea}>
          {top ? (
            <div className={styles.pileLabel}>
              <span className={styles.pileLabelText}>Discard</span>
              <Card card={top} disabled />
            </div>
          ) : null}

          <div className={styles.pileLabel}>
            <span className={styles.pileLabelText}>Deck</span>
            <CardBack />
          </div>
        </div>

        <div className={styles.suitDisplay}>
          <span className={styles.suitLabel}>Active suit</span>
          <span className={`${styles.suitSymbol} ${suitColor(suit)}`}>{suit}</span>
        </div>
      </div>

      {/* Host spectator banner */}
      {isHost && (
        <div className={styles.spectatorBanner}>Spectating — you are the dealer</div>
      )}

      {/* Player hand */}
      {!isHost && (
        <div className={styles.handSection}>
          <span className={styles.handLabel}>Your Hand</span>
          <div className={styles.hand}>
            {(myHand || []).map((card, i) => (
              <Card
                key={`${card.suit}-${card.value}-${i}`}
                card={card}
                onClick={() => handleCardClick(card)}
                disabled={!isMyTurn || !canPlayCard(card)}
                highlight={isMyTurn && canPlayCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {!isHost && (
        <div className={styles.controls}>
          <button
            className={styles.btnDraw}
            onClick={onDrawCard}
            disabled={!isMyTurn}
          >
            Draw Card
          </button>
          <button className={styles.btnQuit} onClick={onQuit}>
            Quit
          </button>
        </div>
      )}
      {isHost && (
        <div className={styles.controls}>
          <button className={styles.btnQuit} onClick={onQuit}>
            Quit
          </button>
        </div>
      )}

      {/* Suit chooser modal */}
      {suitChooser && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Choose a suit</h2>
            <div className={styles.suitGrid}>
              {SUITS.map((s) => (
                <button
                  key={s}
                  className={`${styles.suitBtn} ${suitColor(s)}`}
                  onClick={() => handleSuitChoice(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {(winner || gameOver) && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {winner === myId && !isHost
                ? 'You win!'
                : winner
                ? `${players.find((p) => p.id === winner)?.name ?? winner} wins!`
                : 'Game Over'}
            </h2>
            <button className={styles.btnPrimary} onClick={onQuit}>
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
