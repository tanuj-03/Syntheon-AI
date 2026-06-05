# Syntheon AI Browser Extension

A Chrome browser extension that provides AI-powered meeting recording and transcription for Google Meet, Zoom, and Microsoft Teams.

## Features

- 🎥 **Screen Recording**: Record video and audio from supported meeting platforms
- 🔄 **Platform Support**: Works with Google Meet, Zoom, and Microsoft Teams
- 📊 **Meeting Detection**: Automatically detects when you're in a meeting
- 💾 **Local Storage**: Saves recordings locally with metadata
- 📈 **Statistics**: Track total recordings and duration
- 🎨 **Modern UI**: Clean, intuitive popup interface

## Installation

### Development

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `syntheon-extension` directory
5. The extension should now appear in your browser toolbar

### Production

Package the extension and publish to the Chrome Web Store.

## Usage

1. Navigate to a supported meeting platform (Google Meet, Zoom, or Teams)
2. Click the Syntheon AI extension icon in your browser toolbar
3. Click "Start Recording" to begin recording the meeting
4. Click "Stop Recording" when finished
5. Access your recordings and statistics from the popup

## File Structure

```
syntheon-extension/
├── manifest.json          # Extension configuration and permissions
├── background.js          # Service worker for recording logic
├── content.js             # Script injected into meeting pages
├── popup/
│   ├── popup.html         # Popup interface HTML
│   ├── popup.js           # Popup functionality
│   └── popup.css          # Popup styling
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── README.md
└── README.md              # This file
```

## Technical Details

### Permissions

- `activeTab`: Access to the currently active tab
- `tabCapture`: Record screen and audio content
- `storage`: Store recordings and settings locally
- `scripting`: Inject content scripts into web pages

### Supported Platforms

- **Google Meet**: `https://meet.google.com/*`
- **Zoom**: `https://zoom.us/*`
- **Microsoft Teams**: `https://teams.microsoft.com/*`

### Recording Process

1. User clicks "Start Recording" in the popup
2. Background script captures tab audio/video using `tabCapture`
3. MediaRecorder saves the stream as WebM video
4. Recording is stored in Chrome's local storage
5. Content script shows recording indicator on the page

## Development

### Building

The extension uses vanilla JavaScript with no build process required. Simply modify the files and reload the extension in Chrome.

### Debugging

- **Background Script**: Open `chrome://extensions/`, find the extension, and click "Service worker" to open DevTools
- **Popup**: Right-click the popup and select "Inspect"
- **Content Script**: Open DevTools on the target meeting page and check the Console

### Testing

Test the extension on each supported platform:

1. Open a meeting on Google Meet, Zoom, or Teams
2. Verify the meeting is detected
3. Test recording functionality
4. Check that recordings are saved properly
5. Verify UI updates correctly

## Security & Privacy

- All recordings are stored locally in Chrome storage
- No data is sent to external servers without user consent
- Extension only accesses supported meeting domains
- Users have full control over recording start/stop

## Future Enhancements

- [ ] Cloud storage integration
- [ ] Real-time transcription
- [ ] AI meeting summaries
- [ ] Calendar integration
- [ ] Multi-language support
- [ ] Recording quality settings

## License

[Your License Here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on all supported platforms
5. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issue tracker.
