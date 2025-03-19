// background.js

// ===== EXISTING INITIALIZATION AND UTILITY CODE =====
// (Keep your original initialization, event listeners, and other helpers here.)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});

// ... (Other existing functions and variables from your latest background.js)
// For example, if you have functions for logging, notifications, etc., they remain here.


// ===== NEW CODE: Fetching Page Content and Opening the Viewer =====

/**
 * Fetches the page HTML from the specified tab and then opens it in our viewer.
 * This function uses chrome.scripting.executeScript to capture the rendered HTML.
 * @param {number} tabId - The ID of the tab from which to fetch the HTML.
 * @param {string} url - The URL of the page (used for “Open Original” link).
 */
function fetchAndRenderPage(tabId, url) {
  // Use chrome.scripting.executeScript to get the full rendered HTML.
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: () => document.documentElement.outerHTML,
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('Error fetching page content:', chrome.runtime.lastError);
      return;
    }
    const pageHtml = results && results[0] && results[0].result;
    if (pageHtml) {
      openFetchedPageInViewer(pageHtml, url);
    } else {
      console.error('No HTML content returned.');
    }
  });
}

/**
 * Opens a new tab with the viewer page that wraps the fetched HTML.
 * It builds a URL pointing to viewer.html (packaged with the extension)
 * and passes the fetched HTML content (and original URL, if available) as URL parameters.
 *
 * @param {string} fetchedHtml - The complete HTML content fetched from the page.
 * @param {string} originalUrl - (Optional) The original URL of the page.
 */
function openFetchedPageInViewer(fetchedHtml, originalUrl) {
  // Encode the fetched HTML so it can be safely transmitted in the URL.
  const encodedContent = encodeURIComponent(fetchedHtml);
  const viewerUrl = chrome.runtime.getURL('viewer.html') +
                    '?data=' + encodedContent +
                    (originalUrl ? '&url=' + encodeURIComponent(originalUrl) : '');
  chrome.tabs.create({ url: viewerUrl });
}

// ===== MODIFIED MESSAGE LISTENER (MERGED WITH EXISTING LOGIC) =====

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Preserve your existing message handling:
  // For example, if your current code handles other actions, leave them here.
  if (message.action === 'fetchPage') {
    // Use the URL from the message or default to the sender tab’s URL.
    const url = message.url || (sender.tab && sender.tab.url);
    fetchAndRenderPage(sender.tab.id, url);
    sendResponse({ status: 'fetching' });
    return true;
  }

  // ... (Other message actions your current code handles)

  return false; // Or true if you plan asynchronous response for other actions.
});

// ===== END OF UPDATED CODE =====

// (Rest of your background.js remains unchanged.)
