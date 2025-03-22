// video_extractor.js
// Contains functions to extract and process video manifests.

export async function processVideo(html, updateStatusCallback) {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(html, "text/html");
    // Try to find a <video> element.
    let videoEl = doc.querySelector("video");
    if (!videoEl) {
      // If not found, try to find an <iframe> with a Vimeo player.
      let iframeEl = doc.querySelector("iframe[src*='player.vimeo.com/video/']");
      if (!iframeEl) {
        updateStatusCallback("No video element or Vimeo iframe found on page.");
        return null;
      }
      // Extract Vimeo video ID from the iframe's src.
      const match = iframeEl.src.match(/player\.vimeo\.com\/video\/(\d+)/);
      if (!match) {
        updateStatusCallback("No Vimeo video ID found in iframe src.");
        return null;
      }
      const videoId = match[1];
      const configUrl = `https://player.vimeo.com/video/${videoId}/config`;
      updateStatusCallback("Fetching Vimeo config from: " + configUrl);
      try {
        const res = await fetch(configUrl);
        const json = await res.json();
        if (json && json.request && json.request.files && json.request.files.hls && json.request.files.hls.default) {
          const m3u8Url = json.request.files.hls.default;
          updateStatusCallback("Video manifest found: " + m3u8Url);
          try {
            const manifestRes = await fetch(m3u8Url);
            const manifestText = await manifestRes.text();
            const parser = new m3u8Parser.Parser();
            parser.push(manifestText);
            parser.end();
            const manifest = parser.manifest;
            const segments = manifest.segments ? manifest.segments.map(s => s.uri) : [];
            updateStatusCallback("Video segments extracted: " + segments.join(", "));
            return segments;
          } catch (err) {
            updateStatusCallback("Error fetching/parsing manifest: " + err.message);
            return null;
          }
        } else {
          updateStatusCallback("Vimeo config fetched but no HLS manifest URL found.");
          return null;
        }
      } catch (err) {
        updateStatusCallback("Error fetching Vimeo config: " + err.message);
        return null;
      }
    } else {
      // If a <video> element is found, attempt to find an m3u8 URL.
      let m3u8Url = "";
      if (videoEl.src && videoEl.src.endsWith(".m3u8")) {
        m3u8Url = videoEl.src;
      } else {
        const sourceEl = videoEl.querySelector("source[src$='.m3u8']");
        if (sourceEl) {
          m3u8Url = sourceEl.src;
        }
      }
      if (m3u8Url) {
        updateStatusCallback("Video manifest found: " + m3u8Url);
        try {
          const res = await fetch(m3u8Url);
          const manifestText = await res.text();
          const parser = new m3u8Parser.Parser();
          parser.push(manifestText);
          parser.end();
          const manifest = parser.manifest;
          const segments = manifest.segments ? manifest.segments.map(s => s.uri) : [];
          updateStatusCallback("Video segments extracted: " + segments.join(", "));
          return segments;
        } catch (err) {
          updateStatusCallback("Error fetching/parsing manifest: " + err.message);
          return null;
        }
      } else {
        updateStatusCallback("Video element found but no m3u8 manifest URL.");
        return null;
      }
    }
  }
  