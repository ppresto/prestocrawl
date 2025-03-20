chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["jszip.min.js", "injected_panel.js"]
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
    return true; // Keep messaging channel open.
  }

  // New functionality: Listen for "openRenderView" messages.
  if (message.type === 'openRenderView') {
    // If message.data is a string, wrap it in an object.
    if (typeof message.data === 'string') {
      message.data = { html: message.data };
    }
    // Ensure that valid content was provided.
    if (!message.data || !message.data.html) {
      sendResponse({ success: false, error: "No content provided for rendering." });
      return true;
    }
    try {
      const data = message.data;
      // Instead of encoding large HTML content into a URL query string,
      // store the data in chrome.storage.local.
      chrome.storage.local.set({ renderData: data }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          // Open render.html without passing data via the URL.
          chrome.tabs.create({
            url: chrome.runtime.getURL("render.html")
          }, (tab) => {
            sendResponse({ success: true });
          });
        }
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});
