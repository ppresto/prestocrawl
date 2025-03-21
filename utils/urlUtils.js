// utils/urlUtils.js
export function normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      urlObj.hash = "";
      return urlObj.toString();
    } catch (e) {
      console.error("Error normalizing URL", url, e);
      return url;
    }
  }
  
  export function shouldSkipUrl(url) {
    try {
      const path = new URL(url).pathname.toLowerCase();
      const disallowed = [
        ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg",
        ".ico", ".pdf", ".zip", ".json", ".xml", ".woff", ".woff2", ".ttf"
      ];
      return disallowed.some(ext => path.endsWith(ext));
    } catch (e) {
      console.error("Error in shouldSkipUrl", url, e);
      return false;
    }
  }
  
  export function getRelativePath(url) {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname;
      if (path.endsWith("/")) {
        path += "index.html";
      }
      if (path === "" || path === "/") {
        path = "index.html";
      } else if (!/\.[a-z0-9]+$/i.test(path)) {
        path += ".html";
      }
      if (path.startsWith("/")) {
        path = path.substring(1);
      }
      return path;
    } catch (e) {
      console.error("Error getting relative path", url, e);
      return url;
    }
  }
  