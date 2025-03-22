// background.js

// Optionally, you can still inject the panel when the extension icon is clicked:
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: [
      "src/libs/jszip.min.js",
      "src/libs/readability.js",
      "src/libs/m3u8-parser.min.js",
      "src/content/content_fetcher.js",
      "src/content/video_extractor.js",
      "src/content/injected_panel.js"
    ]
  });
});

// Listen for messages from popup.js or the injected panel.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openPanel') {
    // Inject the panel into the active tab.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: [
            "src/libs/jszip.min.js",
            "src/libs/readability.js",
            "src/libs/m3u8-parser.min.js",
            "src/content/content_fetcher.js",
            "src/content/video_extractor.js",
            "src/content/injected_panel.js"
          ]
        }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "No active tab found." });
      }
    });
    // Return true to indicate asynchronous sendResponse.
    return true;
  }
  
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
    return true; // Keep messaging channel open for asynchronous response.
  }
});
