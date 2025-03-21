How It Works
readable.html
– Loads the custom CSS from reader.css
– On DOMContentLoaded, it retrieves the stored content from chrome.storage.local under the key "readableData".
– If data is found, it updates the document title (if provided) and injects the HTML into the <div id="readable-content">.

reader.css
– Provides a clean, readable layout with a comfortable max-width, appropriate fonts, line heights, and spacing for headings, paragraphs, links, blockquotes, images, code blocks, and lists.

You can add these two files to your extension’s directory and update your manifest.json (if not already updated) to expose these resources as web-accessible:

```
"web_accessible_resources": [
  {
    "resources": ["images/logo.webp", "readable.html", "reader.css"],
    "matches": ["<all_urls>"]
  }
]
```
These files will let you extract the main content using your Readability-based processing in the background script, store it under "readableData", and then view it in a clean, reader-friendly format.









Search