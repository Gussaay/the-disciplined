// Reading OKOK / Chipsea body-fat scales from their Bluetooth advertisements.
// These scales do not need a connection or the OKOK app: while someone stands
// on them they broadcast the weight (and, once the measurement is done, the
// body impedance) in the "manufacturer data" of every advertisement.
//
// Formats, as the scale maker's own app (OKOK, by Chipsea) reads them -
// checked against that app's code, which is the authority for these scales.
// `data` is the manufacturer data without its 2-byte company id, exactly as
// Android hands it over.
//   0x20CA "V20"  [6] properties, [8..9] weight BE, [10..11] impedance BE.
//                 A frame whose properties bit0 is set is a status frame,
//                 not a measurement: Chipsea reads no weight from it.
//   0x11CA "V11"  [3..4] weight BE, [9] properties (bits1-2 decimals,
//                 bits3-4 unit). Weight only, no impedance.
//   0x??C0 "C0/V2" 13 bytes: [0..1] weight BE, [2..3] impedance BE,
//                 [6] properties, [7..12] the scale's MAC. When bit7 of
//                 [2] is set the scale ENCRYPTS the weight and impedance
//                 with a key only the OKOK cloud hands out; no other app
//                 can read them (parseAdvert reports this, see below).
//   0xF0FF "VF0"  weight LE at [2..3], one decimal.
// Chipsea checks no checksum on any of these frames, and neither does this
// code any more: the XOR checksums an earlier version verified (from the
// openScale project) made the settler reject every real reading whose
// firmware laid the frame out slightly differently, so no weight was ever
// saved. Stability of the weight itself is the check now.
// Anything else can be taught: the person types what the display shows and
// the app finds where that number sits in the bytes (see learnFormat).

const LB = 0.45359237;
const be16 = (d, i) => ((d[i] << 8) | d[i + 1]) >>> 0;
const le16 = (d, i) => ((d[i + 1] << 8) | d[i]) >>> 0;
const round = (v, n = 2) => Math.round(v * 10 ** n) / 10 ** n;

export const hex = (bytes) => Array.from(bytes || [], (b) => b.toString(16).padStart(2, '0')).join(' ');
export const fromHex = (text) => Uint8Array.from(String(text).trim().split(/[\s:]+/).filter(Boolean).map((h) => parseInt(h, 16)));
export const companyHex = (id) => `0x${Number(id).toString(16).padStart(4, '0')}`;

function divider(bits) {
  return bits === 1 ? 1 : bits === 2 ? 100 : 10;
}

/** kg from a raw number, the decimals bits and the unit bits used by V11 and C0. */
function toKg(raw, attrib, msb, lsb) {
  const div = divider((attrib >> 1) & 3);
  switch ((attrib >> 3) & 3) {
    case 1: return raw / div / 2; // jin
    case 2: return (raw / div) * LB; // lb
    case 3: return (msb * 14 + lsb / div) * LB; // st:lb
    default: return raw / div;
  }
}

/** A sensible body impedance in ohms; some scales send ohms x10. */
function ohms(raw) {
  if (!raw || raw === 0xffff) return null;
  const v = raw > 1500 ? raw / 10 : raw;
  return v >= 150 && v <= 1500 ? round(v, 1) : null;
}

const plausible = (kg) => kg > 2 && kg < 300;

/**
 * One advertisement in, one reading out (or null). `mfr` maps company id
 * (number) to the bytes. A reading is { format, weight (kg), impedance (ohm or
 * null), final (the scale has finished), checksum (true/false/null) }.
 */
export function parseAdvert(mfr, { mac } = {}) {
  for (const [key, bytes] of Object.entries(mfr || {})) {
    const id = Number(key);
    const d = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    if (id === 0x20ca && d.length >= 13) {
      // Properties bit0 set: a status frame, not a measurement (Chipsea
      // reads no weight from it), so skip it instead of trusting its bytes.
      if (d[6] & 1) continue;
      const weight = toKg(be16(d, 8), d[6], d[8], d[9]);
      if (!plausible(weight)) continue;
      return { format: 'V20', weight: round(weight), impedance: ohms(be16(d, 10)), final: null, checksum: null };
    }
    if (id === 0x11ca && d.length >= 7) {
      const weight = toKg(be16(d, 3), d[9], d[3], d[4]);
      if (!plausible(weight)) continue;
      // V11 scales are weight-only; a steady value is treated as final by the caller.
      return { format: 'V11', weight: round(weight), impedance: null, final: null, checksum: null };
    }
    if ((id & 0xff) === 0xc0 && d.length >= 13) {
      // Encrypted V2 scale: bit7 of the impedance high byte. Its weight is
      // scrambled with a key the OKOK cloud gives only to the OKOK app, so
      // say so instead of failing silently. The MAC bytes are scrambled
      // too, which is why the MAC is no longer used to reject frames: a
      // neighbour's scale is far less likely than a locked or unbonded one.
      if (d[2] & 0x80) return { format: 'V2', encrypted: true, weight: null, impedance: null, final: null, checksum: null };
      const weight = toKg(be16(d, 0), d[6], d[0], d[1]);
      if (!plausible(weight)) continue;
      return { format: 'C0', weight: round(weight), impedance: ohms(be16(d, 2)), final: (d[6] & 1) === 1, checksum: null };
    }
    if (id === 0xf0ff && d.length >= 4) {
      const weight = le16(d, 2) / 10;
      if (!plausible(weight)) continue;
      return { format: 'VF0', weight: round(weight), impedance: null, final: null, checksum: null };
    }
  }
  return null;
}

/**
 * Teaching the app an unknown scale: given advertisements captured while
 * standing on it and the weight the display showed, finds the company id,
 * byte position, byte order and decimals that give that weight.
 */
export function learnFormat(samples, knownKg) {
  const target = Number(knownKg);
  if (!(target > 2)) return null;
  const votes = new Map();
  for (const mfr of samples) {
    for (const [key, bytes] of Object.entries(mfr || {})) {
      const d = Uint8Array.from(bytes);
      for (let i = 0; i + 1 < d.length; i++) {
        for (const order of ['be', 'le']) {
          const raw = order === 'be' ? be16(d, i) : le16(d, i);
          for (const div of [10, 100, 1]) {
            for (const unit of ['kg', 'lb']) {
              const kg = unit === 'kg' ? raw / div : (raw / div) * LB;
              if (Math.abs(kg - target) <= (div === 1 ? 0.6 : 0.11)) {
                const k = `${key}|${i}|${order}|${div}|${unit}`;
                votes.set(k, (votes.get(k) || 0) + 1);
              }
            }
          }
        }
      }
    }
  }
  if (!votes.size) return null;
  // The position that matches in the most captures wins; ties go to kg and one decimal.
  const pref = (k) => (k.endsWith('|kg') ? 0.2 : 0) + (k.includes('|10|') ? 0.1 : 0);
  const [best, count] = [...votes.entries()].sort((a, b) => b[1] + pref(b[0]) - (a[1] + pref(a[0])))[0];
  const [company, offset, order, div, unit] = best.split('|');
  return { company: Number(company), offset: Number(offset), order, divider: Number(div), unit, matches: count };
}

/** A reading from a learnt format. */
export function parseLearnt(mfr, cfg) {
  const bytes = mfr?.[cfg?.company];
  if (!bytes) return null;
  const d = Uint8Array.from(bytes);
  if (cfg.offset + 1 >= d.length) return null;
  const raw = cfg.order === 'be' ? be16(d, cfg.offset) : le16(d, cfg.offset);
  const kg = cfg.unit === 'lb' ? (raw / cfg.divider) * LB : raw / cfg.divider;
  return plausible(kg) ? { format: 'learnt', weight: round(kg), impedance: null, final: null, checksum: null } : null;
}

/**
 * Follows the readings while someone stands on the scale and says when the
 * measurement is done: at once when the scale flags it final, otherwise once
 * the same weight has held for `holdMs`.
 */
export function createSettler({ holdMs = 2500 } = {}) {
  let last = null;
  let since = 0;
  let done = false;
  return {
    push(reading, now = Date.now()) {
      if (!reading || typeof reading.weight !== 'number' || done) return { reading, settled: false };
      if (reading.final === true && reading.weight > 2) {
        done = true;
        return { reading, settled: true };
      }
      if (reading.final === false) {
        last = reading.weight;
        since = now;
        return { reading, settled: false };
      }
      if (last === null || Math.abs(reading.weight - last) > 0.05) {
        last = reading.weight;
        since = now;
        return { reading, settled: false };
      }
      if (now - since >= holdMs) {
        done = true;
        return { reading, settled: true };
      }
      return { reading, settled: false };
    },
    reset() {
      last = null;
      since = 0;
      done = false;
    },
  };
}
