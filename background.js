chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["jszip.min.js", "readability.js", "m3u8-parser.min.js", "injected_panel.js"]
  });
});

// Listen for messages from the injected panel.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'downloadZip') {
    if (chrome.downloads && typeof chrome.downloads.download === "function") {
      chrome.downloads.download({
        url: message.blobUrl,
        filename: message.filename,
        saveAs: message.saveAs
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId: downloadId });
        }
      });
    } else {
      sendResponse({ success: false, error: "chrome.downloads API not available" });
    }
    return true; // Keep the messaging channel open for asynchronous response.
  }
});
  
// -------------------
// New: Readability processing in the download workflow.
// (Assumes that the Readability library and DOMParser are available in this context.)
// -------------------

let downloadedFiles = {};
let discoveredPages = [];
let visited = new Set();
let startDomain = "";

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

async function downloadPages(makeReadable) {
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
      
      // If readability processing is enabled, run the HTML through Readability.
      if (makeReadable) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const reader = new Readability(doc);
          const article = reader.parse();
          if (article && article.content) {
            html = `<html><head><meta charset="UTF-8"><title>${article.title}</title></head><body>${article.content}</body></html>`;
          }
        } catch (ex) {
          console.error("Error processing readability for " + url, ex);
        }
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

function updateStatusField(text) {
  // Send a message to the panel to update status (if needed).
  // For simplicity, you might log it here or implement a callback.
  console.log("Status: " + text);
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

// Example: Assume that the panel sends a message with type 'startDownload' along with a flag "readabilityEnabled".
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startDownload') {
    // Expect message.readabilityEnabled to be true/false.
    downloadedFiles = {};
    discoveredPages = [];
    visited = new Set();
    // For this example, assume message.startUrl and message.depth are passed too.
    startDomain = new URL(message.startUrl).hostname;
    // Save the readability flag in chrome.storage for later retrieval (if needed elsewhere).
    chrome.storage.local.set({ makeReadable: message.readabilityEnabled });
    
    (async () => {
      updateStatusField("Starting discovery...");
      // Assume discoverPages is defined and populates discoveredPages.
      await discoverPages(message.startUrl, message.depth);
      updateStatusField("Discovery complete (" + discoveredPages.length + " pages found)");
      
      updateStatusField("Starting fetching...");
      await downloadPages(message.readabilityEnabled);
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
      sendResponse({ success: true });
    })();
    return true;
  }
});
