// Bluetooth "Heart Rate Measurement" (0x2A37): bit 0 of the first byte says
// whether the value that follows is one byte or two (little endian).
export function parseHeartRate(view) {
  if (!view || view.byteLength < 2) return 0;
  const wide = view.getUint8(0) & 0x01;
  if (wide) return view.byteLength >= 3 ? view.getUint16(1, true) : 0;
  return view.getUint8(1);
}

/** Running average and maximum of the readings of a session. */
export function hrStats(stats, bpm) {
  if (!bpm || bpm < 25 || bpm > 250) return stats || { n: 0, avg: 0, max: 0 };
  const s = stats || { n: 0, avg: 0, max: 0 };
  const n = s.n + 1;
  return { n, avg: Math.round((s.avg * s.n + bpm) / n), max: Math.max(s.max, bpm) };
}

/** Totals from readings. (Health Connect samples by type.) */
export function summarise(samples) {
  const by = (type) => (samples[type] || []).map((s) => Number(s.value) || 0);
  const sum = (list) => list.reduce((a, b) => a + b, 0);
  const hr = by('heartRate').filter((v) => v > 0);
  const weights = (samples.weight || []).slice().sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  return {
    steps: Math.round(sum(by('steps'))),
    calories: Math.round(sum(by('calories'))),
    km: Math.round(sum(by('distance')) / 10) / 100,
    hrAvg: hr.length ? Math.round(sum(hr) / hr.length) : 0,
    hrMax: hr.length ? Math.max(...hr) : 0,
    weight: weights.length ? Math.round(Number(weights[0].value) * 10) / 10 : 0,
  };
}

