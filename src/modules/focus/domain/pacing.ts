import type { WordBlock } from "./tokenizer";

export interface OrpParts {
  after: string;
  before: string;
  pivot: string;
  pivotIndex: number;
}

function coreBounds(word: string) {
  const leading = word.match(/^[^\p{L}\p{N}]*/u)?.[0].length ?? 0;
  const trailing = word.match(/[^\p{L}\p{N}]*$/u)?.[0].length ?? 0;
  return { leading, length: Math.max(1, word.length - leading - trailing) };
}

export function orpIndex(word: string): number {
  const { leading, length } = coreBounds(word);
  const ratio = length <= 1 ? 0 : length <= 5 ? 0.35 : length <= 9 ? 0.4 : 0.45;
  return Math.min(word.length - 1, leading + Math.floor((length - 1) * ratio));
}

export function blockOrp(block: WordBlock): OrpParts {
  if (block.tokens.length === 2 || block.tokens.length === 3) {
    const characterCount = block.tokens.reduce((total, token) => total + token.text.length, 0);
    if (characterCount % 2 === 0) {
      let remaining = characterCount / 2;
      let boundaryIndex = 0;
      for (const [tokenIndex, token] of block.tokens.entries()) {
        if (remaining <= token.text.length) {
          boundaryIndex += remaining;
          break;
        }
        remaining -= token.text.length;
        boundaryIndex += token.text.length + (tokenIndex < block.tokens.length - 1 ? 1 : 0);
      }
      return {
        after: block.text.slice(boundaryIndex),
        before: block.text.slice(0, boundaryIndex),
        pivot: "",
        pivotIndex: boundaryIndex,
      };
    }
    const centerOrdinal = Math.floor(characterCount / 2);
    let blockIndex = 0;
    let consumed = 0;
    for (const [tokenIndex, token] of block.tokens.entries()) {
      if (centerOrdinal < consumed + token.text.length) {
        blockIndex += centerOrdinal - consumed;
        break;
      }
      consumed += token.text.length;
      blockIndex += token.text.length + (tokenIndex < block.tokens.length - 1 ? 1 : 0);
    }
    return {
      after: block.text.slice(blockIndex + 1),
      before: block.text.slice(0, blockIndex),
      pivot: block.text[blockIndex] ?? "",
      pivotIndex: blockIndex,
    };
  }

  const anchorToken = block.tokens[Math.floor((block.tokens.length - 1) / 2)];
  const prefix = block.tokens
    .slice(0, block.tokens.indexOf(anchorToken))
    .map((token) => token.text)
    .join(" ");
  const localPivot = orpIndex(anchorToken.text);
  const pivotIndex = (prefix ? prefix.length + 1 : 0) + localPivot;
  return {
    after: block.text.slice(pivotIndex + 1),
    before: block.text.slice(0, pivotIndex),
    pivot: block.text[pivotIndex] ?? "",
    pivotIndex,
  };
}

export function blockDurationMs(block: WordBlock, requestedWpm: number): number {
  const wpm = Math.min(1000, Math.max(100, requestedWpm));
  const base = (60_000 / wpm) * block.tokens.length;
  const last = block.tokens[block.tokens.length - 1]?.text ?? "";
  const sentencePause = /[.!?][\])}"'\u2019\u201d]*$/u.test(last) ? 1.6 : /[,;:][\])}"'\u2019\u201d]*$/u.test(last) ? 1.25 : 1;
  const longest = Math.max(0, ...block.tokens.map((token) => coreBounds(token.text).length));
  const lengthFactor = longest >= 12 ? 1.18 : longest >= 8 ? 1.08 : 1;
  const unusual = block.tokens.some((token) => /(?=.*\p{L})(?=.*\p{N})/u.test(token.text)) ? 1.12 : 1;
  return Math.round(base * sentencePause * lengthFactor * unusual);
}
