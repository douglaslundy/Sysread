import { describe, expect, it } from "vitest";
import {
  contentOnlyChapters,
  stripExcludedMatter,
} from "../src/modules/imports/domain/content-only";

describe("content-only imports", () => {
  it("removes navigation, glossary and bibliographic chapters", () => {
    const result = contentOnlyChapters([
      { title: "Sumário", text: "Capítulo 1\n\nCapítulo 2" },
      { title: "Capítulo 1", text: "O conteúdo principal permanece." },
      { title: "Glossário", text: "Termos auxiliares" },
      { title: "Referências bibliográficas", text: "Obras consultadas" },
    ]);

    expect(result).toEqual([
      { title: "Capítulo 1", text: "O conteúdo principal permanece." },
    ]);
  });

  it("cuts inline contents and trailing references from a single extracted chapter", () => {
    const text = stripExcludedMatter(
      "Sumário\n\nCapítulo 1 ........ 3\n\nCapítulo 1\n\nTexto útil.\n\nBibliografia\n\nLivro consultado.",
    );
    expect(text).toBe("Capítulo 1\n\nTexto útil.");
  });
});
