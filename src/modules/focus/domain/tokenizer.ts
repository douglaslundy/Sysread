export interface WordToken {
  end: number;
  index: number;
  start: number;
  text: string;
}
export interface WordBlock {
  end: number;
  start: number;
  text: string;
  tokens: WordToken[];
  wordIndex: number;
}

export function tokenizeText(text: string): WordToken[] {
  return Array.from(text.matchAll(/\S+/gu), (match, index) => ({
    end: (match.index ?? 0) + match[0].length,
    index,
    start: match.index ?? 0,
    text: match[0],
  }));
}

export function groupTokens(tokens: WordToken[], wordsPerBlock: 1 | 2 | 3): WordBlock[] {
  const blocks: WordBlock[] = [];
  for (let index = 0; index < tokens.length; index += wordsPerBlock) {
    const group = tokens.slice(index, index + wordsPerBlock);
    if (!group.length) continue;
    blocks.push({
      end: group[group.length - 1].end,
      start: group[0].start,
      text: group.map((token) => token.text).join(" "),
      tokens: group,
      wordIndex: group[0].index,
    });
  }
  return blocks;
}

export function wordIndexAtOffset(tokens: WordToken[], offset: number): number {
  if (!tokens.length) return 0;
  const found = tokens.find((token) => offset < token.end);
  return found?.index ?? tokens.length - 1;
}

export function offsetAtWordIndex(tokens: WordToken[], wordIndex: number): number {
  if (!tokens.length) return 0;
  return tokens[Math.min(Math.max(0, wordIndex), tokens.length - 1)].start;
}
