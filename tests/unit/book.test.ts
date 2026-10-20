import { describe, expect, it } from 'vitest';
import { BookMismatch, hydrate, toPublished } from '../../src/engine/book';
import { Rng } from '../../src/engine/rng';
import { playRound } from '../../src/engine/round';

describe('published books', () => {
  it('round-trip: a published book rebuilds to exactly the same round', () => {
    for (const mode of ['base', 'ante', 'buyMatinee', 'buyLightsOut'] as const) {
      for (let i = 1; i <= 60; i++) {
        const book = playRound(new Rng(i * 31 + mode.length), mode);
        const pub = JSON.parse(JSON.stringify(toPublished(book, i)));
        const h = hydrate(pub.events, pub.payoutMultiplier);
        expect(h.payout).toBe(Math.round(book.payout * 100) / 100);
        expect(h.capped).toBe(book.capped);
        const acts = (es: typeof book.events) => es.filter((e) => e.type === 'act').map((e) => e.type === 'act' && [e.actWin, e.ink.flat().join(), e.rays.length]);
        expect(acts(h.events)).toEqual(acts(book.events));
      }
    }
  });

  it('rejects a book whose payout was changed', () => {
    let pub = toPublished(playRound(new Rng(1), 'base'), 1);
    for (let s = 2; pub.payoutMultiplier === 0; s++) pub = toPublished(playRound(new Rng(s), 'base'), 1);
    expect(() => hydrate(pub.events, pub.payoutMultiplier + 1)).toThrow(BookMismatch);
  });

  it('rejects a book whose board was changed', () => {
    let pub = toPublished(playRound(new Rng(1), 'base'), 1);
    for (let s = 2; pub.payoutMultiplier === 0; s++) pub = toPublished(playRound(new Rng(s), 'base'), 1);
    const reveal = pub.events.find((e) => e.type === 'reveal');
    if (reveal?.type === 'reveal') reveal.board = reveal.board.map((reel) => reel.map(() => 'L5'));
    expect(() => hydrate(pub.events, pub.payoutMultiplier)).toThrow(BookMismatch);
  });
});
