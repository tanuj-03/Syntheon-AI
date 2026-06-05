// popup/popup.js — Syntheon AI Meeting Assistant

class SyntheonPopup {
  constructor() {
    this.meetingUrl = null;
    this.tabTitle = null;
    this.init();
  }

  async init() {
    this.bindElements();
    this.bindEvents();
    this.loadStoredApiKey(); // 🔥 load key first
    this.loadTabInfo();
  }

  bindElements() {
    this.sendBotButton = document.getElementById('sendBotButton');
    this.sendBotText = document.getElementById('sendBotText');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.meetingUrlEl = document.getElementById('meetingUrl');
    this.platformName = document.getElementById('platformName');
    this.recordingsButton = document.getElementById('recordingsButton');

    // 🔥 Settings
    this.settingsButton = document.getElementById('settingsButton');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.saveApiKeyBtn = document.getElementById('saveApiKey');
    this.settingsToast = document.getElementById('settingsToast');
  }

  showSettingsToast(message, type = 'success') {
    if (!this.settingsToast) return;
    this.settingsToast.textContent = message;
    this.settingsToast.className = `settings-toast ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.settingsToast?.classList.add('hidden');
    }, 2500);
  }

  bindEvents() {
    this.sendBotButton.addEventListener('click', async () => {
      const stored = await chrome.storage.local.get('botState');

      if (stored.botState?.active) {
        await chrome.storage.local.remove('botState');
        this.sendBotText.textContent = 'Send Bot to Meeting';
        this.sendBotButton.disabled = false;
        this.updateStatus('Ready to send bot', 'ready');
      } else {
        this.sendBot();
      }
    });

    // Toggle settings panel
    this.settingsButton?.addEventListener('click', () => {
      this.settingsPanel?.classList.toggle('hidden');
    });

    // Save API key
    this.saveApiKeyBtn?.addEventListener('click', async () => {
      const key = this.apiKeyInput?.value?.trim();

      if (!key || !key.startsWith('syn_')) {
        this.showSettingsToast('Invalid API key. It must start with syn_', 'error');
        return;
      }

      await chrome.storage.local.set({ apiKey: key });
      this.showSettingsToast('API key saved successfully', 'success');
    });

    this.recordingsButton?.addEventListener('click', () => {
      chrome.tabs.create({ url: EXTENSION_CONFIG.API_BASE_URL });
    });
  }

  // 🔥 Load stored API key
  async loadStoredApiKey() {
    const res = await chrome.storage.local.get(['apiKey']);
    if (res.apiKey && this.apiKeyInput) {
      this.apiKeyInput.value = res.apiKey;
    }
  }

  async loadTabInfo() {
    try {
      const stored = await chrome.storage.local.get('botState');

      if (stored.botState?.active) {
        this.meetingUrlEl.textContent = this.formatUrl(stored.botState.meetingUrl);
        this.platformName.textContent = stored.botState.platform;
        this.sendBotButton.disabled = false;
        this.sendBotText.textContent = 'Bot Active — Click to Reset';
        this.updateStatus('Syntheon - AI will join shortly', 'success');
        return;
      }

      const response = await chrome.runtime.sendMessage({ action: 'getTabInfo' });

      const url = response?.url ?? '';
      const title = response?.title ?? '';

      if (this.isMeetingUrl(url)) {
        this.meetingUrl = url;
        this.tabTitle = title;
        this.meetingUrlEl.textContent = this.formatUrl(url);
        this.platformName.textContent = this.getPlatformName(url);
        this.sendBotButton.disabled = false;
        this.updateStatus('Ready to send bot', 'ready');
      } else {
        this.meetingUrlEl.textContent = 'No meeting detected';
        this.platformName.textContent = '—';
        this.sendBotButton.disabled = true;
        this.updateStatus('Open a meeting first', 'idle');
      }
    } catch (error) {
      console.error('loadTabInfo error:', error);
      this.updateStatus('Could not detect tab', 'error');
    }
  }

  isMeetingUrl(url) {
    if (!url) return false;
    return ['meet.google.com', 'zoom.us', 'teams.microsoft.com'].some((p) => url.includes(p));
  }

  formatUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + u.pathname.slice(0, 20) + '...';
    } catch {
      return url;
    }
  }

  getPlatformName(url) {
    if (url.includes('meet.google.com')) return 'Google Meet';
    if (url.includes('zoom.us')) return 'Zoom';
    if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
    return 'Unknown';
  }

  async sendBot() {
    this.sendBotButton.disabled = true;
    this.updateStatus('Sending bot...', 'recording');
    this.sendBotText.textContent = 'Sending...';

    try {
      // 🔥 CHECK API KEY BEFORE SENDING
      const { apiKey } = await chrome.storage.local.get(['apiKey']);

      if (!apiKey) {
        throw new Error('API key not set. Open settings.');
      }

      const res = await chrome.runtime.sendMessage({
        action: 'sendBot',
        meetingUrl: this.meetingUrl,
        tabTitle: this.tabTitle,
      });

      console.log('sendBot response:', res);
      if (!res?.success) throw new Error(res?.error || 'No response from background');

      await chrome.storage.local.set({
        botState: {
          active: true,
          botId: res.botId,
          meetingId: res.meetingId,
          meetingUrl: this.meetingUrl,
          platform: this.getPlatformName(this.meetingUrl),
        },
      });

      this.sendBotButton.disabled = false;
      this.sendBotText.textContent = 'Bot Active — Click to Reset';
      this.updateStatus('Syntheon - AI will join shortly', 'success');
    } catch (error) {
      console.error('Failed to send bot:', error);
      this.updateStatus(error.message || 'Failed to send bot', 'error');
      this.sendBotText.textContent = 'Send Bot to Meeting';
      this.sendBotButton.disabled = false;
    }
  }

  updateStatus(text, type) {
    this.statusText.textContent = text;
    this.statusDot.className = `status-dot ${type}`;

    const colors = {
      ready: '#5c7c5d',
      idle: '#6b7280',
      success: '#5c7c5d',
      error: '#f59e0b',
      recording: '#c0534a',
    };

    this.statusDot.style.background = colors[type] || '#6b7280';
  }
}

document.addEventListener('DOMContentLoaded', () => new SyntheonPopup());
