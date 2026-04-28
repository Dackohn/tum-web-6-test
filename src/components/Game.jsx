import { useCallback, useEffect, useState } from 'react';
import styles from './Game.module.css';

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diags
];

function checkWinner(board) {
  for (const [a,b,c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw' };
  return null;
}

export function Game({ role, send, lastMessage, onDisconnect }) {
  // role: 'host' => X, 'join' => O
  const myMark = role === 'host' ? 'X' : 'O';
  const opponentMark = role === 'host' ? 'O' : 'X';

  const [board, setBoard] = useState(Array(9).fill(null));
  const [myTurn, setMyTurn] = useState(role === 'host'); // host goes first
  const [result, setResult] = useState(null); // null | { winner, line }
  const [opponentReady, setOpponentReady] = useState(false);

  // Send a ready ping on mount
  useEffect(() => {
    send({ type: 'ready' });
  }, [send]);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage;

    if (msg.type === 'ready') {
      setOpponentReady(true);
    }

    if (msg.type === 'move') {
      setBoard((prev) => {
        const next = [...prev];
        next[msg.index] = opponentMark;
        const res = checkWinner(next);
        if (res) setResult(res);
        return next;
      });
      setMyTurn(true);
    }

    if (msg.type === 'restart') {
      setBoard(Array(9).fill(null));
      setResult(null);
      setMyTurn(role === 'host');
    }
  }, [lastMessage, opponentMark, role]);

  const handleCell = useCallback((i) => {
    if (!myTurn || board[i] || result || !opponentReady) return;
    const next = [...board];
    next[i] = myMark;
    setBoard(next);
    send({ type: 'move', index: i });
    const res = checkWinner(next);
    if (res) setResult(res);
    else setMyTurn(false);
  }, [myTurn, board, result, opponentReady, myMark, send]);

  const restart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setResult(null);
    setMyTurn(role === 'host');
    send({ type: 'restart' });
  }, [role, send]);

  const winLine = result?.line ?? [];

  function statusText() {
    if (!opponentReady) return 'Waiting for opponent…';
    if (result) {
      if (result.winner === 'draw') return "It's a draw!";
      return result.winner === myMark ? 'You win! 🎉' : 'You lose.';
    }
    return myTurn ? 'Your turn' : "Opponent's turn…";
  }

  return (
    <div className={styles.game}>
      <div className={styles.header}>
        <span className={styles.mark}>You are <strong>{myMark}</strong></span>
        <span className={styles.status}>{statusText()}</span>
        <button className={styles.quit} onClick={onDisconnect}>Quit</button>
      </div>

      <div className={styles.board}>
        {board.map((cell, i) => (
          <button
            key={i}
            className={`${styles.cell} ${winLine.includes(i) ? styles.win : ''} ${cell === 'X' ? styles.x : cell === 'O' ? styles.o : ''}`}
            onClick={() => handleCell(i)}
            disabled={!!cell || !myTurn || !!result || !opponentReady}
          >
            {cell}
          </button>
        ))}
      </div>

      {result && (
        <button className={styles.restart} onClick={restart}>Play again</button>
      )}
    </div>
  );
}
