import { createDeck, shuffle } from './deck.js';

// ── helpers ────────────────────────────────────────────────────────────────

function cardEq(a, b) {
  return a.suit === b.suit && a.value === b.value;
}

// Ensure there is at least one card in the draw pile.
// If empty, take the discard pile (except the top card), shuffle, and use as new deck.
function ensureDeck(state) {
  if (state.deck.length > 0) return state;
  const top = state.discard[state.discard.length - 1];
  const newDeck = shuffle(state.discard.slice(0, state.discard.length - 1));
  return { ...state, deck: newDeck, discard: [top] };
}

// ── exports ────────────────────────────────────────────────────────────────

export function initGame(playerIds) {
  let deck = shuffle(createDeck());

  // Deal 7 cards to each player
  const hands = {};
  for (const id of playerIds) {
    hands[id] = deck.splice(0, 7);
  }

  // Find first non-8 card for the discard pile
  let startIndex = deck.findIndex((c) => c.value !== '8');
  if (startIndex === -1) startIndex = 0; // fallback (extremely unlikely)
  const [startCard] = deck.splice(startIndex, 1);
  const discard = [startCard];

  return {
    deck,
    discard,
    hands,
    order: [...playerIds],
    turn: 0,
    suit: startCard.suit, // active suit (may differ from top card when 8 played)
    winner: null,
  };
}

export function topCard(state) {
  return state.discard[state.discard.length - 1];
}

export function currentPlayerId(state) {
  return state.order[state.turn % state.order.length];
}

export function canPlay(card, state) {
  if (card.value === '8') return true;
  const top = topCard(state);
  return card.suit === state.suit || card.value === top.value;
}

export function playCard(state, playerId, card, chosenSuit) {
  if (state.winner) return { err: 'Game is already over.' };
  if (currentPlayerId(state) !== playerId) return { err: 'Not your turn.' };
  if (!canPlay(card, state)) return { err: 'Illegal move.' };

  const hand = state.hands[playerId];
  const idx = hand.findIndex((c) => cardEq(c, card));
  if (idx === -1) return { err: 'Card not in hand.' };

  // Wild 8 requires a chosen suit
  if (card.value === '8' && !chosenSuit) return { err: 'Must choose a suit when playing an 8.' };

  const newHand = [...hand.slice(0, idx), ...hand.slice(idx + 1)];
  const newDiscard = [...state.discard, card];
  const newSuit = card.value === '8' ? chosenSuit : card.suit;

  const winner = newHand.length === 0 ? playerId : null;

  const nextTurn = winner
    ? state.turn
    : (state.turn + 1) % state.order.length;

  const newState = {
    ...state,
    discard: newDiscard,
    hands: { ...state.hands, [playerId]: newHand },
    suit: newSuit,
    turn: nextTurn,
    winner,
  };

  return { state: newState };
}

export function drawCard(state, playerId) {
  if (state.winner) return { err: 'Game is already over.' };
  if (currentPlayerId(state) !== playerId) return { err: 'Not your turn.' };

  const withDeck = ensureDeck(state);
  if (withDeck.deck.length === 0) return { err: 'No cards left to draw.' };

  const [drawn, ...restDeck] = withDeck.deck;
  const newHand = [...withDeck.hands[playerId], drawn];
  const nextTurn = (withDeck.turn + 1) % withDeck.order.length;

  const newState = {
    ...withDeck,
    deck: restDeck,
    hands: { ...withDeck.hands, [playerId]: newHand },
    turn: nextTurn,
  };

  return { state: newState, drawn };
}

export function publicView(state, names) {
  return {
    top: topCard(state),
    suit: state.suit,
    currentId: currentPlayerId(state),
    winner: state.winner,
    players: state.order.map((id) => ({
      id,
      name: (names && names[id]) || id,
      cards: state.hands[id]?.length ?? 0,
    })),
  };
}
