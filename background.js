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
    // Ensure that valid content was provided.
    if (!message.data || !message.data.html) {
      sendResponse({ success: false, error: "No content provided for rendering." });
      return true;
    }
    try {
      const data = message.data;
      const encodedData = encodeURIComponent(JSON.stringify(data));
      chrome.tabs.create({
        url: chrome.runtime.getURL("render.html") + "?data=" + encodedData
      }, (tab) => {
        sendResponse({ success: true });
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});
