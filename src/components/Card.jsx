import styles from './Card.module.css';

const RED_SUITS = ['♥', '♦'];

export function Card({ card, onClick, disabled, highlight }) {
  const isRed = RED_SUITS.includes(card.suit);
  const classNames = [
    styles.card,
    isRed ? styles.red : styles.dark,
    highlight ? styles.highlight : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <span className={styles.corner}>{card.value}</span>
      <span className={styles.center}>{card.suit}</span>
    </button>
  );
}

export function CardBack({ className }) {
  return (
    <div className={`${styles.cardBack} ${className || ''}`}>
      <span className={styles.backPattern}>&#9760;</span>
    </div>
  );
}
