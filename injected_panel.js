(function(){
  // If the panel is already injected, do not inject it again.
  if (document.getElementById("my-extension-panel")) return;

  // Create the panel container with dynamic sizing.
  const container = document.createElement("div");
  container.id = "my-extension-panel";
  container.style.position = "fixed";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.width = "420px";
  container.style.minHeight = "600px";
  container.style.maxHeight = "90vh"; // never exceed 90% of viewport height
  container.style.height = "auto";
  container.style.backgroundColor = "white";
  container.style.border = "2px solid #FF69B4"; // pink border
  container.style.borderRadius = "15px";
  container.style.zIndex = "999999";
  container.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  container.style.overflowY = "auto"; // allow vertical scrolling if needed
  container.style.fontFamily = "'Segoe UI', sans-serif";

  // Build the inner layout using a flex column.
  container.innerHTML = `
    <style>
      .switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 24px;
      }
      .switch input { 
        opacity: 0;
        width: 0;
        height: 0;
      }
      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: gray;
        transition: 0.4s;
        border-radius: 24px;
      }
      .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 4px;
        bottom: 4px;
        background-color: pink;
        transition: 0.4s;
        border-radius: 50%;
      }
      .switch input:checked + .slider {
        background-color: blue;
      }
      .switch input:checked + .slider:before {
        transform: translateX(16px);
      }
      /* Flex layout for panel */
      #panel-content {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      /* Fixed areas */
      #header, #inputs, #toggles, #startButtonContainer {
        flex: 0 0 auto;
      }
      /* Main content expands */
      #main-content {
        flex: 1 1 auto;
        padding: 0 15px;
        overflow-y: auto;
      }
      /* Log output field styling:
         Defaults to 10 lines (160px) tall, expandable to 20 lines (320px) */
      #logOutput {
        margin-bottom: 10px;
        padding: 15px;
        border: 1px solid blue;
        border-radius: 5px;
        background: white;
        color: black;
        position: relative;
        overflow-x: auto;
        overflow-y: auto;
        height: 160px;
      }
      #logMessages {
        white-space: pre-wrap;
      }
      /* Status field transitions:
         Default is 1 line (30px); expanded to 20 lines (600px) */
      #statusField {
        transition: height 0.3s ease;
        height: 30px;
      }
    </style>
    <div id="panel-content">
      <!-- Header: Logo with external image, full width -->
      <div id="header" style="position: relative; padding: 0; margin: 0;">
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
      <!-- Input fields: URL and Link depth -->
      <div id="inputs" style="padding: 15px; display: flex; gap: 10px; align-items: flex-start;">
        <div style="flex: 1;">
          <label for="url" style="color: blue; display: block; margin-bottom: 5px;">URL</label>
          <input type="text" id="url" style="width: 100%; padding: 8px; border: 1px solid blue; border-radius: 5px; background: white; color: black;" />
        </div>
        <div style="display: flex; flex-direction: column; justify-content: flex-start;">
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
      <!-- Toggles -->
      <div id="toggles" style="padding: 0 15px 10px 15px;">
        <!-- Readability Toggle -->
        <div id="readabilityToggle" style="display: flex; align-items: center; margin-bottom: 10px;">
          <label class="switch" style="margin: 0;">
            <input type="checkbox" id="enableReadability">
            <span class="slider"></span>
          </label>
          <span style="color: blue; font-weight: bold; margin-left: 8px;">Enable Readability</span>
        </div>
        <!-- Download Videos Toggle -->
        <div id="videoToggle" style="display: flex; align-items: center;">
          <label class="switch" style="margin: 0;">
            <input type="checkbox" id="enableVideos">
            <span class="slider"></span>
          </label>
          <span style="color: blue; font-weight: bold; margin-left: 8px;">Download Videos</span>
        </div>
      </div>
      <!-- Main content: Log output and Status field -->
      <div id="main-content">
        <!-- Log Output Field with inner container for messages -->
        <div id="logOutput">
          <div id="logMessages"></div>
        </div>
        <!-- Status Field -->
        <div id="statusField" style="padding: 5px 10px; overflow: hidden; border: 2px solid blue; border-radius: 5px; background-color: blue; color: white; font-weight: bold; white-space: nowrap; cursor: pointer;">
          Status: Idle
        </div>
      </div>
      <!-- Footer: Start Button -->
      <div id="startButtonContainer" style="padding: 15px; text-align: center;">
        <button id="downloadBtn" style="width: 33%; padding: 10px; background-color: #FF69B4; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1em;">Start</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Set default URL.
  document.getElementById("url").value = window.location.href;

  // Close button.
  const closeButton = document.getElementById("closeButton");
  closeButton.addEventListener("click", () => {
    const panel = document.getElementById("my-extension-panel");
    if (panel) {
      panel.remove();
    }
  });

  // Status field toggle (expanding/shrinking status field).
  const statusField = document.getElementById("statusField");
  let statusExpanded = false;
  statusField.addEventListener("click", () => {
    if (statusExpanded) {
      statusField.style.height = "30px"; // 1 line
      statusField.style.overflow = "hidden";
      statusField.style.backgroundColor = "blue";
      statusField.style.color = "white";
    } else {
      statusField.style.height = "600px"; // 20 lines
      statusField.style.overflow = "auto";
      statusField.style.backgroundColor = "white";
      statusField.style.color = "blue";
    }
    statusExpanded = !statusExpanded;
    const history = statusField.dataset.history ? statusField.dataset.history.split("\n") : [];
    if (!statusExpanded) {
      const lastLine = history[history.length - 1];
      statusField.innerText = "Status: " + lastLine;
    } else {
      statusField.innerText = "Status:\n" + history.join("\n");
    }
  });

  // Log output field toggle (expanding/shrinking log messages).
  const logOutput = document.getElementById("logOutput");
  let logExpanded = false;
  logOutput.addEventListener("click", () => {
    if (logExpanded) {
      logOutput.style.height = "160px"; // 10 lines
    } else {
      logOutput.style.height = "320px"; // 20 lines
    }
    logExpanded = !logExpanded;
  });

  // Set up logging and copy button.
  let discoveredLog = [];
  const MAX_LOG_LINES = 2000;
  const DISPLAY_LOG_LINES = 10;
  function updateStatusField(text) {
    let history = statusField.dataset.history ? statusField.dataset.history.split("\n") : [];
    history.push(text);
    statusField.dataset.history = history.join("\n");
    if (!statusExpanded) {
      const lastLine = history[history.length - 1];
      statusField.innerText = "Status: " + lastLine;
    } else {
      statusField.innerText = "Status:\n" + history.join("\n");
    }
  }

  // Create copy button for the log output.
  const copyButton = document.createElement("button");
  copyButton.innerHTML = "📋 Copy";
  copyButton.style.position = "absolute";
  copyButton.style.top = "5px";
  copyButton.style.right = "5px";
  copyButton.style.padding = "5px 10px";
  copyButton.style.fontSize = "0.8em";
  copyButton.style.border = "none";
  copyButton.style.borderRadius = "5px";
  copyButton.style.background = "transparent";
  copyButton.style.color = "#333";
  copyButton.style.cursor = "pointer";
  copyButton.addEventListener("click", (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(discoveredLog.join("\n"))
      .then(() => updateStatusField("Copied URLs to clipboard"))
      .catch(err => updateStatusField("Copy error: " + err.message));
  });
  logOutput.appendChild(copyButton);

  // Append log messages into the #logMessages container.
  function appendLog(message) {
    discoveredLog.push(message);
    if (discoveredLog.length > MAX_LOG_LINES) {
      discoveredLog = discoveredLog.slice(-MAX_LOG_LINES);
    }
    const displayMessages = discoveredLog.slice(-DISPLAY_LOG_LINES);
    const logMessages = document.getElementById("logMessages");
    logMessages.innerText = displayMessages.join("\n");
  }

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
      const disallowed = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".zip", ".json", ".xml", ".woff", ".woff2", ".ttf"];
      return disallowed.some(ext => path.endsWith(ext));
    } catch (e) {
      console.error("Error in shouldSkipUrl", url, e);
      return false;
    }
  }
  
  function getRelativePath(url) {
    let urlObj = new URL(url);
    let path = urlObj.pathname;
    if (path.endsWith("/")) { path += "index.html"; }
    if (path === "" || path === "/") { path = "index.html"; }
    else if (!/\.[a-z0-9]+$/i.test(path)) { path += ".html"; }
    if (path.startsWith("/")) { path = path.substring(1); }
    return path;
  }
  
  async function getRenderedHTML(url) {
    return new Promise(async (resolve, reject) => {
      if (url === window.location.href) {
        if (document.getElementById("my-extension-panel")) {
          try {
            let clone = document.documentElement.cloneNode(true);
            let panel = clone.querySelector("#my-extension-panel");
            if (panel) { panel.remove(); }
            resolve(clone.outerHTML);
          } catch (e) { reject(e); }
        } else { resolve(document.documentElement.outerHTML); }
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
      try { html = await getRenderedHTML(url); }
      catch (err) {
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
        } catch (e) { }
      }
    } catch (e) { console.error("Error during discovery for", url, e); }
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
      if (executing.length >= poolLimit) { r = Promise.race(executing); }
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
        try { html = await getRenderedHTML(url); }
        catch (err) {
          const response = await fetch(url);
          html = await response.text();
        }
        console.log("window.Readability:", window.Readability);
        if (document.getElementById("enableReadability").checked) {
          try {
            if (typeof Readability === "undefined") {
              console.error("Readability library is not loaded.");
              updateStatusField("Readability library not loaded");
            } else {
              updateStatusField("Processing with Readability...");
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const article = new Readability(doc).parse();
              if (article && article.content) {
                html = `<html><head><meta charset="UTF-8"><link rel="stylesheet" type="text/css" href="../reader.css"></head><body>${article.content}</body></html>`;
              }
            }
          } catch (e) { console.error("Readability extraction error:", e); }
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
    const readabilityEnabled = document.getElementById("enableReadability").checked;
    for (const [path, content] of Object.entries(downloadedFiles)) {
      let modifiedContent = content;
      if (readabilityEnabled && modifiedContent.includes("<head>")) {
        const depth = (path.match(/\//g) || []).length;
        let cssPath = "";
        for (let i = 0; i < depth; i++) { cssPath += "../"; }
        cssPath += "reader.css";
        modifiedContent = modifiedContent.replace(/<\/head>/i, `<link rel="stylesheet" type="text/css" href="${cssPath}"></head>`);
      }
      zip.file(path, modifiedContent);
    }
    try {
      const cssUrl = chrome.runtime.getURL("reader.css");
      const cssResponse = await fetch(cssUrl);
      const cssContent = await cssResponse.text();
      zip.file("reader.css", cssContent);
    } catch (e) { console.error("Error loading reader.css", e); }
  
    try {
      const blob = await zip.generateAsync({ type: "blob" });
      return blob;
    } catch (e) { throw new Error("Error generating ZIP: " + e); }
  }
  
  function triggerZipDownload(blob, domain) {
    const blobUrl = URL.createObjectURL(blob);
    const filename = `${domain}.zip`;
    updateStatusField("Zip Created.");
    updateStatusField("Initiating Download...");
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
        updateStatusField("Download Successful.");
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    });
  }
  
  document.getElementById("downloadBtn").addEventListener("click", async () => {
    try {
      // Reset fields for a new run.
      discoveredPages = [];
      visited = new Set();
      downloadedFiles = {};
      discoveredLog = [];
      // Clear status field history and log messages.
      statusField.dataset.history = "";
      document.getElementById("logMessages").innerText = "";
      // Also reset toggles to default sizes.
      statusField.style.height = "30px";
      logOutput.style.height = "160px";
      statusExpanded = false;
      logExpanded = false;
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
