# Privacy Policy for Video Extractor

**Last updated: 2026-05-31**

## Data Collection

Video Extractor **does NOT** collect, store, or transmit any personal information or browsing data to external servers.

### What happens locally on your device:

1. **Web Request Monitoring**: The extension monitors network requests within your browser to detect video URLs (MP4, M3U8, TS, WebM, etc.). This data stays entirely within your browser and is only used to populate the extension popup.

2. **DOM Scanning**: The extension scans the current webpage's DOM for `<video>` elements and player configurations. This data never leaves your browser.

3. **Local Storage**: Detected video URLs are temporarily cached in the extension's local storage for display purposes only. This cache is cleared when you close the tab or click "Clear".

### What we DO NOT do:

- ❌ No analytics or tracking
- ❌ No data sent to external servers
- ❌ No cookies or fingerprinting
- ❌ No personal information collected
- ❌ No browsing history recorded

## Permissions Explained

| Permission | Purpose |
|-----------|---------|
| `webRequest` | Detect video network requests locally |
| `downloads` | Trigger browser download when you click "Download" |
| `activeTab` | Access current tab to scan for video elements |
| `storage` | Cache video list in memory |
| `scripting` | Enable content script injection |

## Third-Party Services

This extension does not integrate with any third-party services, analytics, or external APIs.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.

## Changes

Any changes to this policy will be reflected in an updated version of this document.
