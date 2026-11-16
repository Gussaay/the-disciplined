// The day's numbers from the phone's health store (Health Connect on Android):
// steps, active calories, distance, heart rate and weight. Wear OS, Galaxy
// Watch, Fitbit, Garmin, Xiaomi and others write to Health Connect, so this is
// how a smartwatch reaches the app without a separate integration per brand.
// Only in the Android app; the web has no such store.
import { isNative } from './native';
import { summarise } from './hrParse';

export const healthSupported = isNative;
const TYPES = ['steps', 'calories', 'distance', 'heartRate', 'weight'];

/** Asks for access (first time) and reads today so far. */
export async function readHealthToday() {
  if (!isNative) throw new Error('Health data is available in the Android app');
  const { Health } = await import('@capgo/capacitor-health');
  const available = await Health.isAvailable();
  if (!available.available) {
    const error = new Error(available.reason || 'Health Connect is not installed');
    error.code = 'health-unavailable';
    throw error;
  }
  await Health.requestAuthorization({ read: TYPES });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const samples = {};
  for (const dataType of TYPES) {
    const from = dataType === 'weight' ? new Date(Date.now() - 90 * 86400000) : start;
    try {
      const res = await Health.readSamples({ dataType, startDate: from.toISOString(), endDate: new Date().toISOString(), limit: 2000 });
      samples[dataType] = res.samples || [];
    } catch {
      samples[dataType] = []; // access to this one type was refused
    }
  }
  return { ...summarise(samples), at: Date.now() };
}
