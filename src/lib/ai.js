// One door to the AI. Two ways in:
//   1. The person's own Gemini key, saved on this device only (Settings > AI).
//      The request goes straight from the device to Google.
//   2. The project's Cloud Function (functions/ai.js), when cloud backup is set
//      up and the person is signed in. The key then stays on the server.
// With neither, AI features explain how to turn them on; everything else in
// the app works without AI.
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { read } from './store';
import { parseJson } from './aiPrompts';

const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export class AiSetupError extends Error {
  constructor() {
    super('AI is not set up');
    this.code = 'ai-setup';
  }
}

export const ownKey = () => String(read('device')?.geminiKey || '').trim();

export function aiAvailable() {
  return Boolean(ownKey() || (functions && auth?.currentUser));
}

function toContents({ prompt, image, messages }) {
  if (messages) {
    return messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));
  }
  const parts = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
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
  let text;
  if (key) {
    text = await direct(key, request);
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
