// lib/skribby.ts
const SKRIBBY_API = 'https://platform.skribby.io/api/v1';

function detectService(url: string): 'gmeet' | 'teams' | 'zoom' {
  if (url.includes('meet.google.com')) return 'gmeet';
  if (url.includes('teams.microsoft.com')) return 'teams';
  if (url.includes('zoom.us')) return 'zoom';
  throw new Error('Unsupported meeting platform');
}

export async function createBot(meetingUrl: string, webhookUrl: string) {
  const webhookToken = process.env.WEBHOOK_ACCESS_TOKEN ?? process.env.SKRIBBY_WEBHOOK_SECRET;
  const signedWebhookUrl = webhookToken
    ? `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(webhookToken)}`
    : webhookUrl;

  const res = await fetch(`${SKRIBBY_API}/bot`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SKRIBBY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      service: detectService(meetingUrl),
      bot_name: 'Syntheon AI',
      transcription_model: 'whisper',
      video: false,
      webhook_url: signedWebhookUrl,
      stop_options: {
        silence_detection: 1, // stop after 1 min silence
        last_person_detection: 1, // stop after 1 min alone
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Skribby error: ${JSON.stringify(err)}`);
  }

  return res.json(); // returns { id, status, ... }
}

export async function getBotTranscript(botId: string) {
  const res = await fetch(`${SKRIBBY_API}/bot/${botId}?with-speaker-events=true`, {
    headers: {
      Authorization: `Bearer ${process.env.SKRIBBY_API_KEY}`,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch bot transcript');
  return res.json();
}

export async function stopBot(botId: string) {
  const res = await fetch(`${SKRIBBY_API}/bot/${botId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.SKRIBBY_API_KEY}`,
    },
  });
  if (!res.ok) throw new Error('Failed to stop bot');
  return res.json();
}
