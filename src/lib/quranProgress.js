// Moving the bookmark and counting the day's verses. Reading forward inside a
// surah adds the verses passed; opening another surah counts from its start.
// Moving the bookmark backwards never takes verses away.
export function moveBookmark(quran = {}, surah, ayah, today) {
  const last = quran.last;
  const gained = last && last.s === surah ? Math.max(0, ayah - last.a) : ayah;
  return {
    ...quran,
    last: { s: surah, a: ayah },
    log: { ...(quran.log || {}), [today]: (Number(quran.log?.[today]) || 0) + gained },
  };
}
