// The AI door for people who are signed in and have no key of their own.
//
// An API key must never ship inside the app: anyone could pull it out of the
// APK and run up the bill. So the key is a Firebase secret that only this
// function can read, and the app reaches the AI through this callable. (People
// may instead paste their own key in Settings; that request never comes here.)
//
// Same providers as the Easy Pedia app: Gemini first, because it reads photos
// on the free tier; Groq as a backup for text when its key is set.
//
// One-time setup (from the project folder):
//   1. Get a key at https://aistudio.google.com/apikey
//   2. firebase functions:secrets:set GEMINI_API_KEY
//   3. Optional backup: a key from https://console.groq.com/keys, then
//      firebase functions:secrets:set GROQ_API_KEY
//   4. firebase deploy --only functions
//
// The app sends { system, prompt, image?, messages?, json? } and gets { text }.
// Each person has a daily allowance (DAILY_LIMIT requests), counted in
// aiUsage/<uid>/<day>, so one account cannot use up the free tier for everyone.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { getDatabase } from 'firebase-admin/database';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 60;
const MAX_TEXT = 12000;
const MAX_IMAGE = 1_500_000; // base64 characters, about 1.1 MB

// "-latest" follows Google's current Flash model, so a retired version never
// breaks the app. The free tier caps each model separately, so when one runs
// out the next is tried.
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const clip = (value, max = MAX_TEXT) => String(value ?? '').slice(0, max);

function cleanRequest(data) {
  const system = clip(data?.system, 2000);
  const json = Boolean(data?.json);
  let messages = null;
  if (Array.isArray(data?.messages)) {
    messages = data.messages
      .slice(-16)
      .map((m) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', text: clip(m?.text, 4000) }))
      .filter((m) => m.text);
  }
  const prompt = clip(data?.prompt);
  if (!prompt && !messages?.length) throw new HttpsError('invalid-argument', 'Nothing was asked.');
  let image = null;
  if (data?.image?.base64) {
    const base64 = String(data.image.base64);
    const mimeType = String(data.image.mimeType || 'image/jpeg');
    if (base64.length > MAX_IMAGE) throw new HttpsError('invalid-argument', 'The picture is too large.');
    if (!/^image\/(jpeg|png|webp)$/.test(mimeType) || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
      throw new HttpsError('invalid-argument', 'The picture could not be read.');
    }
    image = { base64, mimeType };
  }
  return { system, prompt, messages, image, json };
}

/** Counts this request against today's allowance; throws when it is used up. */
async function spend(uid) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = getDatabase().ref(`aiUsage/${uid}/${day}`);
  const result = await ref.transaction((n) => ((n || 0) >= DAILY_LIMIT ? undefined : (n || 0) + 1));
  if (!result.committed) {
    throw new HttpsError('resource-exhausted', 'Today’s AI allowance is used up. It starts again tomorrow.');
  }
}

async function askGemini(key, request) {
  const contents = request.messages
    ? request.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }))
    : [{
      role: 'user',
      parts: [
        { text: request.prompt },
        ...(request.image ? [{ inlineData: { mimeType: request.image.mimeType, data: request.image.base64 } }] : []),
      ],
    }];
  const body = {
    systemInstruction: { parts: [{ text: request.system }] },
    contents,
    generationConfig: {
      temperature: request.json ? 0.2 : 0.7,
      ...(request.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  let last = 'no model answered';
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      if (text) return text;
      last = `${model}: empty answer`;
      continue;
    }
    last = `${model}: ${res.status} ${(await res.text()).slice(0, 200)}`;
    logger.warn('Gemini model failed', { model, status: res.status });
  }
  throw new Error(last);
}

async function askGroq(key, request) {
  const messages = [
    { role: 'system', content: request.system },
    ...(request.messages
      ? request.messages.map((m) => ({ role: m.role, content: m.text }))
      : [{ role: 'user', content: request.prompt }]),
  ];
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: request.json ? 0.2 : 0.7,
      ...(request.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`groq: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

const secret = (param) => {
  try {
    return param.value() || '';
  } catch {
    return '';
  }
};

export const ai = onCall(
  { secrets: [GEMINI_API_KEY, GROQ_API_KEY], timeoutSeconds: 120, memory: '256MiB', cors: true },
  async (call) => {
    if (!call.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to use the AI.');
    const request = cleanRequest(call.data);
    const geminiKey = secret(GEMINI_API_KEY);
    const groqKey = secret(GROQ_API_KEY);
    if (!geminiKey && !groqKey) throw new HttpsError('failed-precondition', 'The AI key is not set on the server.');

    await spend(call.auth.uid);

    let failure = null;
    if (geminiKey) {
      try {
        return { text: await askGemini(geminiKey, request), provider: 'gemini' };
      } catch (error) {
        failure = error;
        logger.error('Gemini failed', { message: error.message });
      }
    }
    // Groq's free models do not read pictures, so it backs up text only.
    if (groqKey && !request.image) {
      try {
        return { text: await askGroq(groqKey, request), provider: 'groq' };
      } catch (error) {
        failure = error;
        logger.error('Groq failed', { message: error.message });
      }
    }
    throw new HttpsError('unavailable', 'The AI could not answer just now. Try again in a minute.', failure?.message);
  },
);
