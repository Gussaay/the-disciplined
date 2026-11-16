// A photo from the camera is several megabytes; the AI needs far less. The
// picture is scaled to at most 1024 px and saved as JPEG before it is sent.
export async function shrinkImage(file, max = 1024, quality = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the picture'));
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
