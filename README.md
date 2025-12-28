# YouTube → Notes

> **Language**: English | [한국어 (Korean)](README.ko.md)

A Chrome extension to efficiently manage YouTube video notes and information.

## Key Features

- ✅ **Auto-extract YouTube info**: Automatically saves video title, publish time, and URL
- ✅ **Smart tag management**: Quickly add tags via existing tag buttons
- ✅ **Save personal notes**: Record your thoughts for each video
- ✅ **Tag filtering**: Search notes by specific tags
- ✅ **CSV export**: Download all notes as `youtube_notes.csv`
- ✅ **Offline storage**: Safely stored in local storage
- ✅ **Personal Supabase sync**: Use your own free Supabase project for more storage and reliable sync

## Personal Database Setup (Optional)

If you want your own dedicated database for more storage and better control:

1. Follow the guide in [SUPABASE_SETUP.en.md](SUPABASE_SETUP.en.md) (English) or [SUPABASE_SETUP.md](SUPABASE_SETUP.md) (Korean)
2. Create a Supabase project and database
3. Configure Settings in the extension with your Supabase URL and API key
4. Enjoy increased storage capacity on the free tier!

## Installation

### Testing in Development Mode

1. Clone this folder to `C:\code\youtube_notes_chrome_extension`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" toggle in the top-right
4. Click "Load unpacked"
5. Select this folder

### Chrome Web Store Installation (After Publication)

Search for "YouTube → Notes" in the Chrome Web Store and install.

## How to Use

1. Click the extension icon on a YouTube video page
2. Select or enter tags (click existing tag buttons for quick add)
3. Write your personal notes
4. Click "Save"
5. View title, publish time, and tags in the list
6. Filter by clicking specific tags
7. Export all notes by clicking "Download CSV"

## File Structure

```
youtube_notes_chrome_extension/
├── manifest.json          # Extension configuration
├── popup.html            # Popup UI
├── popup.js              # Popup logic (save, render, filter, CSV)
├── options.html          # Settings page
├── options.js            # Settings logic
├── background.js         # Background service worker
├── content_script.js     # Content script (unused)
├── supabase.js           # Supabase sync helpers
├── google_auth.js        # Google authentication
├── debug_logger.js       # Debug logging utility
├── images/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── generate_icons.html   # Icon generation tool
└── README.md             # This file
```

## Data Storage

- **Local storage** (`chrome.storage.local`): All notes stored locally
- **Sync storage** (`chrome.storage.sync`): Tag list and settings
- **Supabase (optional)**: Personal database for cloud sync and backup

## Development & Modification

After editing JavaScript files, click the refresh button on the Chrome extensions page to apply changes.

## License

MIT License

## Contributing

Issues and pull requests are always welcome.
