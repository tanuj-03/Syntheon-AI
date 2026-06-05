// content.js — Syntheon AI Meeting Assistant

class SyntheonContentScript {
  constructor() {
    this.platform = this.detectPlatform();
    this.isRecording = false;
    this.meetingDetected = false;
    this.init();
  }

  detectPlatform() {
    const url = window.location.href;
    if (url.includes('meet.google.com')) return 'google-meet';
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('teams.microsoft.com')) return 'teams';
    return 'unknown';
  }

  init() {
    console.log(`Syntheon AI loaded on ${this.platform}`);
    this.addMeetingUI();
    this.setupMeetingDetection();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
      return true; // keep message channel open for async sendResponse
    });
  }

  handleMessage(request, sendResponse) {
    switch (request.action) {
      case 'recordingStarted':
        this.onRecordingStarted();
        sendResponse({ success: true });
        break;

      case 'recordingStopped':
        this.onRecordingStopped();
        sendResponse({ success: true });
        break;

      case 'getMeetingInfo':
        sendResponse(this.getMeetingInfo());
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  onRecordingStarted() {
    this.isRecording = true;
    this.showRecordingIndicator();
  }

  onRecordingStopped() {
    this.isRecording = false;
    this.hideRecordingIndicator();
  }

  // ─── Floating Recording Indicator ──────────────────────────
  addMeetingUI() {
    // Inject keyframe animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes syntheon-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: 0.5; transform: scale(0.85); }
      }
      @keyframes syntheon-fadein {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #syntheon-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3d5a3e;
        color: #eaf2e8;
        padding: 8px 16px 8px 12px;
        border-radius: 20px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.02em;
        z-index: 2147483647;
        display: none;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 16px rgba(61, 90, 62, 0.35);
        border: 1px solid rgba(138, 171, 126, 0.3);
        animation: syntheon-fadein 0.25s ease;
      }
      #syntheon-indicator-dot {
        width: 7px;
        height: 7px;
        background: #c0534a;
        border-radius: 50%;
        animation: syntheon-pulse 1.4s ease-in-out infinite;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);

    const indicator = document.createElement('div');
    indicator.id = 'syntheon-indicator';
    indicator.innerHTML = `
      <div id="syntheon-indicator-dot"></div>
      <span>Syntheon recording</span>
    `;
    document.body.appendChild(indicator);
  }

  showRecordingIndicator() {
    const el = document.getElementById('syntheon-indicator');
    if (el) el.style.display = 'flex';
  }

  hideRecordingIndicator() {
    const el = document.getElementById('syntheon-indicator');
    if (el) el.style.display = 'none';
  }

  // ─── Meeting Detection ──────────────────────────────────────
  setupMeetingDetection() {
    switch (this.platform) {
      case 'google-meet':
        this.detectGoogleMeetState();
        break;
      case 'zoom':
        this.detectZoomState();
        break;
      case 'teams':
        this.detectTeamsState();
        break;
    }
  }

  detectGoogleMeetState() {
    const observer = new MutationObserver(() => {
      // Meet adds a [data-meeting-id] attr when the call is live
      if (document.querySelector('[data-meeting-id]') && !this.meetingDetected) {
        this.meetingDetected = true;
        observer.disconnect(); // stop watching once found
        this.onMeetingStart();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  detectZoomState() {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.meeting-container') && !this.meetingDetected) {
        this.meetingDetected = true;
        observer.disconnect();
        this.onMeetingStart();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  detectTeamsState() {
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-tid="call-container"]') && !this.meetingDetected) {
        this.meetingDetected = true;
        observer.disconnect();
        this.onMeetingStart();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  onMeetingStart() {
    console.log(`Syntheon: ${this.platform} meeting detected`);
    chrome.runtime.sendMessage({
      action: 'meetingStarted',
      platform: this.platform,
      meetingInfo: this.getMeetingInfo(),
    });
  }

  // ─── Meeting Info ───────────────────────────────────────────
  getMeetingInfo() {
    return {
      platform: this.platform,
      url: window.location.href,
      title: document.title,
      meetingId: this.extractMeetingId(),
      timestamp: new Date().toISOString(),
    };
  }

  extractMeetingId() {
    const url = window.location.href;
    const patterns = {
      'google-meet': /meet\.google\.com\/([a-z\-]+)/,
      zoom: /zoom\.us\/j\/(\d+)/,
      teams: /teams\.microsoft\.com\/.*\/meeting\/([a-zA-Z0-9\-]+)/,
    };
    const match = url.match(patterns[this.platform]);
    return match ? match[1] : null;
  }
}

new SyntheonContentScript();
