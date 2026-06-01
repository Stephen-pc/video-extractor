# Edge Add-ons Store — 上架清单

## 📦 提交包
直接用 `C:\Users\Steph\Desktop\插件.zip` 上传。

--
## 🏷️ 商店信息

### 名称 (Name)
```
Video Extractor - 视频源提取器
```

### 简短描述 (Short description / Summary)
```
一键检测网页视频源，支持 MP4/M3U8/TS/WebM 等格式的预览与下载。兼容 Chrome / Firefox / Edge。
```

### 详细描述 (Detailed description)

**中文版：**

Video Extractor 是一款轻量级浏览器扩展，帮助您快速检测和提取网页中的视频资源。

**核心功能：**

🎯 双通道智能检测
  · DOM 扫描：自动识别页面中的 <video> 标签、<source> 元素，以及 jwplayer、videojs、DPlayer 等主流播放器配置
  · 网络监控：实时捕获浏览器网络请求中的视频流，包括 .mp4、.m3u8、.ts、.webm、.mkv、.flv 等多种格式

👁️ 即时预览
  · 点击视频条目即可在弹窗中直接预览播放
  · 支持标准 MP4/WebM 格式的内嵌播放

⬇ 一键下载
  · 通过浏览器自带下载管理器保存视频文件
  · 自动识别文件名和格式

📋 快捷操作
  · 一键复制视频地址到剪贴板
  · 页面视频 / 网络捕获双 Tab 切换视图
  · 支持展开查看完整 URL 和文件大小

🔒 隐私安全
  · 所有检测数据仅存储在本地浏览器，绝不上传任何信息
  · 开源透明，代码可在 GitHub 查看

**适用场景：**
  · 在线教育视频下载保存
  · 网页视频素材采集
  · 流媒体地址分析
  · 网站开发者调试视频资源加载

**支持格式：** MP4、M3U8、TS、WebM、MKV、FLV、AVI、MOV、OGG、WMV、M4V、F4V、3GP

---

**English version:**

Video Extractor is a lightweight browser extension that helps you quickly detect and extract video resources from any webpage.

**Key Features:**

🎯 Dual-Channel Detection
  · DOM Scanning: Automatically identifies <video> tags, <source> elements, and popular player configurations (jwplayer, videojs, DPlayer)
  · Network Monitoring: Captures video streams from browser network requests in real-time

👁️ Instant Preview
  · Click any video entry to preview playback in a popup modal
  · Supports inline playback for MP4/WebM formats

⬇ One-Click Download
  · Save video files via the browser's built-in download manager

📋 Quick Actions
  · Copy video URLs to clipboard with one click
  · Dual-tab view: DOM detected / Network captured
  · Expand to view full URL and file size

🔒 Privacy First
  · All detection data stays locally in your browser
  · Open source, code available on GitHub

**Supported formats:** MP4, M3U8, TS, WebM, MKV, FLV, AVI, MOV, OGG, WMV, M4V, F4V, 3GP

### 类别
开发人员工具 (Developer Tools)

### 隐私政策 URL
```
https://github.com/Stephen-pc/video-extractor/blob/main/PRIVACY.md
```
（⚠️ 需要先把代码上传到 GitHub 才能生效，或者你也可以暂时填一个占位 URL）

### 主页 / 支持 URL
```
https://github.com/Stephen-pc/video-extractor
```

--
## 🎨 宣传素材尺寸

| 素材类型 | 尺寸 | 建议内容 |
|----------|------|---------|
| 图标 | 300×300 | icon300.png ✅ 已有 |
| 小磁贴 | 440×280 | 插件 Logo + 名称 |
| 截图 (1~10张) | 1280×800 或 640×400 | 见下方截图说明 |
| 宣传图(可选) | 1400×560 | 功能横幅 |

--
## 📸 截图内容建议

需要 3-5 张截图，展示不同功能：

| 截图 | 内容 | 建议网站 |
|-------|------|---------|
| 截图1 | Popup 主界面 - 页面视频列表 | 任意视频网站 |
| 截图2 | 网络捕获 Tab 视图 | 打开一个有 m3u8 流的视频站 |
| 截图3 | 视频预览弹窗 | 点击预览按钮后 |
| 截图4 | 下载中状态 | 点击下载按钮后 |
| 截图5 | 扩展程序管理页 | chrome://extensions |

（⚠️ 截图需要你手动截取——在 Chrome 浏览器中打开视频网站，点击扩展图标，用 Win+Shift+S 截图，保存为 PNG）

--
## 🔍 提交前自检清单

- [ ] manifest.json 中的 version 已确认
- [ ] icon300.png 已上传到商店图标位
- [ ] 3-5 张截图已准备好
- [ ] 隐私政策 URL 可访问
- [ ] 权限已声明并由合理用途解释
- [ ] 扩展包 .zip 已就绪

--
## 📤 提交流程

1. 打开 https://partner.microsoft.com/ → 登录 Outlook 账号
2. 左侧菜单 → "Extensions" → "Create new extension"
3. 上传 `插件.zip`
4. 填写上面准备好的商店信息
5. 上传图标 (icon300.png) 和截图
6. 填写隐私政策 URL
7. 提交审核 → 通常 1-3 个工作日
