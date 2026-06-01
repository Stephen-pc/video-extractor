"""Take screenshots of the Video Extractor popup demo for Edge Store listing."""
from playwright.sync_api import sync_playwright
import os

DEMO_PATH = "C:/Users/Steph/Desktop/插件/screenshots/demo1-popup.html"
OUT_DIR = "C:/Users/Steph/Desktop/插件/screenshots"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 420, "height": 680},
            device_scale_factor=2,
        )

        # --- Screenshot 1: Main popup with DOM tab ---
        page.goto(f"file:///{DEMO_PATH}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)

        # Hide toast for clean main screenshot
        page.evaluate("""() => {
            const toast = document.querySelector('.toast');
            if (toast) toast.style.display = 'none';
        }""")
        page.wait_for_timeout(200)

        out1 = os.path.join(OUT_DIR, "screenshot1-main.png")
        page.screenshot(path=out1, full_page=True)
        print(f"✅ Saved: {out1}")

        # --- Screenshot 2: Item expanded showing preview area ---
        # Item 4 is already expanded in the HTML, scroll to it
        page.evaluate("""() => {
            const expanded = document.querySelector('.video-item.expanded');
            if (expanded) expanded.scrollIntoView({ block: 'center' });
        }""")
        page.wait_for_timeout(300)

        out2 = os.path.join(OUT_DIR, "screenshot2-preview.png")
        page.screenshot(path=out2, full_page=True)
        print(f"✅ Saved: {out2}")

        # --- Screenshot 3: Network tab ---
        # Click the network tab
        page.evaluate("""() => {
            const tabs = document.querySelectorAll('.tab');
            const netTab = tabs[1]; // second tab = network
            if (netTab) netTab.click();

            // Update badge numbers to simulate network data
            const domBadge = document.querySelector('.tab:nth-child(1) .tab-badge');
            const netBadge = document.querySelector('.tab:nth-child(2) .tab-badge');
            if (domBadge) domBadge.textContent = '5';
            if (netBadge) netBadge.textContent = '8';

            // Update tab active states
            tabs[0].classList.remove('active');
            tabs[1].classList.add('active');

            // Replace video list with network-style entries
            const list = document.querySelector('.video-list');
            if (list) {
                list.innerHTML = `
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">📡</span>
    <div class="video-item-info">
      <div class="video-item-title">live-hls-stream-1080p.m3u8</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag m3u8">M3U8</span>
        <span class="video-size">—</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">🎬</span>
    <div class="video-item-info">
      <div class="video-item-title">https://cdn.videos.com/chunk_001.ts</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag">TS</span>
        <span class="video-size">2.1 MB</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">🌐</span>
    <div class="video-item-info">
      <div class="video-item-title">dash-video-4k-30fps.webm</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag">WebM</span>
        <span class="video-size">892.4 MB</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">🎬</span>
    <div class="video-item-info">
      <div class="video-item-title">video-segment-045.flv</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag">FLV</span>
        <span class="video-size">15.8 MB</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">📡</span>
    <div class="video-item-info">
      <div class="video-item-title">stream-backup-720p.m3u8</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag m3u8">M3U8</span>
        <span class="video-size">—</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">🍎</span>
    <div class="video-item-info">
      <div class="video-item-title">quicktime-sample-h264.mov</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag">MOV</span>
        <span class="video-size">45.2 MB</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">🎥</span>
    <div class="video-item-info">
      <div class="video-item-title">movie-clip-1080p-30fps.avi</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag">AVI</span>
        <span class="video-size">1.8 GB</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>
<div class="video-item">
  <div class="video-item-header">
    <span class="video-item-icon">🎬</span>
    <div class="video-item-info">
      <div class="video-item-title">cdn-origin-stream-4k.mp4</div>
      <div class="video-item-meta">
        <span class="video-tag network">NET</span>
        <span class="video-tag">MP4</span>
        <span class="video-size">3.2 GB</span>
      </div>
    </div>
    <div class="video-item-actions">
      <button class="btn btn-sm">📋</button>
      <button class="btn btn-sm">▶️</button>
      <button class="btn btn-sm btn-success">⬇</button>
    </div>
  </div>
</div>`;
            }
        }""")
        page.wait_for_timeout(300)

        out3 = os.path.join(OUT_DIR, "screenshot3-network.png")
        page.screenshot(path=out3, full_page=True)
        print(f"✅ Saved: {out3}")

        browser.close()
        print("\n🎉 All screenshots taken!")

if __name__ == "__main__":
    run()
