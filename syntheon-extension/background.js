// background.js — Syntheon AI Meeting Assistant
importScripts('config.js');

// ─── Message Handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'sendBot':
      sendBot(request.meetingUrl, request.tabTitle)
        .then((data) => sendResponse({ success: true, ...data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getTabInfo':
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tab = tabs[0];
        sendResponse({ url: tab?.url ?? '', title: tab?.title ?? '' });
      });
      return true;
  }
});

// ─── Send Bot to Meeting ───────────────────────────────────────────────────────
async function sendBot(meetingUrl, tabTitle) {
  console.log('Sending bot to:', meetingUrl);

  // 🔥 GET API KEY
  const { apiKey } = await chrome.storage.local.get(['apiKey']);

  if (!apiKey) {
    throw new Error('API key not set. Open settings.');
  }

  const url = getApiUrl('/api/bot/create');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ meetingUrl, tabTitle }),
    });
  } catch (err) {
    console.error('Network error reaching', url, err);
    throw new Error(`Cannot reach server (${url}). Is your backend running?`);
  }

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`Non-JSON ${res.status} response from ${url}:`, text.slice(0, 200));
    throw new Error(`Server ${res.status}: invalid response (check API_BASE_URL in config.js)`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Server ${res.status}: failed to send bot`);
  }

  return data;
}
