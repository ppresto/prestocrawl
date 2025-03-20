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
  } else if (message.type === 'renderPage') {
    // New functionality: Open a new tab that loads render.html to display the fetched page locally.
    // The render.html page should be prepared to handle the query parameters passed below.
    const renderUrl = chrome.runtime.getURL('render.html') +
      '?blobUrl=' + encodeURIComponent(message.blobUrl) +
      '&filename=' + encodeURIComponent(message.filename);
    chrome.tabs.create({ url: renderUrl }, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, tabId: tab.id });
      }
    });
    return true; // Keep the messaging channel open for asynchronous response.
  }
});
