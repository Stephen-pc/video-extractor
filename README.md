# 🎬 Video Extractor

多浏览器兼容的浏览器扩展，用于检测和提取网页中的视频源，支持预览和下载。

## 功能

- **双通道检测**：DOM 扫描（`<video>` 标签、播放器配置）+ 网络请求监控
- **🎯 广泛覆盖**：支持 MP4、M3U8、TS、WebM、MKV、FLV 等格式
- **👁️ 视频预览**：点击即可在弹窗中预览视频
- **⬇ 一键下载**：通过浏览器下载管理器保存视频
- **📋 复制地址**：快速复制视频 URL 到剪贴板
- **🏷️ 智能识别**：自动识别 jwplayer、videojs、DPlayer 等常见播放器

## 安装

### Chrome / Edge

1. 打开 `chrome://extensions`（Edge: `edge://extensions`）
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `video-extractor` 文件夹

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择 `video-extractor/manifest.json`

## 使用

1. 打开任意包含视频的网页
2. 点击工具栏中的 🎬 图标打开 popup
3. 切换「页面视频」/「网络捕获」标签查看检测结果
4. 点击视频条目展开详情，可预览、复制或下载

## 项目结构

```
video-extractor/
├── manifest.json            # MV3 清单（Chrome/Firefox/Edge 兼容）
├── background/
│   └── background.js        # Service Worker：网络请求监控
├── content/
│   └── content.js           # Content Script：DOM 视频扫描
├── popup/
│   ├── popup.html           # 弹出窗口
│   ├── popup.css            # 样式
│   └── popup.js             # 交互逻辑
├── icons/                   # 扩展图标
└── generate-icons.js        # 图标生成脚本
```

## 技术栈

- **Manifest V3** 标准
- 原生 JavaScript / HTML / CSS
- 跨浏览器兼容（Chrome / Firefox / Edge）

## 权限说明

| 权限 | 用途 |
|------|------|
| `webRequest` | 监控网络请求，捕获视频 URL |
| `downloads` | 下载视频文件 |
| `activeTab` | 访问当前标签页进行 DOM 扫描 |
| `storage` | 缓存设置 |
| `scripting` | Content script 注入 |

## License

MIT
