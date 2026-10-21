import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "../i18n";
import {
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  beginVote,
  castVote,
  categoriesFor,
  createRound,
  guessWord,
  hide,
  ready,
  revealedWord,
  startSession,
  visibleCard,
  type Session,
} from "./liar-onephone";

function passLooks(session: Session): Session {
  let current = session;
  for (let seat = 0; seat < current.round.playerCount; seat++) {
    expect(current.phase).toBe("cover");
    expect(visibleCard(current)).toBe("hidden");
    expect(revealedWord(current)).toBeNull();
    current = ready(current);
    expect(current.phase).toBe("peek");
    if (current.round.liars.includes(seat)) {
      if (current.round.mode === "decoy") {
        expect(visibleCard(current)).toBe("word");
        expect(revealedWord(current)).toBe(current.round.decoy);
        expect(revealedWord(current)).not.toBe(current.round.word);
      } else {
        expect(visibleCard(current)).toBe("category");
        expect(revealedWord(current)).toBeNull();
      }
    } else {
      expect(visibleCard(current)).toBe("word");
      expect(revealedWord(current)).toBe(current.round.word);
    }
    current = hide(current);
  }
  return current;
}

describe("one-phone liar", () => {
  it("rejects a table outside three to ten and keeps words unique", () => {
    expect(() => createRound(1, 2, "ko")).toThrow(/player count/);
    expect(() => createRound(1, 11, "en")).toThrow(/player count/);
    for (const locale of locales) {
      for (const category of categoriesFor(locale)) {
        expect(new Set(category.words).size).toBe(category.words.length);
        expect(category.words).not.toContain(category.label);
      }
      const round = createRound(7, MIN_PLAYERS, locale);
      expect(round.playerCount).toBe(MIN_PLAYERS);
      expect(new Set(round.choices).size).toBe(round.choices.length);
      expect(round.choices).toContain(round.word);
      expect(createRound(7, MAX_PLAYERS, locale)).toEqual(createRound(7, MAX_PLAYERS, locale));
    }
  });

  it("hides the word until that seat asks to look", () => {
    const session = passLooks(startSession(createRound(11, 5, "ko")));
    expect(session.phase).toBe("discuss");
    expect(revealedWord(session)).toBeNull();
  });

  it("lets the liar win a missed vote and lose a wrong guess", () => {
    const round = createRound(21, 4, "en");
    let session = passLooks(startSession(round));
    session = beginVote(session);
    const other = (round.liar + 1) % round.playerCount;
    for (let seat = 0; seat < round.playerCount; seat++) {
      expect(session.phase).toBe("voteCover");
      expect(revealedWord(session)).toBeNull();
      session = ready(session);
      session = castVote(session, other);
    }
    expect(session.phase).toBe("result");
    expect(session.winner).toBe("liar");

    let caught = passLooks(startSession(round));
    caught = beginVote(caught);
    for (let seat = 0; seat < round.playerCount; seat++) {
      caught = ready(caught);
      caught = castVote(caught, round.liar);
    }
    expect(caught.phase).toBe("guess");
    expect(revealedWord(caught)).toBeNull();
    const wrong = round.choices.find((word) => word !== round.word) as string;
    const missed = guessWord(caught, wrong);
    expect(missed.winner).toBe("group");
    expect(revealedWord(missed)).toBe(round.word);
    const escaped = guessWord(caught, round.word);
    expect(escaped.winner).toBe("liar");
  });

  it("deals two liars, a second word, or a silent vote", () => {
    const pair = createRound(4, 5, "ko", "pair");
    expect(pair.mode).toBe("pair");
    expect(pair.liars).toHaveLength(2);
    expect(new Set(pair.liars).size).toBe(2);
    expect(pair.liars).toContain(pair.liar);
    expect(passLooks(startSession(pair)).phase).toBe("discuss");
    const caught = pair.liars[1];
    let session = beginVote(passLooks(startSession(pair)));
    for (let seat = 0; seat < pair.playerCount; seat++) {
      session = ready(session);
      session = castVote(session, caught);
    }
    expect(session.phase).toBe("guess");
    expect(revealedWord(session)).toBeNull();

    const decoy = createRound(4, 5, "ko", "decoy");
    expect(decoy.decoy).toBeTruthy();
    expect(decoy.decoy).not.toBe(decoy.word);
    expect(decoy.choices).toContain(decoy.decoy);
    expect(decoy.liars).toEqual([decoy.liar]);
    const seen = passLooks(startSession(decoy));
    expect(seen.phase).toBe("discuss");
    expect(revealedWord(seen)).toBeNull();

    const silent = passLooks(startSession(createRound(4, 5, "ko", "silent")));
    expect(silent.phase).toBe("voteCover");
    expect(visibleCard(silent)).toBe("hidden");
    expect(revealedWord(silent)).toBeNull();
    expect(createRound(4, 5, "ko").mode).toBe("classic");
    expect(createRound(4, 5, "ko").decoy).toBeNull();
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/liar-onephone.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="liar-onephone"');
    expect(catalog).toContain('slug: "liar-onephone"');
    expect(GAME_ID).toBe("liar-onephone");
    const source = readFileSync("src/lib/games/liar-onephone.ts", "utf8") + readFileSync("src/components/games/LiarOnePhone.tsx", "utf8");
    expect(source).not.toMatch(/among us|spyfall|마피아/i);
  });
});
