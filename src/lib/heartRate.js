// Live heart rate from a watch or chest strap over Bluetooth Low Energy, using
// the standard Heart Rate service that most of them offer (on many watches it
// is called "broadcast heart rate" or "HR push" and has to be switched on).
// Web: the browser's Web Bluetooth (Chrome, Edge). Android app: the
// bluetooth-le plugin, because the WebView has no Web Bluetooth.
import { isNative } from './native';
import { parseHeartRate } from './hrParse';

const SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC = '00002a37-0000-1000-8000-00805f9b34fb';

export const heartRateSupported = () => isNative || Boolean(globalThis.navigator?.bluetooth);

/**
 * Asks the person to pick a device and streams its heart rate to `onBpm`.
 * Resolves to { name, disconnect }. `onEnd` is called when the link drops.
 */
export async function connectHeartRate(onBpm, onEnd = () => {}) {
  if (isNative) {
    const { BleClient } = await import('@capacitor-community/bluetooth-le');
    await BleClient.initialize({ androidNeverForLocation: true });
    const device = await BleClient.requestDevice({ services: [SERVICE] });
    await BleClient.connect(device.deviceId, () => onEnd());
    await BleClient.startNotifications(device.deviceId, SERVICE, CHARACTERISTIC, (value) => onBpm(parseHeartRate(value)));
    return {
      name: device.name || 'Heart rate',
      disconnect: () => BleClient.disconnect(device.deviceId).catch(() => {}),
    };
  }
  if (!navigator.bluetooth) throw new Error('Bluetooth is not available in this browser');
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
  device.addEventListener('gattserverdisconnected', onEnd);
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');
  characteristic.addEventListener('characteristicvaluechanged', (e) => onBpm(parseHeartRate(e.target.value)));
  await characteristic.startNotifications();
  return {
    name: device.name || 'Heart rate',
    disconnect: () => {
      try {
        device.gatt.disconnect();
      } catch { /* already gone */ }
    },
  };
}
