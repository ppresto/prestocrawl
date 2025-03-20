(function(){
  // If the panel is already injected, do not inject it again.
  if (document.getElementById("my-extension-panel")) return;

  // Create the panel container with an easy-on-the-eyes font.
  const container = document.createElement("div");
  container.id = "my-extension-panel";
  container.style.position = "fixed";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.width = "420px";
  container.style.height = "600px";
  container.style.backgroundColor = "white";
  container.style.border = "2px solid #FF69B4"; // pink border
  container.style.borderRadius = "15px";
  container.style.zIndex = "999999";
  container.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  container.style.overflow = "hidden";
  container.style.fontFamily = "'Segoe UI', sans-serif";

  // Build the inner layout:
  // 1. Header (logo using external image) with an overlayed close button.
  // 2. Input fields for URL and link depth (on the same line when possible)
  // 3. A dedicated one‑line status field (blue background, white text, curved)
  // 4. An output field for discovered URLs (no wrapping, scrollable) with a Copy button
  // 5. A start button at the bottom
  container.innerHTML = `
    <div id="panel-content" style="display: flex; flex-direction: column; height: 100%;">
      <!-- Header: Logo with external image, full width -->
      <div id="header" style="position: relative; padding: 0; margin: 0; flex: 0 0 auto;">
          <img id="logoImg" src="${chrome.runtime.getURL("images/logo.webp")}" alt="PrestoCrawl Logo" style="display: block; width: 100%; height: auto; border-top-left-radius: 15px; border-top-right-radius: 15px;" />
          <!-- Close Button overlaid on top-right of logo -->
          <div id="closeButton" style="
            position: absolute;
            top: 5px;
            right: 5px;
            background: transparent;
            color: pink;
            font-weight: bold;
            font-size: 20px;
            cursor: pointer;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ×
          </div>
      </div>
      <!-- Input fields -->
      <div id="inputs" style="padding: 15px; flex: 0 0 auto; display: flex; gap: 10px; align-items: flex-start;">
        <div style="flex: 1;">
          <label for="url" style="color: blue; display: block; margin-bottom: 5px;">URL</label>
          <input type="text" id="url" style="width: 100%; padding: 8px; border: 1px solid blue; border-radius: 5px; background: white; color: black;" />
        </div>
        <div style="flex: 0 0 auto; display: flex; flex-direction: column; justify-content: flex-start;">
          <label for="depth" style="color: blue; margin-bottom: 5px;">Link depth</label>
          <select id="depth" style="width: auto; padding: 8px; border: 1px solid blue; border-radius: 5px; background: white; color: black;">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
      </div>
      <!-- Status Field -->
      <div id="statusField" style="margin: 0 15px 10px 15px; padding: 5px 10px; border: 2px solid blue; border-radius: 5px; background-color: blue; color: white; font-weight: bold; white-space: nowrap; flex: 0 0 auto;">
        Status: Idle
      </div>
      <!-- Log Output Field for discovered URLs -->
      <div id="logOutput" style="margin: 0 15px 10px 15px; padding: 15px; flex: 1 1 auto; overflow-y: auto; overflow-x: auto; border: 1px solid blue; border-radius: 5px; background: white; color: black; white-space: nowrap; position: relative;">
        <!-- Discovered URLs will be listed here -->
      </div>
      <!-- Start Button -->
      <div id="startButtonContainer" style="padding: 15px; flex: 0 0 auto; text-align: center;">
        <button id="downloadBtn" style="width: 33%; padding: 10px; background-color: #FF69B4; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1em;">Start</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Set default URL in the input field.
  document.getElementById("url").value = window.location.href;

  // Event listener for close button.
  const closeButton = document.getElementById("closeButton");
  closeButton.addEventListener("click", () => {
    const panel = document.getElementById("my-extension-panel");
    if (panel) {
      panel.remove();
    }
  });

  // Internal storage for discovered URLs.
  let discoveredLog = [];
  const MAX_LOG_LINES = 2000;
  const DISPLAY_LOG_LINES = 10;

  // Function to update the status field.
  function updateStatusField(text) {
    document.getElementById("statusField").innerText = "Status: " + text;
  }

  // Create a Copy button for the logOutput field with updated styles.
  const logOutputContainer = document.getElementById("logOutput");
  const copyButton = document.createElement("button");
  // Use a copy emoji (📋) as an icon before the text.
  copyButton.innerHTML = "📋 Copy";
  copyButton.style.color = "gray";
  copyButton.style.position = "absolute";
  copyButton.style.top = "5px";
  copyButton.style.right = "5px";
  copyButton.style.padding = "5px 10px";
  copyButton.style.fontSize = "0.8em";
  copyButton.style.border = "none";
  copyButton.style.borderRadius = "5px";
  copyButton.style.background = "transparent"; // light gray background
  copyButton.style.color = "#333";
  copyButton.style.cursor = "pointer";
  copyButton.addEventListener("click", () => {
    // Copy only the discovered URLs (without the copy button).
    navigator.clipboard.writeText(discoveredLog.join("\n"))
      .then(() => updateStatusField("Copied URLs to clipboard"))
      .catch(err => updateStatusField("Copy error: " + err.message));
  });
  logOutputContainer.appendChild(copyButton);

  // Function to append a new discovered URL.
  function appendLog(message) {
    discoveredLog.push(message);
    if (discoveredLog.length > MAX_LOG_LINES) {
      discoveredLog = discoveredLog.slice(-MAX_LOG_LINES);
    }
    const displayMessages = discoveredLog.slice(-DISPLAY_LOG_LINES);
    const logOutput = document.getElementById("logOutput");
    logOutput.innerText = displayMessages.join("\n");
    // Ensure the copy button remains visible.
    logOutput.appendChild(copyButton);
    logOutput.scrollLeft = logOutput.scrollWidth;
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  // Helper functions.
  function normalizeUrl(url) {
    try {
      let urlObj = new URL(url);
      urlObj.hash = "";
      return urlObj.toString();
    } catch (e) {
      console.error("Error normalizing URL", url, e);
      return url;
    }
  }
  
  function shouldSkipUrl(url) {
    try {
      let path = new URL(url).pathname.toLowerCase();
      const disallowed = [
        ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg",
        ".ico", ".pdf", ".zip", ".json", ".xml", ".woff", ".woff2", ".ttf"
      ];
      return disallowed.some(ext => path.endsWith(ext));
    } catch (e) {
      console.error("Error in shouldSkipUrl", url, e);
      return false;
    }
  }
  
  function getRelativePath(url) {
    let urlObj = new URL(url);
    let path = urlObj.pathname;
    if (path.endsWith("/")) {
      path += "index.html";
    }
    if (path === "" || path === "/") {
      path = "index.html";
    } else if (!/\.[a-z0-9]+$/i.test(path)) {
      path += ".html";
    }
    if (path.startsWith("/")) {
      path = path.substring(1);
    }
    return path;
  }
  
  async function getRenderedHTML(url) {
    return new Promise(async (resolve, reject) => {
      if (url === window.location.href) {
        resolve(document.documentElement.outerHTML);
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
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            reject(new Error("Iframe load timeout"));
          }, 15000);
        } else {
          const res = await fetch(url);
          const html = await res.text();
          resolve(html);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  let discoveredPages = [];
  let visited = new Set();
  let downloadedFiles = {};
  let startDomain = "";

  async function discoverPages(url, depth) {
    url = normalizeUrl(url);
    if (visited.has(url) || shouldSkipUrl(url)) return;
    visited.add(url);
    discoveredPages.push(url);
    appendLog(url);
    if (depth <= 0) return;
    try {
      let html;
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
        if (new URL(linkUrl).hostname === startDomain && !shouldSkipUrl(linkUrl)) {
          await discoverPages(linkUrl, depth - 1);
        }
      }
      const regex = /href=["']([^"']+)["']/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        try {
          const linkUrl = normalizeUrl(new URL(match[1], url).toString());
          if (new URL(linkUrl).hostname === startDomain && !shouldSkipUrl(linkUrl)) {
            await discoverPages(linkUrl, depth - 1);
          }
        } catch (e) {
          // Ignore invalid URLs.
        }
      }
    } catch (e) {
      console.error("Error during discovery for", url, e);
    }
  }
  
  async function runInPool(tasks, poolLimit) {
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
      if (executing.length >= poolLimit) {
        r = Promise.race(executing);
      }
      await r;
      return enqueue();
    };
    await enqueue();
    return Promise.all(results);
  }
  
  async function downloadPages() {
    updateStatusField("Fetching (" + discoveredPages.length + " pages)");
    const tasks = discoveredPages.map((url, index) => async () => {
      updateStatusField(`Fetching (${index + 1}/${discoveredPages.length}): ${url}`);
      try {
        let html;
        try {
          html = await getRenderedHTML(url);
        } catch (err) {
          const response = await fetch(url);
          html = await response.text();
        }
        const relativePath = getRelativePath(url);
        downloadedFiles[relativePath] = html;
      } catch (e) {
        updateStatusField(`Error fetching ${url}`);
        console.error(e);
      }
    });
    const poolLimit = 5;
    await runInPool(tasks, poolLimit);
  }
  
  async function zipFiles() {
    updateStatusField("Zipping " + discoveredPages.length + " pages");
    const zip = new JSZip();
    for (const [path, content] of Object.entries(downloadedFiles)) {
      zip.file(path, content);
    }
    try {
      const blob = await zip.generateAsync({ type: "blob" });
      return blob;
    } catch (e) {
      throw new Error("Error generating ZIP: " + e);
    }
  }
  
  function triggerZipDownload(blob, domain) {
    const blobUrl = URL.createObjectURL(blob);
    const filename = `${domain}.zip`;
    chrome.runtime.sendMessage({
      type: 'downloadZip',
      blobUrl: blobUrl,
      filename: filename,
      saveAs: false
    }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatusField("Download error: " + chrome.runtime.lastError.message);
      } else if (!response.success) {
        updateStatusField("Download error: " + response.error);
      } else {
        updateStatusField(`Zip Created. Initiating Download...`);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    });
  }
  
  document.getElementById("downloadBtn").addEventListener("click", async () => {
    try {
      discoveredPages = [];
      visited = new Set();
      downloadedFiles = {};
      discoveredLog = [];
      updateStatusField("Idle");

      let inputUrl = document.getElementById("url").value.trim();
      let startUrl = inputUrl ? inputUrl : window.location.href;

      startDomain = new URL(startUrl).hostname;
      const depth = parseInt(document.getElementById("depth").value, 10);

      updateStatusField("Starting discovery...");
      await discoverPages(startUrl, depth);
      updateStatusField("Discovery complete (" + discoveredPages.length + " pages found)");

      updateStatusField("Starting fetching...");
      await downloadPages();
      updateStatusField("Fetching complete");

      updateStatusField("Starting zipping...");
      try {
        const zipBlob = await zipFiles();
        updateStatusField("Zip Created. Initiating Download...");
        triggerZipDownload(zipBlob, startDomain);
        updateStatusField("Done (" + discoveredPages.length + " pages)");
      } catch (e) {
        updateStatusField("Error during zipping");
        console.error(e);
      }
    } catch (ex) {
      updateStatusField("Unexpected error");
      console.error("Error in main orchestration", ex);
    }
  });
})();
