// One door to the AI. Three ways in:
//   1. The person's own Gemini key, saved on this device only (Settings > AI).
//      The request goes straight from the device to Google.
//   1b. The person's own Groq key, also on this device only. Used when there
//      is no Gemini key, or when Gemini fails (limit reached, model busy).
//   2. The project's Cloud Function (functions/ai.js), when cloud backup is set
//      up and the person is signed in. The key then stays on the server.
// With neither, AI features explain how to turn them on; everything else in
// the app works without AI.
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { read } from './store';
import { parseJson } from './aiPrompts';
import { GROQ_URL, groqBody } from './groq';

const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export class AiSetupError extends Error {
  constructor() {
    super('AI is not set up');
    this.code = 'ai-setup';
  }
}

export const ownKey = () => String(read('device')?.geminiKey || '').trim();
export const groqKey = () => String(read('device')?.groqKey || '').trim();

export function aiAvailable() {
  return Boolean(ownKey() || groqKey() || (functions && auth?.currentUser));
}

async function groq(key, request) {
  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(groqBody(request)),
    });
  } catch {
    throw new Error('No connection to the AI service');
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('The Groq key is not valid');
    throw new Error(detail?.error?.message || `AI error ${res.status}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('The AI gave an empty answer');
  return text;
}

function toContents({ prompt, image, audio, messages }) {
  if (messages) {
    return messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));
  }
  const parts = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  if (audio) parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.base64 } });
  return [{ role: 'user', parts }];
}

async function direct(key, request) {
  const body = {
    systemInstruction: { parts: [{ text: request.system || '' }] },
    contents: toContents(request),
    generationConfig: {
      temperature: request.json ? 0.2 : 0.7,
      ...(request.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  let lastError = null;
  // A model whose free allowance ran out, or that is closed to the key, hands
  // over to the next one.
  for (const model of MODELS) {
    let res;
    try {
      res = await fetch(URL(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('No connection to the AI service');
    }
    if (res.ok) {
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      if (text) return text;
      lastError = new Error('The AI gave an empty answer');
      continue;
    }
    const detail = await res.json().catch(() => ({}));
    lastError = new Error(detail?.error?.message || `AI error ${res.status}`);
    if (res.status === 400 && /API key/i.test(lastError.message)) throw new Error('The Gemini key is not valid');
    if (res.status === 401 || res.status === 403) {
      if (/key/i.test(lastError.message)) throw new Error('The Gemini key is not valid');
    }
  }
  throw lastError || new Error('The AI could not answer');
}

/**
 * Asks the AI. `request` = { system, prompt, image?, messages?, json? }.
 * Returns parsed JSON when `json` is set, otherwise the text.
 */
export async function askAI(request) {
  const key = ownKey();
  const backup = groqKey();
  let text;
  if (key) {
    try {
      text = await direct(key, request);
    } catch (error) {
      if (!backup) throw error;
      text = await groq(backup, request);
    }
  } else if (backup) {
    text = await groq(backup, request);
  } else if (functions && auth?.currentUser) {
    const call = httpsCallable(functions, 'ai', { timeout: 120000 });
    const res = await call({
      system: request.system,
      prompt: request.prompt,
      messages: request.messages,
      image: request.image ? { mimeType: request.image.mimeType, base64: request.image.base64 } : undefined,
      json: Boolean(request.json),
    });
    text = res.data?.text || '';
  } else {
    throw new AiSetupError();
  }
  return request.json ? parseJson(text) : text;
}

/**
 * Words from a voice recording ({ blob, base64, mimeType }). Groq's Whisper
 * when there is a Groq key, otherwise Gemini listens to the audio itself.
 */
export async function transcribe(audio, lang) {
  const backup = groqKey();
  if (backup) {
    const form = new FormData();
    const ext = /mp4|m4a|aac/.test(audio.mimeType) ? 'm4a' : /ogg/.test(audio.mimeType) ? 'ogg' : 'webm';
    form.append('file', audio.blob, `voice.${ext}`);
    form.append('model', 'whisper-large-v3-turbo');
    if (lang) form.append('language', lang);
    let res;
    try {
      res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${backup}` },
        body: form,
      });
    } catch {
      throw new Error('No connection to the AI service');
    }
    if (res.ok) {
      const data = await res.json();
      if (data?.text?.trim()) return data.text.trim();
    } else if (!ownKey()) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail?.error?.message || `AI error ${res.status}`);
    }
  }
  const key = ownKey();
  if (!key) throw new AiSetupError();
  const text = await direct(key, {
    system: 'You transcribe voice notes exactly, in the language spoken (often Arabic or English). Reply with the words only.',
    prompt: 'Transcribe this voice note.',
    audio,
  });
  return text.trim();
}
