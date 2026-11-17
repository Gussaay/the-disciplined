// Recording a short voice note in the browser or the Android web view.
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

export const recordingSupported = () => Boolean(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

/** Starts recording; `stop()` resolves to { blob, base64, mimeType, seconds }. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  const started = Date.now();
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
  const release = () => stream.getTracks().forEach((t) => t.stop());
  return {
    stop: () => new Promise((resolve, reject) => {
      recorder.onstop = async () => {
        release();
        try {
          const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
          const blob = new Blob(chunks, { type });
          const buf = new Uint8Array(await blob.arrayBuffer());
          let bin = '';
          for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          resolve({ blob, base64: btoa(bin), mimeType: type, seconds: (Date.now() - started) / 1000 });
        } catch (e) {
          reject(e);
        }
      };
      recorder.stop();
    }),
    cancel: () => {
      recorder.onstop = release;
      try { recorder.stop(); } catch { release(); }
    },
  };
}
