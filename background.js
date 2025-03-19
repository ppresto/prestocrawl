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
    return true; // Keep the messaging channel open for asynchronous response.
  }
});
