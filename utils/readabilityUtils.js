// utils/readabilityUtils.js
// This module encapsulates the Readability extraction logic.
export function extractReadableContent(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      if (typeof Readability === "undefined") {
        console.error("Readability library is not loaded.");
        return null;
      }
      const article = new Readability(doc).parse();
      if (article && article.content) {
        // Return wrapped HTML with reader.css link (we use a relative path that should be adjusted later)
        return `<html><head><meta charset="UTF-8"><link rel="stylesheet" type="text/css" href="../reader.css"></head><body>${article.content}</body></html>`;
      } else {
        return null;
      }
    } catch (e) {
      console.error("Readability extraction error:", e);
      return null;
    }
  }
  