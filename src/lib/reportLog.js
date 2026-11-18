// Sending a device log for a look: it opens a new GitHub issue in the app's
// repository, filled in, so the person only taps Submit (no key in the app).
// The "Device log review" workflow then has Claude (or Gemini) read it.
export const REPO = 'Gussaay/the-disciplined';
export const LOG_TAG = '[device-log]';

/** The new-issue link; long logs keep their end, where the problem usually is. */
export function logIssueUrl(title, lines, { note = '', max = 5500 } = {}) {
  let text = lines.filter(Boolean).join('\n');
  if (text.length > max) text = `…(start cut)\n${text.slice(-max)}`;
  const body = [
    note || 'What I was doing / what went wrong: ',
    '',
    '```',
    text,
    '```',
  ].join('\n');
  const q = new URLSearchParams({ title: `${LOG_TAG} ${title}`, body });
  return `https://github.com/${REPO}/issues/new?${q.toString()}`;
}
