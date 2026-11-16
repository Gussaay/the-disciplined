// The request format for Groq (OpenAI-style chat). Kept apart from ai.js so
// it can be tested without Firebase.
// Groq speaks the OpenAI chat format. Llama 4 Scout reads images; the text
// model is larger and better at writing.
export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TEXT = 'llama-3.3-70b-versatile';
const GROQ_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';

/** The request in Groq's format (exported for the tests). */
export function groqBody(request) {
  const system = `${request.system || ''}${request.json ? '\nAnswer with JSON only.' : ''}`.trim();
  const messages = system ? [{ role: 'system', content: system }] : [];
  if (request.messages) {
    for (const m of request.messages) messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text });
  } else if (request.image) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: request.prompt },
        { type: 'image_url', image_url: { url: `data:${request.image.mimeType};base64,${request.image.base64}` } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: request.prompt });
  }
  return {
    model: request.image ? GROQ_VISION : GROQ_TEXT,
    messages,
    temperature: request.json ? 0.2 : 0.7,
    ...(request.json ? { response_format: { type: 'json_object' } } : {}),
  };
}

