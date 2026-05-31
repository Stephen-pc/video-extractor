// ============================================================
// Video Extractor — Background Service Worker
// 功能：监控网络请求，捕获视频资源 URL
// ============================================================

// --- 跨浏览器 API 兼容 ---
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// --- 视频资源缓存 ---
const MAX_CACHE_SIZE = 200;
const videoCache = [];
const videoUrlSet = new Set();

// --- 视频 URL 匹配规则 ---
const VIDEO_EXTENSIONS = /\.(mp4|m3u8|ts|webm|mkv|flv|avi|mov|ogg|wmv|m4v|mpg|mpeg|f4v|3gp)(\?|$)/i;

const VIDEO_MIME_TYPES = [
  'video/',
  'application/x-mpegURL',
  'application/vnd.apple.mpegurl',
  'application/octet-stream',
  'application/x-mms-framed',
  'audio/mpegurl',
  'audio/x-mpegurl'
];

// --- 去重并缓存视频 URL ---
function addVideoEntry(url, tabId, type, details = {}) {
  if (videoUrlSet.has(url)) return;

  videoUrlSet.add(url);

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    url,
    tabId,
    type, // 'network' | 'dom'
    title: extractFilename(url),
    ext: extractExtension(url),
    size: details.size || null,
    mimeType: details.mimeType || null,
    timestamp: Date.now(),
    pageUrl: details.pageUrl || ''
  };

  videoCache.unshift(entry);

  // 超出上限时移除最旧的
  while (videoCache.length > MAX_CACHE_SIZE) {
    const removed = videoCache.pop();
    videoUrlSet.delete(removed.url);
  }
}

// --- 从 URL 提取文件名 ---
function extractFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename) || pathname;
  } catch {
    return url.split('/').pop() || url;
  }
}

// --- 提取文件扩展名 ---
function extractExtension(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]+)(?:\?|$)/);
    return match ? match[1] : '';
  } catch {
    const match = url.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
    return match ? match[1] : '';
  }
}

// --- 判断是否为视频请求 ---
function isVideoRequest(url, responseHeaders) {
  // 先检查 URL 扩展名
  if (VIDEO_EXTENSIONS.test(url)) return true;

  // 再检查 Content-Type
  if (responseHeaders) {
    const contentType = responseHeaders.find(
      h => h.name.toLowerCase() === 'content-type'
    );
    if (contentType) {
      const ct = contentType.value.toLowerCase();
      for (const mime of VIDEO_MIME_TYPES) {
        if (ct.includes(mime)) return true;
      }
    }
  }

  return false;
}

// --- 从响应头获取文件大小 ---
function getContentLength(headers) {
  if (!headers) return null;
  const cl = headers.find(h => h.name.toLowerCase() === 'content-length');
  return cl ? parseInt(cl.value, 10) : null;
}

// --- webRequest 监听：捕获响应头 ---
browserAPI.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.tabId < 0) return; // 忽略非标签页请求

    const responseHeaders = details.responseHeaders || [];
    if (isVideoRequest(details.url, responseHeaders)) {
      const size = getContentLength(responseHeaders);
      const mimeType = responseHeaders.find(
        h => h.name.toLowerCase() === 'content-type'
      );

      addVideoEntry(details.url, details.tabId, 'network', {
        size,
        mimeType: mimeType ? mimeType.value : null,
        pageUrl: details.initiator || details.documentUrl || ''
      });
    }
  },
  { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other'] },
  ['responseHeaders']
);

// --- webRequest 监听：额外捕获主请求（有些 CDN 不返回正确 Content-Type） ---
browserAPI.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;

    // 仅根据 URL 扩展名判断
    if (VIDEO_EXTENSIONS.test(details.url)) {
      addVideoEntry(details.url, details.tabId, 'network', {
        pageUrl: details.initiator || details.documentUrl || ''
      });
    }
  },
  { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other'] }
);

// --- 消息处理 ---
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {

    // 获取当前标签页的网络捕获视频
    case 'getNetworkVideos':
      const videos = message.tabId
        ? videoCache.filter(v => v.tabId === message.tabId)
        : [...videoCache];
      sendResponse({ success: true, data: videos.slice(0, 100) });
      break;

    // 获取所有缓存的网络视频
    case 'getAllNetworkVideos':
      sendResponse({ success: true, data: [...videoCache] });
      break;

    // 清理指定标签页的缓存
    case 'clearTabVideos':
      const toRemove = videoCache.filter(v => v.tabId === message.tabId);
      toRemove.forEach(v => videoUrlSet.delete(v.url));
      videoCache.length = 0;
      // 重建缓存
      const remaining = videoCache.filter(v => v.tabId !== message.tabId);
      videoCache.length = 0;
      remaining.forEach(v => {
        videoCache.push(v);
        videoUrlSet.add(v.url);
      });
      sendResponse({ success: true });
      break;

    // 下载视频
    case 'downloadVideo':
      browserAPI.downloads.download({
        url: message.url,
        filename: message.filename || '',
        saveAs: message.saveAs !== false
      }, (downloadId) => {
        if (browserAPI.runtime.lastError) {
          sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
      return true; // 异步响应

    // 缓存 DOM 扫描结果
    case 'cacheDOMVideos':
      if (message.data && Array.isArray(message.data)) {
        message.data.forEach(v => {
          addVideoEntry(v.url, sender.tab?.id || message.tabId, 'dom', {
            pageUrl: v.pageUrl || '',
            title: v.title || ''
          });
        });
        sendResponse({ success: true, cached: message.data.length });
      } else {
        sendResponse({ success: false, error: 'No data provided' });
      }
      break;

    // 获取当前活动标签页
    case 'getCurrentTab':
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ success: true, tab: tabs[0] || null });
      });
      return true; // 异步响应

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return false;
});

// --- Service Worker 激活日志 ---
console.log('[Video Extractor] Background service worker activated');
