// content_fetcher.js
// Contains URL discovery, fetching, and readability processing functions.

export function normalizeUrl(url) {
    try {
      let urlObj = new URL(url);
      urlObj.hash = "";
      return urlObj.toString();
    } catch (e) {
      console.error("Error normalizing URL", url, e);
      return url;
    }
  }
  
  export function shouldSkipUrl(url) {
    try {
      let path = new URL(url).pathname.toLowerCase();
      const disallowed = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".zip", ".json", ".xml", ".woff", ".woff2", ".ttf"];
      return disallowed.some(ext => path.endsWith(ext));
    } catch (e) {
      console.error("Error in shouldSkipUrl", url, e);
      return false;
    }
  }
  
  export function getRelativePath(url) {
    let urlObj = new URL(url);
    let path = urlObj.pathname;
    if (path.endsWith("/")) { path += "index.html"; }
    if (path === "" || path === "/") { path = "index.html"; }
    else if (!/\.[a-z0-9]+$/i.test(path)) { path += ".html"; }
    if (path.startsWith("/")) { path = path.substring(1); }
    return path;
  }
  
  export async function getRenderedHTML(url) {
    return new Promise(async (resolve, reject) => {
      if (url === window.location.href) {
        // If the panel is on the current page, remove it from the clone.
        if (document.getElementById("my-extension-panel")) {
          try {
            let clone = document.documentElement.cloneNode(true);
            let panel = clone.querySelector("#my-extension-panel");
            if (panel) { panel.remove(); }
            resolve(clone.outerHTML);
          } catch (e) {
            reject(e);
          }
        } else {
          resolve(document.documentElement.outerHTML);
        }
        return;
      }
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === window.location.origin) {
          let iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            try {
              let html = iframe.contentDocument.documentElement.outerHTML;
              document.body.removeChild(iframe);
              resolve(html);
            } catch (e) {
              document.body.removeChild(iframe);
              reject(e);
            }
          };
          setTimeout(() => {
            if (iframe.parentNode) { document.body.removeChild(iframe); }
            reject(new Error("Iframe load timeout"));
          }, 15000);
        } else {
          const res = await fetch(url);
          const html = await res.text();
          resolve(html);
        }
      } catch (e) { reject(e); }
    });
  }
  
  export async function discoverPages(startUrl, depth) {
    // Returns an array of discovered URLs.
    const discoveredPages = [];
    const visited = new Set();
    async function helper(url, d) {
      url = normalizeUrl(url);
      if (visited.has(url) || shouldSkipUrl(url)) return;
      visited.add(url);
      discoveredPages.push(url);
      if (d <= 0) return;
      try {
        let html = "";
        try {
          html = await getRenderedHTML(url);
        } catch (err) {
          const res = await fetch(url);
          html = await res.text();
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const anchors = doc.querySelectorAll("a[href]");
        for (const a of anchors) {
          const href = a.getAttribute("href");
          if (!href) continue;
          const linkUrl = normalizeUrl(new URL(href, url).toString());
          if (new URL(linkUrl).hostname === new URL(startUrl).hostname && !shouldSkipUrl(linkUrl)) {
            await helper(linkUrl, d - 1);
          }
        }
        // Also use a regex fallback
        const regex = /href=["']([^"']+)["']/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
          try {
            const linkUrl = normalizeUrl(new URL(match[1], url).toString());
            if (new URL(linkUrl).hostname === new URL(startUrl).hostname && !shouldSkipUrl(linkUrl)) {
              await helper(linkUrl, d - 1);
            }
          } catch (e) { /* ignore invalid URLs */ }
        }
      } catch (e) {
        console.error("Error during discovery for", url, e);
      }
    }
    await helper(startUrl, depth);
    return discoveredPages;
  }
  
  export async function runInPool(tasks, poolLimit) {
    let i = 0;
    const results = [];
    const executing = [];
    const enqueue = async () => {
      if (i === tasks.length) return Promise.resolve();
      const task = tasks[i++];
      const p = task();
      results.push(p);
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      let r = Promise.resolve();
      if (executing.length >= poolLimit) { r = Promise.race(executing); }
      await r;
      return enqueue();
    };
    await enqueue();
    return Promise.all(results);
  }
  
  export async function downloadPages(makeReadable, discoveredPages, updateStatusCallback) {
    // Downloads pages from the discovered URLs and applies Readability if enabled.
    const downloadedFiles = {};
    const tasks = discoveredPages.map((url, index) => async () => {
      updateStatusCallback(`Fetching (${index + 1}/${discoveredPages.length}): ${url}`);
      try {
        let html = "";
        try {
          html = await getRenderedHTML(url);
        } catch (err) {
          const response = await fetch(url);
          html = await response.text();
        }
        if (makeReadable) {
          try {
            if (typeof Readability === "undefined") {
              updateStatusCallback("Readability library not loaded");
            } else {
              updateStatusCallback("Processing with Readability...");
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const article = new Readability(doc).parse();
              if (article && article.content) {
                html = `<html><head><meta charset="UTF-8"><link rel="stylesheet" type="text/css" href="../reader.css"></head><body>${article.content}</body></html>`;
              }
            }
          } catch (e) {
            console.error("Readability extraction error:", e);
          }
        }
        const relativePath = getRelativePath(url);
        downloadedFiles[relativePath] = html;
      } catch (e) {
        updateStatusCallback(`Error fetching ${url}`);
        console.error(e);
      }
    });
    const poolLimit = 5;
    await runInPool(tasks, poolLimit);
    return downloadedFiles;
  }
  