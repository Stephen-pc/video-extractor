// generate-icons.js
// 纯 Node.js 生成专业级 PNG 图标（超采样抗锯齿）
// 运行: node generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, 'icons');
const SUPERSAMPLE = 4; // 4x 超采样

// ============================================================
// PNG 编码
// ============================================================

function crc32(buf) {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function writePNG(filepath, w, h, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter none
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4;
      const dst = y * (1 + w * 4) + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw);
  const png = Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filepath, png);
}

// ============================================================
// 绘图工具
// ============================================================

function rgba(r, g, b, a = 255) {
  return [r, g, b, a];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
    Math.round(lerp(c1[3], c2[3], t)),
  ];
}

function blend(bg, fg) {
  const alpha = fg[3] / 255;
  return [
    Math.round(lerp(bg[0], fg[0], alpha)),
    Math.round(lerp(bg[1], fg[1], alpha)),
    Math.round(lerp(bg[2], fg[2], alpha)),
    255,
  ];
}

function setPixel(pixels, w, x, y, color) {
  const i = (y * w + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

function getPixel(pixels, w, x, y) {
  const i = (y * w + x) * 4;
  return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
}

// --- 超采样：渲染到 4x 画布，再降采样 ---
function downsample(hiRes, hiW, hiH, outW, outH) {
  const out = new Uint8Array(outW * outH * 4);
  const scale = hiW / outW;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const sx = Math.floor(x * scale);
      const sy = Math.floor(y * scale);
      const ex = Math.floor((x + 1) * scale);
      const ey = Math.floor((y + 1) * scale);
      let count = 0;
      for (let sy2 = sy; sy2 < ey; sy2++) {
        for (let sx2 = sx; sx2 < ex; sx2++) {
          const p = (sy2 * hiW + sx2) * 4;
          r += hiRes[p];
          g += hiRes[p + 1];
          b += hiRes[p + 2];
          a += hiRes[p + 3];
          count++;
        }
      }
      const o = (y * outW + x) * 4;
      out[o] = Math.round(r / count);
      out[o + 1] = Math.round(g / count);
      out[o + 2] = Math.round(b / count);
      out[o + 3] = Math.round(a / count);
    }
  }
  return out;
}

// --- 圆角矩形遮罩 ---
function roundedRectMask(w, h, radius) {
  const mask = new Uint8Array(w * h);
  const r = Math.min(radius, w / 2, h / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = true;
      // 四个角
      if (x < r && y < r) {
        inside = (x - r) ** 2 + (y - r) ** 2 <= r ** 2;
      } else if (x >= w - r && y < r) {
        inside = (x - (w - 1 - r)) ** 2 + (y - r) ** 2 <= r ** 2;
      } else if (x < r && y >= h - r) {
        inside = (x - r) ** 2 + (y - (h - 1 - r)) ** 2 <= r ** 2;
      } else if (x >= w - r && y >= h - r) {
        inside = (x - (w - 1 - r)) ** 2 + (y - (h - 1 - r)) ** 2 <= r ** 2;
      }
      mask[y * w + x] = inside ? 255 : 0;
    }
  }
  return mask;
}

// ============================================================
// 图标设计
// ============================================================

function drawIcon(size) {
  const w = size;
  const h = size;

  // 颜色方案
  const BG_TOP = [99, 102, 241, 255];      // indigo-500
  const BG_BOTTOM = [37, 99, 235, 255];     // blue-600
  const FG = [255, 255, 255, 255];          // white
  const ACCENT = [251, 191, 36, 255];        // amber-400
  const SHADOW = [0, 0, 0, 40];             // subtle shadow

  const pixels = new Uint8Array(w * h * 4);
  const radius = Math.round(w * 0.22);       // 圆角比例
  const mask = roundedRectMask(w, h, radius);

  // --- 1. 背景渐变 ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const m = mask[y * w + x] / 255;
      if (m > 0) {
        const t = y / (h - 1);
        // 添加微妙的径向高光
        const dx = (x / w - 0.5) * 2;
        const dy = (y / h - 0.5) * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const highlight = 1 - dist * 0.25;
        const tAdj = Math.max(0, Math.min(1, t * 0.85 + (1 - highlight) * 0.15));

        const bg = lerpColor(BG_TOP, BG_BOTTOM, tAdj);
        bg[3] = Math.round(255 * m);
        setPixel(pixels, w, x, y, bg);
      } else {
        setPixel(pixels, w, x, y, [0, 0, 0, 0]);
      }
    }
  }

  // --- 2. 内阴影效果（边缘加深） ---
  const innerShadow = new Uint8Array(w * h);
  const blurRadius = Math.max(1, Math.round(w * 0.03));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 0) {
        // 检查是否接近边缘
        let nearEdge = false;
        for (let dy = -blurRadius; dy <= blurRadius && !nearEdge; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius && !nearEdge; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx] === 0) {
              nearEdge = true;
            }
          }
        }
        innerShadow[y * w + x] = nearEdge ? 40 : 0;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = innerShadow[y * w + x];
      if (s > 0) {
        const bg = getPixel(pixels, w, x, y);
        const blended = blend(bg, [0, 0, 0, s]);
        setPixel(pixels, w, x, y, blended);
      }
    }
  }

  // --- 3. 绘制播放三角形 ---
  const cx = w * 0.5;
  const cy = h * 0.48;
  const triScale = w * 0.25;

  // 三角形顶点（稍微圆润的等边三角形，偏右以视觉平衡）
  const triPoints = [
    { x: cx - triScale * 0.5, y: cy - triScale * 0.75 },  // 左上
    { x: cx - triScale * 0.5, y: cy + triScale * 0.75 },  // 左下
    { x: cx + triScale * 0.7, y: cy },                     // 右顶点
  ];

  // 带抗锯齿的三角形光栅化
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 计算到三角形边缘的距离（用于软边缘）
      const d = signedDistToTriangle(x + 0.5, y + 0.5, triPoints);
      if (d < 1.5) {
        const alpha = d < 0 ? 255 : Math.round(255 * (1 - d / 1.5));
        const bg = getPixel(pixels, w, x, y);
        const fgColor = [...FG];
        fgColor[3] = alpha;
        const blended = blend(bg, fgColor);
        setPixel(pixels, w, x, y, blended);
      }
    }
  }

  // --- 4. 底部下载箭头（小装饰） ---
  const arrowCX = w * 0.68;
  const arrowCY = h * 0.72;
  const arrowSize = w * 0.14;

  // 下载箭头主体（竖线 + 向下的箭头尖）
  const arrowPoints = [
    { x: arrowCX, y: arrowCY - arrowSize * 0.9 },              // 顶部
    { x: arrowCX, y: arrowCY + arrowSize * 0.6 },              // 底部尖端上方
    { x: arrowCX - arrowSize * 0.65, y: arrowCY + arrowSize * 0.05 }, // 左翼
    { x: arrowCX + arrowSize * 0.65, y: arrowCY + arrowSize * 0.05 }, // 右翼
  ];

  // 绘制箭头作为线条组合
  drawThickLine(pixels, w, h,
    arrowCX, arrowCY - arrowSize * 0.85,
    arrowCX, arrowCY + arrowSize * 0.55,
    w * 0.045, ACCENT);

  // 箭头尖
  const tipPts = [
    { x: arrowCX - arrowSize * 0.55, y: arrowCY + arrowSize * 0.05 },
    { x: arrowCX + arrowSize * 0.55, y: arrowCY + arrowSize * 0.05 },
    { x: arrowCX, y: arrowCY + arrowSize * 0.7 },
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = signedDistToTriangle(x + 0.5, y + 0.5, tipPts);
      if (d < 1.0) {
        const alpha = d < 0 ? 255 : Math.round(255 * (1 - d));
        const bg = getPixel(pixels, w, x, y);
        const ac = [...ACCENT];
        ac[3] = alpha;
        setPixel(pixels, w, x, y, blend(bg, ac));
      }
    }
  }

  // --- 5. 顶部光泽（玻璃效果高光） ---
  const highlightAlpha = 50;
  const highlightH = Math.round(h * 0.35);
  for (let y = 0; y < highlightH; y++) {
    const alpha = Math.round(highlightAlpha * (1 - y / highlightH) * (1 - y / highlightH));
    for (let x = 0; x < w; x++) {
      const m = mask[y * w + x];
      if (m > 0) {
        // 只在椭圆区域加高光
        const dx = (x - w / 2) / (w * 0.42);
        const dy = (y - highlightH * 0.4) / (highlightH * 0.45);
        if (dx * dx + dy * dy < 1) {
          const bg = getPixel(pixels, w, x, y);
          setPixel(pixels, w, x, y, blend(bg, [255, 255, 255, alpha]));
        }
      }
    }
  }

  return pixels;
}

// ============================================================
// 几何工具
// ============================================================

function signedDistToTriangle(px, py, pts) {
  const d1 = cross2D(px - pts[1].x, py - pts[1].y, pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  const d2 = cross2D(px - pts[2].x, py - pts[2].y, pts[1].x - pts[2].x, pts[1].y - pts[2].y);
  const d3 = cross2D(px - pts[0].x, py - pts[0].y, pts[2].x - pts[0].x, pts[2].y - pts[0].y);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  if (!(hasNeg && hasPos)) {
    // 点在三角形内部，返回到最近边的负距离
    return -Math.min(
      distToSegment(px, py, pts[0], pts[1]),
      distToSegment(px, py, pts[1], pts[2]),
      distToSegment(px, py, pts[2], pts[0])
    );
  }
  // 点在外部，返回到最近边的距离
  return Math.min(
    distToSegment(px, py, pts[0], pts[1]),
    distToSegment(px, py, pts[1], pts[2]),
    distToSegment(px, py, pts[2], pts[0])
  );
}

function cross2D(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - a.x, py - a.y);
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function drawThickLine(pixels, w, h, x1, y1, x2, y2, thickness, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const nx = -dy / len;
  const ny = dx / len;
  const halfT = thickness / 2;

  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - halfT - 1));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(x1, x2) + halfT + 1));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - halfT - 1));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(y1, y2) + halfT + 1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = distToSegment(x + 0.5, y + 0.5,
        { x: x1, y: y1 }, { x: x2, y: y2 });
      if (d < halfT + 1) {
        let alpha;
        if (d < halfT - 0.5) alpha = 255;
        else alpha = Math.round(255 * (1 - (d - (halfT - 0.5))));
        alpha = Math.min(255, Math.max(0, alpha));

        const bg = getPixel(pixels, w, x, y);
        const c = [...color];
        c[3] = alpha;
        setPixel(pixels, w, x, y, blend(bg, c));
      }
    }
  }
}

// ============================================================
// 生成
// ============================================================

const TARGET_SIZES = [16, 32, 48, 128, 300];

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

console.log('🎨 Generating icons with supersampling...\n');

TARGET_SIZES.forEach(targetSize => {
  const hiSize = targetSize * SUPERSAMPLE;
  const hiRes = drawIcon(hiSize);
  const finalPixels = downsample(hiRes, hiSize, hiSize, targetSize, targetSize);

  const filepath = path.join(ICONS_DIR, `icon${targetSize}.png`);
  writePNG(filepath, targetSize, targetSize, finalPixels);
  console.log(`  ✅ icon${targetSize}.png  (${targetSize}×${targetSize})`);
});

console.log('\n🎉 All icons generated! Ready for Edge Store.');
