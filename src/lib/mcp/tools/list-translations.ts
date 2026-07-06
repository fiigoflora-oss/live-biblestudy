import { defineTool } from "@lovable.dev/mcp-js";

const TRANSLATIONS = [
  { id: "KJV", name: "King James Version", lang: "en" },
  { id: "ESV", name: "English Standard Version", lang: "en" },
  { id: "NIV", name: "New International Version", lang: "en" },
  { id: "NASB", name: "New American Standard Bible", lang: "en" },
  { id: "NKJV", name: "New King James Version", lang: "en" },
  { id: "WEB", name: "World English Bible", lang: "en" },
  { id: "YLT", name: "Young's Literal Translation", lang: "en" },
  { id: "ASV", name: "American Standard Version", lang: "en" },
  { id: "AMH", name: "Amharic Haile Selassie 1962", lang: "am" },
];

export default defineTool({
  name: "list_translations",
  title: "List Bible translations",
  description: "List the Bible translations available in Lectio (id, name, language).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(TRANSLATIONS, null, 2) }],
    structuredContent: { translations: TRANSLATIONS },
  }),
});
