document.addEventListener('DOMContentLoaded', () => {
    // Event listener for the "Render Readable" button.
    const renderBtn = document.getElementById("renderReadableBtn");
    const urlInput = document.getElementById("url");
  
    if (renderBtn) {
      renderBtn.addEventListener("click", () => {
        // Use the URL from the input field or fallback to the current tab’s URL.
        const url = urlInput.value.trim() || window.location.href;
        
        // For this example, we'll fetch the HTML content from the provided URL.
        // Note: You might want to refine this based on your extension’s design.
        fetch(url)
          .then(response => response.text())
          .then(htmlContent => {
            // Send the HTML content to the background script for processing.
            chrome.runtime.sendMessage({
              type: "openReadableView",
              data: { html: htmlContent }
            }, (response) => {
              console.log("Response from background:", response);
            });
          })
          .catch(err => console.error("Error fetching page for readability:", err));
      });
    }
  });
  