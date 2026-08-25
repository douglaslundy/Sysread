export interface ImportedChapter {
  text: string;
  title: string;
}

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .replace(/[^a-z0-9 ]/giu, " ")
  .replace(/\s+/gu, " ")
  .trim()
  .toLowerCase();

const excludedHeading = /^(?:table of contents|contents|sumario|indice|menu|navigation|glossary|glossario|bibliography|bibliografia|bibliographic references|referencias bibliograficas|references|works cited|index|subject index)$/u;
const trailingHeading = /^(?:glossary|glossario|bibliography|bibliografia|bibliographic references|referencias bibliograficas|references|works cited|index|subject index)$/u;
const bodyStartHeading = /^(?:chapter|capitulo|part|parte|introduction|introducao|preface|prefacio)\b/u;

export function isExcludedMatterTitle(title: string) {
  return excludedHeading.test(normalize(title));
}

export function stripExcludedMatter(text: string) {
  const blocks = text.split(/\n\s*\n/gu).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) return "";

  const trailingStart = blocks.findIndex((block, index) =>
    index > 0 && trailingHeading.test(normalize(block)),
  );
  const withoutTrailing = trailingStart >= 0 ? blocks.slice(0, trailingStart) : blocks;

  const navigationStart = withoutTrailing.findIndex((block, index) =>
    index < 20 && /^(?:table of contents|contents|sumario|indice|menu|navigation)$/u.test(normalize(block)),
  );
  if (navigationStart >= 0) {
    const contentStart = withoutTrailing.findIndex((block, index) =>
      index > navigationStart &&
      bodyStartHeading.test(normalize(block)) &&
      !/\.{2,}\s*\d*$/u.test(block),
    );
    if (contentStart >= 0) return withoutTrailing.slice(contentStart).join("\n\n").trim();
  }

  return withoutTrailing
    .filter((block) => !/^(?:table of contents|contents|sumario|indice|menu|navigation)$/u.test(normalize(block)))
    .join("\n\n")
    .trim();
}

export function contentOnlyChapters(chapters: ImportedChapter[]) {
  const filtered = chapters
    .filter((chapter) => !isExcludedMatterTitle(chapter.title))
    .map((chapter) => ({ ...chapter, text: stripExcludedMatter(chapter.text) }))
    .filter((chapter) => chapter.text.length > 0);

  return filtered.length > 0 ? filtered : chapters;
}
