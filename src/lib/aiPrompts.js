// What the AI is asked, and how its answers are read. Kept apart from the
// network code so the prompts and the parsing can be unit-tested.

const langName = (lang) => (lang === 'ar' ? 'Arabic' : 'English');

/** Pulls the first JSON object or array out of a model reply (it may be fenced). */
/**
 * Repairs the slips models make inside JSON: a backslash before a letter
 * that is not a JSON escape ("\\wide grip", "don\\'t") — the cause of the
 * "Bad escaped character in JSON" error the person saw — a broken \\u
 * escape, a literal newline typed inside a string, and trailing commas.
 */
function repairJson(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === '"') { inString = false; out += ch; continue; }
    if (ch === '\\') {
      const next = text[i + 1] || '';
      if ('"\\/bfnrt'.includes(next)) { out += ch + next; i += 1; continue; }
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) { out += text.slice(i, i + 6); i += 5; continue; }
      continue; // a stray backslash: drop it, keep the letter after it
    }
    if (ch < ' ') { out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ' '; continue; }
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

export function parseJson(text) {
  const raw = String(text || '').replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(raw);
  } catch { /* look for the JSON inside the prose */ }
  const start = raw.search(/[[{]/);
  if (start < 0) throw new Error('The AI reply was not understood');
  const open = raw[start];
  const close = open === '{' ? '}' : ']';
  const end = raw.lastIndexOf(close);
  if (end <= start) throw new Error('The AI reply was not understood');
  const slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch { /* repair the model's slips and try once more */ }
  try {
    return JSON.parse(repairJson(slice));
  } catch { /* fall through to the friendly error */ }
  throw new Error('The AI reply was not understood');
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

export function equipmentPrompt(catalog, lang) {
  return {
    system:
      'You are a gym coach who recognises gym equipment from photos. Answer with JSON only.',
    prompt: [
      'Identify the gym machine or equipment in this photo.',
      `Choose the best match from this list of ids: ${catalog.map((e) => `${e.id} (${e.name.en})`).join(', ')}.`,
      'If nothing in the list matches, use id "other" and describe the equipment yourself.',
      `Write the texts in ${langName(lang)}.`,
      'Reply as JSON: {"id": "<id from the list or other>", "name": "<equipment name>", "confidence": <0-1>,',
      '"exercises": [{"name": "...", "muscle": "...", "how": "<one or two sentences>"}] (2-4 exercises, only when id is "other"),',
      '"tip": "<one safety or setup tip for this equipment>"}',
      'If the photo does not show gym equipment, reply {"id": "none"}.',
    ].join('\n'),
  };
}

export function readEquipment(json) {
  const id = String(json?.id || 'none');
  return {
    id,
    name: String(json?.name || ''),
    confidence: Math.max(0, Math.min(1, Number(json?.confidence) || 0)),
    tip: String(json?.tip || ''),
    exercises: (Array.isArray(json?.exercises) ? json.exercises : [])
      .filter((x) => x?.name)
      .slice(0, 6)
      .map((x) => ({ name: String(x.name), muscle: String(x.muscle || ''), how: String(x.how || '') })),
  };
}

const FOOD_SHAPE =
  '{"items": [{"name": "<food>", "search": "<the same food in plain English as a nutrition table would name it, e.g. egg whole hard-boiled>", "grams": <number>, "kcal": <number>, "protein": <g>, "carbs": <g>, "fat": <g>, "sugar": <g>, "fiber": <g>}], "note": "<one short remark, e.g. what was assumed>"}';

const knownLine = (known) =>
  known?.length
    ? `Foods this person often eats (when one of them is what you see, use exactly that name): ${known.slice(0, 40).join('; ')}.`
    : '';

export function foodPhotoPrompt(lang, hint, known) {
  return {
    system:
      'You are a dietitian who estimates food portions and nutrients from photos. You know Sudanese, Gulf and Middle Eastern dishes well. Answer with JSON only.',
    prompt: [
      'List every food and drink visible in this photo with your best estimate of the portion in grams and its nutrients for that portion.',
      hint ? `The person adds: "${hint}".` : '',
      knownLine(known),
      `Write the food names and the note in ${langName(lang)}.`,
      `Reply as JSON: ${FOOD_SHAPE}`,
      'If the photo shows no food, reply {"items": []}.',
    ].filter(Boolean).join('\n'),
  };
}

export function foodTextPrompt(text, lang, known) {
  return {
    system:
      'You are a dietitian. You estimate nutrients of meals described in words. You know Sudanese, Gulf and Middle Eastern dishes well. Answer with JSON only.',
    prompt: [
      `The person ate: "${text}".`,
      'Split it into foods, estimate each portion in grams (use a typical serving when no amount is given) and its nutrients for that portion.',
      knownLine(known),
      `Write the food names and the note in ${langName(lang)}.`,
      `Reply as JSON: ${FOOD_SHAPE}`,
    ].filter(Boolean).join('\n'),
  };
}

export function readFoods(json) {
  const items = (Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [])
    .filter((x) => x?.name)
    .slice(0, 20)
    .map((x) => ({
      name: String(x.name),
      search: x.search ? String(x.search).slice(0, 80) : '',
      grams: num(x.grams),
      kcal: Math.round(num(x.kcal ?? x.calories)),
      protein: num(x.protein),
      carbs: num(x.carbs),
      fat: num(x.fat),
      sugar: num(x.sugar),
      fiber: num(x.fiber ?? x.fibre),
    }));
  return { items, note: String(json?.note || '') };
}

export function mealIdeasPrompt({ left, targets, meal, likes, lang }) {
  return {
    system: 'You are a dietitian planning practical, affordable meals. Answer with JSON only.',
    prompt: [
      `Suggest 3 ideas for ${meal}. Daily targets: ${targets.kcal} kcal, ${targets.protein} g protein.`,
      `Still available today: ${Math.max(0, Math.round(left.kcal))} kcal, ${Math.max(0, Math.round(left.protein))} g protein, ${Math.max(0, Math.round(left.sugar))} g sugar.`,
      likes ? `Preferences and foods at home: ${likes}.` : 'Prefer foods common in Sudan and the Gulf; halal only.',
      `Write in ${langName(lang)}.`,
      'Reply as JSON: {"ideas": [{"title": "<meal name>", "why": "<one sentence>", "items": [{"name": "...", "grams": <n>, "kcal": <n>, "protein": <g>, "carbs": <g>, "fat": <g>, "sugar": <g>, "fiber": <g>}]}]}',
    ].join('\n'),
  };
}

export function readMealIdeas(json) {
  return (Array.isArray(json?.ideas) ? json.ideas : [])
    .slice(0, 5)
    .map((idea) => ({ title: String(idea?.title || ''), why: String(idea?.why || ''), items: readFoods(idea).items }))
    .filter((idea) => idea.title && idea.items.length);
}

export function workoutPrompt({ profile, equipment, days, minutes, lang }) {
  return {
    system: 'You are a strength coach who writes safe, simple programmes. Answer with JSON only.',
    prompt: [
      `Write a ${days}-day weekly training programme, about ${minutes} minutes per session.`,
      `Person: ${profile.sex || 'male'}, ${profile.age || 30} years, ${profile.weight || 70} kg, goal: ${profile.goal || 'maintain'}, level: ${profile.level || 'beginner'}.`,
      `Use only these exercise ids: ${equipment.join(', ')}.`,
      `Write day names and the note in ${langName(lang)}.`,
      'Reply as JSON: {"name": "<programme name>", "note": "<one sentence on how to progress>", "days": [{"name": "<day name>", "exercises": ["<exercise id>", ...]}]} with 4-6 exercises per day.',
    ].join('\n'),
  };
}

export function readWorkout(json, validIds) {
  const days = (Array.isArray(json?.days) ? json.days : [])
    .map((d, i) => ({
      name: String(d?.name || `Day ${i + 1}`),
      exercises: (Array.isArray(d?.exercises) ? d.exercises : []).map(String).filter((id) => validIds.includes(id)),
    }))
    .filter((d) => d.exercises.length);
  if (!days.length) throw new Error('The AI did not return a usable programme');
  return { name: String(json?.name || 'AI programme'), note: String(json?.note || ''), days };
}

export function tutorSystem(level, lang) {
  return [
    `You are a friendly English tutor for an Arabic speaker at CEFR level ${level || 'A2'}.`,
    'Keep replies short (under 120 words), use vocabulary suited to the level, and always end with one question to keep the conversation going.',
    'When the learner makes a mistake, first show the corrected sentence after "✔", then continue.',
    lang === 'ar' ? 'You may add a short Arabic explanation when a correction needs it.' : '',
  ].join(' ');
}

export function correctionPrompt(text, level, lang) {
  return {
    system: 'You are an English writing teacher. Answer with JSON only.',
    prompt: [
      `Correct this text written by a learner at level ${level || 'A2'}:`,
      `"""${text}"""`,
      `Explain in ${langName(lang)}.`,
      'Reply as JSON: {"corrected": "<the full corrected text>", "score": <0-10>, "mistakes": [{"wrong": "...", "right": "...", "why": "<short reason>"}], "praise": "<one thing done well>"}',
    ].join('\n'),
  };
}

export function readCorrection(json) {
  return {
    corrected: String(json?.corrected || ''),
    score: Math.max(0, Math.min(10, Number(json?.score) || 0)),
    praise: String(json?.praise || ''),
    mistakes: (Array.isArray(json?.mistakes) ? json.mistakes : [])
      .filter((m) => m?.wrong || m?.right)
      .slice(0, 12)
      .map((m) => ({ wrong: String(m.wrong || ''), right: String(m.right || ''), why: String(m.why || '') })),
  };
}
