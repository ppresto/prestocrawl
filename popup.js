// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // We assume the popup contains a button with id "openPanelBtn"
  const openPanelBtn = document.getElementById("openPanelBtn");
  if (openPanelBtn) {
    openPanelBtn.addEventListener("click", () => {
      // Send a message to the background script to inject the panel
      chrome.runtime.sendMessage({ type: "openPanel" }, (response) => {
        console.log("Panel injection response:", response);
      });
    });
  } else {
    console.error("No openPanelBtn found in popup.html");
  }
});
