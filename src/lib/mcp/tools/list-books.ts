import { defineTool } from "@lovable.dev/mcp-js";
import { books } from "@/lib/bible-data";

export default defineTool({
  name: "list_books",
  title: "List Bible books",
  description: "List all 66 books of the Bible with their chapter counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = books.map((b) => ({ id: b.id, name: b.name, chapters: b.chapters }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { books: items },
    };
  },
});
