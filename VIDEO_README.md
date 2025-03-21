# video notes

2. Outline the Steps
Extract the Manifest URL:
In your content script or panel, locate the video element and extract its m3u8 URL.

Fetch and Parse the Manifest:
Use a library like m3u8-parser to parse the manifest file. This will give you a list of segment URLs.

Download the Video Segments:
For each segment URL, use fetch (or XHR) to download the segment data.
You may need to handle CORS or use permissions in your manifest for <all_urls>.

(Optional) Decrypt Segments:
If the segments are encrypted (commonly with AES-128), use the Web Crypto API to decrypt them.
You’ll need to retrieve the decryption key (often provided in the manifest) and then run decryption on each segment.

Merge the Segments:
Use a JavaScript FFmpeg library such as FFmpeg.wasm to merge the segments into a single video file (e.g., an MP4).

Create a Downloadable Blob:
Once merged, create a Blob URL from the resulting file and initiate a download.

3. Libraries and Files
Content/Panel Script:
File: injected_panel.js
Add code to detect the video element and extract the m3u8 URL.
Utility Script for HLS Processing:
File: hlsUtils.js (new file inside a utils folder, e.g., /utils/hlsUtils.js)
Include logic using m3u8-parser to parse the manifest.
Functions to download segments.
Video Processing with FFmpeg:
File: videoProcessor.js (new file, perhaps in a /utils folder)
Wrap FFmpeg.wasm functionality to merge segments.
Background Script:
File: background.js
Handle messages from the panel that start the HLS download process.
Manifest:
File: manifest.json
Ensure you have the proper permissions (<all_urls>, scripting, etc.).
Declare your new utility files as needed if they need to be loaded as modules.
Popup or Panel UI:
File: popup.html or the panel code in injected_panel.js
Include a button that lets you trigger the download process for the video.
