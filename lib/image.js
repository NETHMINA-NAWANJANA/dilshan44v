export async function compressProfileImage(file) {
  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);

  const max = 220;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  // Small JPEG for Firestore. Keeps photo storage modest.
  const compressed = canvas.toDataURL("image/jpeg", 0.68);

  // Guard well below Firestore's 1 MiB document limit.
  if (compressed.length > 250_000) {
    throw new Error("Photo is still too large. Please choose a smaller image.");
  }

  return compressed;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
