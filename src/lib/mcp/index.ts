import { defineMcp } from "@lovable.dev/mcp-js";
import getChapter from "./tools/get-chapter";
import listBooks from "./tools/list-books";
import listTranslations from "./tools/list-translations";

export default defineMcp({
  name: "lectio-mcp",
  title: "Lectio Bible Study",
  version: "0.1.0",
  instructions:
    "Tools for the Lectio Bible study app. Use list_translations and list_books to discover available options, then get_chapter to read full chapter text from any supported translation.",
  tools: [listTranslations, listBooks, getChapter],
});
