// lib/deepgram.ts
import { createClient } from '@deepgram/sdk';
import fs from 'fs';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function transcribeMeeting(filePath: string): Promise<string> {
  const audio = fs.readFileSync(filePath);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audio, {
    model: 'nova-2',
    smart_format: true,
    diarize: true,
  });

  if (error) throw error;

  const transcript = result.results.channels[0].alternatives[0].transcript;

  if (!transcript || transcript.trim() === '') {
    throw new Error('Empty transcript returned — audio may be silent or too short');
  }

  console.log('Transcript:', transcript);
  return transcript;
}
