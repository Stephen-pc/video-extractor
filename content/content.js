// ============================================================
// Video Extractor — Content Script
// 功能：扫描 DOM 中的视频元素和播放器配置
// ============================================================

// --- 跨浏览器 API 兼容 ---
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// --- 视频来源提取结果 ---
const foundVideos = new Map();

// --- 扫描结果缓存 key ---
function videoKey(url) {
  return url.trim().replace(/^\/\//, 'https://');
}

// --- 添加发现的视频 ---
function addFoundVideo(url, source = 'dom', meta = {}) {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return;

  const key = videoKey(url);
  if (foundVideos.has(key)) return;

  // 过滤太短的 URL
  try {
    const pathname = new URL(url.startsWith('//') ? 'https:' + url : url).pathname;
    if (pathname.length < 3) return;
  } catch {
    if (url.length < 5) return;
  }

  const ext = extractExtension(url);

  foundVideos.set(key, {
    url: url.startsWith('//') ? 'https:' + url : url,
    source,
    ext,
    title: meta.title || extractFilename(url),
    poster: meta.poster || '',
    duration: meta.duration || null,
    width: meta.width || null,
    height: meta.height || null,
    quality: meta.quality || '',
    element: meta.element || 'unknown',
    pageUrl: location.href,
    pageTitle: document.title
  });
}

// --- 提取扩展名 ---
function extractExtension(url) {
  try {
    const pathname = new URL(url.startsWith('//') ? 'https:' + url : url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return match ? match[1].toLowerCase() : '';
  } catch {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return match ? match[1].toLowerCase() : '';
  }
}

// --- 提取文件名 ---
function extractFilename(url) {
  try {
    const pathname = new URL(url.startsWith('//') ? 'https:' + url : url).pathname;
    const name = pathname.split('/').pop();
    return decodeURIComponent(name) || 'video';
  } catch {
    return url.split('/').pop() || 'video';
  }
}

// ============================================================
// 扫描策略
// ============================================================

// --- 1. 扫描 <video> 标签 ---
function scanVideoElements() {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    // 直接的 src 属性
    if (video.src && video.src.startsWith('http')) {
      addFoundVideo(video.src, 'video-tag', {
        poster: video.poster || '',
        width: video.videoWidth || video.width || null,
        height: video.videoHeight || video.height || null,
        duration: video.duration || null,
        element: '<video>'
      });
    }

    // currentSrc（当前播放源）
    if (video.currentSrc && video.currentSrc.startsWith('http')) {
      addFoundVideo(video.currentSrc, 'video-currentSrc', {
        poster: video.poster || '',
        element: '<video>.currentSrc'
      });
    }

    // <source> 子元素
    video.querySelectorAll('source').forEach(source => {
      if (source.src && source.src.startsWith('http')) {
        addFoundVideo(source.src, 'video-source', {
          quality: source.getAttribute('label') || source.getAttribute('title') || '',
          mimeType: source.type || '',
          element: '<source>'
        });
      }
    });
  });
}

// --- 2. 扫描 <script> 中的视频 URL ---
function scanScriptTags() {
  const scripts = document.querySelectorAll('script');
  const patterns = [
    // 通用视频 URL 模式
    /"(https?:\/\/[^"]+\.(?:mp4|m3u8|ts|webm|mkv|flv|avi|mov)[^"]*)"/gi,
    /'(https?:\/\/[^']+\.(?:mp4|m3u8|ts|webm|mkv|flv|avi|mov)[^']*)'/gi,
    // JSON 中的 url 字段
    /"url"\s*:\s*"(https?:\/\/[^"]+\.(?:mp4|m3u8|ts|webm|mkv|flv|avi|mov)[^"]*)"/gi,
    // 播放器配置
    /"(?:video(?:Url|_url|Src|_src)?)"\s*:\s*"(https?:\/\/[^"]+)"/gi,
    /'(?:video(?:Url|_url|Src|_src)?)'\s*:\s*'(https?:\/\/[^']+)'/gi,
    /"(?:src|source|file|url)"\s*:\s*"(https?:\/\/[^"]*\.(?:mp4|m3u8|ts|webm)[^"]*)"/gi,
    // 视频地址
    /"(https?:\/\/[^"]*\/[^"]*\.(?:mp4|m3u8|ts|webm|mkv|flv|avi|mov)[^"]*)"/gi,
    // URL 参数形式的视频
    /[?&](?:videoUrl|video_url|videoSrc|source)=([^&\s"']+)/gi,
  ];

  const seenUrls = new Set();

  scripts.forEach(script => {
    const content = script.textContent || script.innerHTML || '';
    if (!content || content.length < 10) return;

    patterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        const url = match[1] || match[2] || match[0];
        // 清理捕获到的 URL
        const cleanUrl = url.replace(/^["']|["']$/g, '').trim();
        if (cleanUrl.startsWith('http') && !seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl);
          // 检查是否为视频 URL
          if (/\.(mp4|m3u8|ts|webm|mkv|flv|avi|mov|ogg|wmv|m4v)/i.test(cleanUrl) ||
              /video/i.test(cleanUrl)) {
            addFoundVideo(cleanUrl, 'script', {
              element: '<script>'
            });
          }
        }
      }
    });
  });
}

// --- 3. 扫描常见播放器实例 ---
function scanPlayerInstances() {
  // jwplayer
  if (typeof window.jwplayer === 'function') {
    try {
      const players = document.querySelectorAll('.jwplayer, [id^="jwplayer"], [id^="player"]');
      players.forEach(el => {
        try {
          const instance = window.jwplayer(el.id);
          if (instance && instance.getPlaylist) {
            const playlist = instance.getPlaylist();
            if (playlist) {
              playlist.forEach(item => {
                if (item.file) addFoundVideo(item.file, 'jwplayer', {
                  title: item.title || '',
                  element: 'jwplayer'
                });
                if (item.sources) {
                  item.sources.forEach(s => {
                    if (s.file) addFoundVideo(s.file, 'jwplayer', {
                      quality: s.label || '',
                      element: 'jwplayer'
                    });
                  });
                }
              });
            }
          }
        } catch (e) { /* 忽略无法访问的播放器 */ }
      });
    } catch (e) { /* jwplayer 未完全加载 */ }
  }

  // videojs
  if (typeof window.videojs === 'function') {
    try {
      const videoJsPlayers = document.querySelectorAll('.video-js, video[id]');
      videoJsPlayers.forEach(el => {
        if (el.id) {
          try {
            const player = window.videojs(el.id);
            if (player && player.currentSrc) {
              const src = player.currentSrc();
              if (src) addFoundVideo(src, 'videojs', {
                element: 'videojs'
              });
            }
          } catch (e) { /* 忽略 */ }
        }
      });
    } catch (e) { /* videojs 未完全加载 */ }
  }

  // DPlayer / ArtPlayer 等常见 HTML5 播放器
  if (typeof window.DPlayer !== 'undefined') {
    // DPlayer 实例通常存储在变量中，尝试从 DOM 属性获取
    document.querySelectorAll('[data-video]').forEach(el => {
      const url = el.getAttribute('data-video') || el.getAttribute('data-url');
      if (url) addFoundVideo(url, 'dplayer', { element: 'DPlayer' });
    });
  }
}

// --- 4. 扫描 iframe 中的视频（嵌入平台） ---
function scanIframes() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    const src = iframe.src;
    if (!src) return;

    // 常见视频平台的 iframe
    const videoPlatforms = [
      { pattern: /youtube\.com\/embed\/([^?&]+)/, name: 'YouTube' },
      { pattern: /player\.bilibili\.com\/player\.html/, name: 'Bilibili' },
      { pattern: /v\.qq\.com\/iframe\//, name: 'Tencent Video' },
      { pattern: /player\.youku\.com\/embed\//, name: 'Youku' },
      { pattern: /open\.iqiyi\.com\/developer\/player/, name: 'iQiyi' },
      { pattern: /vimeo\.com\/video\/(\d+)/, name: 'Vimeo' },
      { pattern: /dailymotion\.com\/embed\//, name: 'Dailymotion' },
    ];

    for (const platform of videoPlatforms) {
      if (platform.pattern.test(src)) {
        addFoundVideo(src, 'iframe', {
          title: `${platform.name} Embed`,
          element: '<iframe>'
        });
        break;
      }
    }
  });
}

// --- 5. 扫描 <a> 标签中的视频链接 ---
function scanLinks() {
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.href;
    if (/\.(mp4|m3u8|ts|webm|mkv|flv|avi|mov|ogg|wmv|m4v)(\?|$)/i.test(href)) {
      addFoundVideo(href, 'link', {
        title: link.textContent?.trim() || link.title || '',
        element: '<a>'
      });
    }
  });
}

// --- 6. 递归扫描 Shadow DOM ---
function scanShadowDOM(root) {
  // 扫描当前 root 下的所有元素
  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    // 检查 Shadow Root
    if (el.shadowRoot) {
      scanShadowRoot(el.shadowRoot);
    }
    // 检查 video 元素
    if (el.tagName === 'VIDEO') {
      if (el.src && el.src.startsWith('http')) {
        addFoundVideo(el.src, 'shadow-dom', {
          poster: el.poster || '',
          element: '<video> (Shadow DOM)'
        });
      }
      el.querySelectorAll?.('source').forEach(source => {
        if (source.src && source.src.startsWith('http')) {
          addFoundVideo(source.src, 'shadow-dom', {
            element: '<source> (Shadow DOM)'
          });
        }
      });
    }
  }
}

function scanShadowRoot(shadowRoot) {
  try {
    scanShadowDOM(shadowRoot);
  } catch (e) {
    // Shadow DOM 可能被限制访问
  }
}

// --- 7. 扫描 MSE (Media Source Extensions) ---
function detectMSE() {
  // 劫持 MediaSource.addSourceBuffer 来检测
  const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
  if (originalAddSourceBuffer && !originalAddSourceBuffer._hooked) {
    MediaSource.prototype.addSourceBuffer = function (mimeType) {
      // 记录 MIME 类型，但不添加假 URL
      return originalAddSourceBuffer.call(this, mimeType);
    };
    MediaSource.prototype.addSourceBuffer._hooked = true;
  }
}

// ============================================================
// 主扫描函数
// ============================================================

function scanAll() {
  foundVideos.clear();

  try { scanVideoElements(); } catch (e) { /* continue */ }
  try { scanScriptTags(); } catch (e) { /* continue */ }
  try { scanPlayerInstances(); } catch (e) { /* continue */ }
  try { scanIframes(); } catch (e) { /* continue */ }
  try { scanLinks(); } catch (e) { /* continue */ }
  try { scanShadowDOM(document); } catch (e) { /* continue */ }
  try { detectMSE(); } catch (e) { /* continue */ }

  return Array.from(foundVideos.values());
}

// ============================================================
// 消息处理
// ============================================================

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {

    case 'scanDOM':
      const results = scanAll();
      sendResponse({
        success: true,
        data: results,
        count: results.length,
        pageUrl: location.href,
        pageTitle: document.title
      });
      break;

    case 'ping':
      // 检查 content script 是否已注入
      sendResponse({ success: true, loaded: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return false;
});

// --- 页面加载完成后自动扫描一次 ---
let initialScanDone = false;

function initialScan() {
  if (initialScanDone) return;
  initialScanDone = true;

  const results = scanAll();
  if (results.length > 0) {
    // 通过 background 缓存 DOM 扫描结果
    browserAPI.runtime.sendMessage({
      action: 'cacheDOMVideos',
      data: results
    }).catch(() => {
      // background 可能尚未准备好
    });
  }
}

// 延迟执行，确保页面 JS 播放器已初始化
setTimeout(initialScan, 2000);

// 监听 DOM 变化（延迟再次扫描，捕获动态加载的视频）
let mutationTimeout = null;
const observer = new MutationObserver(() => {
  if (mutationTimeout) clearTimeout(mutationTimeout);
  mutationTimeout = setTimeout(() => {
    const results = scanAll();
    if (results.length > 0) {
      browserAPI.runtime.sendMessage({
        action: 'cacheDOMVideos',
        data: results
      }).catch(() => {});
    }
  }, 1500);
});

try {
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
} catch (e) {
  // 某些页面可能不支持
}

console.log('[Video Extractor] Content script loaded');
