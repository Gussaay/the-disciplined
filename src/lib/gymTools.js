// The session screen's view of the equipment catalogue: grouping the tools
// by their main muscle, each tool's state in the workout in progress, and
// search that understands the person's own keywords for a machine as well
// as its English and Arabic names. Pure functions, tested in gymTools.test.js.

export const toolExerciseIds = (tool) => (tool?.exercises || []).map((x) => x.id);

/** The muscle a tool is listed under: the muscle of its first exercise. */
export const primaryMuscle = (tool) => tool?.exercises?.[0]?.muscle || 'other';

/** Tools grouped by primary muscle, in the order the muscle keys are given. */
export function groupTools(tools, muscleOrder) {
  const groups = new Map();
  for (const tool of tools || []) {
    const muscle = primaryMuscle(tool);
    if (!groups.has(muscle)) groups.set(muscle, []);
    groups.get(muscle).push(tool);
  }
  const order = muscleOrder || [...groups.keys()];
  const out = [];
  for (const muscle of order) {
    if (groups.has(muscle)) {
      out.push({ muscle, tools: groups.get(muscle) });
      groups.delete(muscle);
    }
  }
  for (const [muscle, list] of groups) out.push({ muscle, tools: list });
  return out;
}

const setTouched = (s) => Boolean(s?.done) || Number(s?.reps) > 0 || Number(s?.seconds) > 0 || Number(s?.minutes) > 0;

/** The session entries that belong to one tool. */
export const toolEntries = (session, tool) => {
  const ids = new Set(toolExerciseIds(tool));
  return (session?.exercises || []).filter((e) => ids.has(e.exerciseId));
};

/** Sets ticked done on this tool in this session. */
export const toolDoneSets = (session, tool) =>
  toolEntries(session, tool).reduce((sum, e) => sum + (e.sets || []).filter((s) => s.done).length, 0);

/**
 * Where a tool stands in the workout: 'done' when the person marked it
 * finished, 'doing' when any of its sets has been ticked or filled in,
 * otherwise 'todo'. Sets pre-filled from last time (weight only) do not
 * count as started.
 */
export function toolStatus(session, tool, doneToolIds) {
  if ((doneToolIds || []).includes(tool?.id)) return 'done';
  const mine = toolEntries(session, tool);
  if (!mine.length) return 'todo';
  return mine.some((e) => (e.sets || []).some(setTouched)) ? 'doing' : 'todo';
}

/** Session entries that belong to no catalogue tool (custom/AI exercises). */
export function looseEntries(session, tools) {
  const ids = new Set((tools || []).flatMap(toolExerciseIds));
  return (session?.exercises || [])
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !ids.has(entry.exerciseId));
}

const norm = (v) => String(v || '').toLowerCase().trim();

/**
 * Does a tool match a search? The query is checked against the tool's
 * English and Arabic names, its exercises' names in both languages, its
 * muscle names, and the person's own keywords for the tool.
 */
export function toolMatches(tool, exercisesById, keywords, query, muscles) {
  const q = norm(query);
  if (!q) return true;
  const parts = [tool?.name?.en, tool?.name?.ar];
  for (const id of toolExerciseIds(tool)) {
    const x = exercisesById?.[id];
    if (x) parts.push(x.name?.en, x.name?.ar);
  }
  const muscle = muscles?.[primaryMuscle(tool)];
  if (muscle) parts.push(muscle.en, muscle.ar);
  for (const word of keywords?.[tool?.id] || []) parts.push(word);
  return parts.some((p) => norm(p).includes(q));
}

/** Adds a keyword for a tool: trimmed, de-duplicated, at most 12 per tool. */
export function addKeyword(map, toolId, word) {
  const w = String(word || '').trim();
  if (!toolId || !w) return map || {};
  const current = (map || {})[toolId] || [];
  if (current.some((k) => norm(k) === norm(w))) return map || {};
  return { ...(map || {}), [toolId]: [...current, w].slice(-12) };
}

/** Removes one keyword from a tool. */
export function removeKeyword(map, toolId, word) {
  const current = (map || {})[toolId] || [];
  return { ...(map || {}), [toolId]: current.filter((k) => k !== word) };
}
