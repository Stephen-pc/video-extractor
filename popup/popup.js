// ============================================================
// Video Extractor — Popup Script
// 功能：展示视频列表、预览、下载
// ============================================================

// --- 跨浏览器 API 兼容 ---
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// --- 状态 ---
const state = {
  activeTab: 'dom',         // 'dom' | 'network'
  domVideos: [],
  networkVideos: [],
  currentTabId: null,
  previewVideoUrl: null,
  scanTimer: null,
};

// --- DOM 引用 ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  btnRefresh: $('#btnRefresh'),
  btnClear: $('#btnClear'),
  tabs: $$('.tab'),
  domCount: $('#domCount'),
  networkCount: $('#networkCount'),
  videoList: $('#videoList'),
  loadingState: $('#loadingState'),
  emptyState: $('#emptyState'),
  errorState: $('#errorState'),
  errorMessage: $('#errorMessage'),
  previewModal: $('#previewModal'),
  previewPlayer: $('#previewPlayer'),
  previewTitle: $('#previewTitle'),
  previewUrl: $('#previewUrl'),
  btnClosePreview: $('#btnClosePreview'),
  btnCopyFromPreview: $('#btnCopyFromPreview'),
  btnDownloadFromPreview: $('#btnDownloadFromPreview'),
  toast: $('#toast'),
};

// ============================================================
// 初始化
// ============================================================

async function init() {
  // 获取当前标签页
  try {
    const tab = await getCurrentTab();
    state.currentTabId = tab?.id || null;
  } catch (e) {
    console.warn('Failed to get current tab:', e);
  }

  // 绑定事件
  dom.btnRefresh.addEventListener('click', refreshAll);
  dom.btnClear.addEventListener('click', clearAll);
  dom.btnClosePreview.addEventListener('click', closePreview);
  dom.btnCopyFromPreview.addEventListener('click', () => copyUrl(state.previewVideoUrl));
  dom.btnDownloadFromPreview.addEventListener('click', () => downloadVideo(state.previewVideoUrl));
  dom.previewModal.querySelector('.modal-backdrop').addEventListener('click', closePreview);

  // Tab 切换
  dom.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 键盘关闭预览
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });

  // 开始扫描
  await refreshAll();
}

// --- 获取当前标签页 ---
function getCurrentTab() {
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

// ============================================================
// 数据获取
// ============================================================

async function refreshAll() {
  showLoading();

  try {
    // 并行：DOM 扫描 + 获取网络缓存
    const [domResult, networkResult] = await Promise.allSettled([
      scanDOM(),
      getNetworkVideos(),
    ]);

    state.domVideos = domResult.status === 'fulfilled' ? domResult.value : [];
    state.networkVideos = networkResult.status === 'fulfilled' ? networkResult.value : [];

    updateCounts();
    renderVideoList();
  } catch (e) {
    showError(e.message || '扫描失败，请重试');
  }
}

// --- DOM 扫描 ---
async function scanDOM() {
  if (!state.currentTabId) return [];

  return new Promise((resolve) => {
    browserAPI.tabs.sendMessage(
      state.currentTabId,
      { action: 'scanDOM' },
      (response) => {
        if (browserAPI.runtime.lastError) {
          // Content script 可能未注入（如 chrome:// 页面）
          console.warn('DOM scan failed:', browserAPI.runtime.lastError.message);
          resolve([]);
          return;
        }
        resolve(response?.data || []);
      }
    );
  });
}

// --- 获取网络捕获视频 ---
async function getNetworkVideos() {
  return new Promise((resolve) => {
    browserAPI.runtime.sendMessage(
      { action: 'getNetworkVideos', tabId: state.currentTabId },
      (response) => {
        if (browserAPI.runtime.lastError) {
          resolve([]);
          return;
        }
        resolve(response?.data || []);
      }
    );
  });
}

// ============================================================
// 渲染
// ============================================================

function updateCounts() {
  dom.domCount.textContent = state.domVideos.length;
  dom.networkCount.textContent = state.networkVideos.length;
}

function getCurrentVideos() {
  return state.activeTab === 'dom' ? state.domVideos : state.networkVideos;
}

function renderVideoList() {
  const videos = getCurrentVideos();

  if (videos.length === 0) {
    showEmpty();
    return;
  }

  hideAllStates();
  dom.videoList.classList.remove('hidden');

  dom.videoList.innerHTML = videos.map((video, index) => {
    const ext = (video.ext || '').toLowerCase();
    const tagClass = video.type === 'network' ? 'network' : 'dom';
    const typeLabel = video.type === 'network' ? 'NET' : (video.source || 'DOM');
    const sizeStr = video.size ? formatSize(video.size) : '';
    const icon = getFileIcon(ext);
    const title = video.title || extractFilename(video.url);

    return `
      <div class="video-item" data-index="${index}" data-url="${escapeHtml(video.url)}">
        <div class="video-item-header" data-action="toggle">
          <span class="video-item-icon">${icon}</span>
          <div class="video-item-info">
            <div class="video-item-title">${escapeHtml(title)}</div>
            <div class="video-item-meta">
              <span class="video-tag ${tagClass}">${typeLabel}</span>
              ${ext ? `<span class="video-tag ${ext === 'm3u8' ? 'm3u8' : ''}">${ext.toUpperCase()}</span>` : ''}
              ${sizeStr ? `<span class="video-size">${sizeStr}</span>` : ''}
            </div>
          </div>
          <div class="video-item-actions">
            <button class="btn btn-sm" data-action="copy" title="复制地址">📋</button>
            <button class="btn btn-sm" data-action="preview" title="预览">▶️</button>
            <button class="btn btn-sm btn-success" data-action="download" title="下载">⬇</button>
          </div>
        </div>
        <div class="video-item-detail">
          <div class="video-url-full">${escapeHtml(video.url)}</div>
          ${ext !== 'm3u8' ? `<video src="${escapeHtml(video.url)}" controls preload="metadata"></video>` : '<p style="font-size:11px;color:#999;">⚠️ M3U8 流媒体需要 HLS 播放器支持</p>'}
        </div>
      </div>
    `;
  }).join('');

  // 绑定事件（事件委托）
  dom.videoList.addEventListener('click', handleVideoItemClick);
}

function handleVideoItemClick(e) {
  const item = e.target.closest('.video-item');
  if (!item) return;

  const url = item.dataset.url;
  const action = e.target.closest('[data-action]')?.dataset.action;

  switch (action) {
    case 'copy':
      e.stopPropagation();
      copyUrl(url);
      break;
    case 'preview':
      e.stopPropagation();
      openPreview(url);
      break;
    case 'download':
      e.stopPropagation();
      downloadVideo(url);
      break;
    case 'toggle':
    default:
      // 展开/折叠
      item.classList.toggle('expanded');
      break;
  }
}

// ============================================================
// 预览
// ============================================================

function openPreview(url) {
  state.previewVideoUrl = url;
  dom.previewPlayer.src = url;
  dom.previewTitle.textContent = extractFilename(url);
  dom.previewUrl.textContent = url;
  dom.previewModal.classList.remove('hidden');
}

function closePreview() {
  dom.previewModal.classList.add('hidden');
  dom.previewPlayer.pause();
  dom.previewPlayer.src = '';
  state.previewVideoUrl = null;
}

// ============================================================
// 操作
// ============================================================

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('✅ 已复制到剪贴板');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('✅ 已复制到剪贴板');
  });
}

function downloadVideo(url) {
  const filename = extractFilename(url);

  browserAPI.runtime.sendMessage(
    {
      action: 'downloadVideo',
      url,
      filename,
      saveAs: true
    },
    (response) => {
      if (browserAPI.runtime.lastError) {
        showToast('❌ 下载失败: ' + browserAPI.runtime.lastError.message, 'error');
        return;
      }
      if (response?.success) {
        showToast('⬇ 开始下载...');
      } else {
        showToast('❌ 下载失败: ' + (response?.error || '未知错误'), 'error');
      }
    }
  );
}

function clearAll() {
  if (state.activeTab === 'network') {
    browserAPI.runtime.sendMessage(
      { action: 'clearTabVideos', tabId: state.currentTabId },
      () => {
        state.networkVideos = [];
        updateCounts();
        renderVideoList();
        showToast('🗑️ 已清空网络缓存');
      }
    );
  } else {
    state.domVideos = [];
    updateCounts();
    renderVideoList();
    showToast('🗑️ 已清空列表');
  }
}

// ============================================================
// Tab 切换
// ============================================================

function switchTab(tabName) {
  state.activeTab = tabName;

  dom.tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  renderVideoList();
}

// ============================================================
// UI 状态
// ============================================================

function showLoading() {
  hideAllStates();
  dom.loadingState.classList.remove('hidden');
}

function showEmpty() {
  hideAllStates();
  dom.emptyState.classList.remove('hidden');
}

function showError(message) {
  hideAllStates();
  dom.errorMessage.textContent = message;
  dom.errorState.classList.remove('hidden');
}

function hideAllStates() {
  dom.loadingState.classList.add('hidden');
  dom.emptyState.classList.add('hidden');
  dom.errorState.classList.add('hidden');
  dom.videoList.classList.add('hidden');
}

function showToast(message, type = 'success') {
  dom.toast.textContent = message;
  dom.toast.className = `toast ${type}`;
  dom.toast.classList.remove('hidden');

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    dom.toast.classList.add('hidden');
  }, 2000);
}

// ============================================================
// 工具函数
// ============================================================

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileIcon(ext) {
  switch (ext) {
    case 'mp4': return '🎬';
    case 'm3u8': return '📡';
    case 'ts': return '📦';
    case 'webm': return '🌐';
    case 'mkv': return '📀';
    case 'flv': return '📹';
    case 'avi': return '🎥';
    case 'mov': return '🍎';
    default: return '🎬';
  }
}

function extractFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop();
    return decodeURIComponent(name) || url;
  } catch {
    return url.split('/').pop() || url;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// 启动
// ============================================================

document.addEventListener('DOMContentLoaded', init);
