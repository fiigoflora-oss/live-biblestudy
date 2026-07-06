import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { books } from "@/lib/bible-data";

type BollsVerse = { pk?: number; verse: number; text: string };

export default defineTool({
  name: "get_chapter",
  title: "Get Bible chapter",
  description:
    "Fetch the full text of a Bible chapter from bolls.life for a given book name (e.g. 'John'), chapter number, and translation id (e.g. 'KJV', 'ESV', 'WEB').",
  inputSchema: {
    book: z.string().describe("Book name, e.g. 'Genesis', 'John', '1 Corinthians'."),
    chapter: z.number().int().min(1).describe("Chapter number (1-based)."),
    translation: z
      .string()
      .default("WEB")
      .describe("Translation id from list_translations. Defaults to WEB (public domain)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ book, chapter, translation }) => {
    const match = books.find(
      (b) => b.name.toLowerCase() === book.trim().toLowerCase(),
    );
    if (!match) {
      return {
        content: [{ type: "text", text: `Unknown book: ${book}` }],
        isError: true,
      };
    }
    if (chapter > match.chapters) {
      return {
        content: [
          { type: "text", text: `${match.name} only has ${match.chapters} chapters.` },
        ],
        isError: true,
      };
    }

    const code = translation.trim() === "NIV" ? "NIV2011" : translation.trim();
    const url = `https://bolls.life/get-text/${encodeURIComponent(code)}/${match.id}/${chapter}/`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return {
        content: [
          { type: "text", text: `Failed to fetch (${res.status}) from bolls.life for ${match.name} ${chapter} ${code}.` },
        ],
        isError: true,
      };
    }
    const verses = (await res.json()) as BollsVerse[];
    const text = verses
      .map((v) => `${v.verse}. ${v.text.replace(/<[^>]+>/g, "").trim()}`)
      .join("\n");
    return {
      content: [
        { type: "text", text: `${match.name} ${chapter} (${translation})\n\n${text}` },
      ],
      structuredContent: {
        book: match.name,
        chapter,
        translation,
        verses: verses.map((v) => ({ verse: v.verse, text: v.text.replace(/<[^>]+>/g, "").trim() })),
      },
    };
  },
});
