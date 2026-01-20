export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  qualityStart?: number;
  qualityMin?: number;
  qualityStep?: number;
  preferMimeTypes?: string[];
};

export function inferMimeFromBase64(base64: string): string {
  const v = (base64 ?? "").trim();
  if (!v) return "image/png";
  if (v.startsWith("data:")) {
    const match = /^data:([^;]+);base64,/i.exec(v);
    return match?.[1] ?? "image/png";
  }
  if (v.startsWith("iVBORw0KGgo")) return "image/png";
  if (v.startsWith("/9j/")) return "image/jpeg";
  if (v.startsWith("R0lGOD")) return "image/gif";
  if (v.startsWith("UklGR")) return "image/webp";
  if (v.startsWith("PHN2Zy")) return "image/svg+xml";
  return "image/png";
}

export function ensureImageDataUrl(base64OrDataUrl: string): string {
  const v = (base64OrDataUrl ?? "").trim();
  if (!v) return "";
  if (v.startsWith("data:")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return `data:${inferMimeFromBase64(v)};base64,${v}`;
}

export function extractBase64(dataUrlOrBase64: string): string {
  const v = (dataUrlOrBase64 ?? "").trim();
  if (!v) return "";
  if (!v.startsWith("data:")) return v;
  const commaIndex = v.indexOf(",");
  return commaIndex >= 0 ? v.slice(commaIndex + 1) : v;
}

export async function readAsDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid file result"));
    };
    reader.onerror = () => reject(new Error("Read file failed"));
    reader.readAsDataURL(blob);
  });
}

async function loadImageBitmap(
  file: Blob
): Promise<
  | { kind: "bitmap"; bitmap: ImageBitmap; width: number; height: number }
  | { kind: "img"; img: HTMLImageElement; width: number; height: number }
> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        kind: "bitmap",
        bitmap,
        width: bitmap.width,
        height: bitmap.height
      };
    } catch {}
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Load image failed"));
      el.src = objectUrl;
    });
    return {
      kind: "img",
      img,
      width: img.naturalWidth,
      height: img.naturalHeight
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob | null> {
  return await new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(blob),
      mimeType,
      typeof quality === "number" ? quality : undefined
    );
  });
}

export async function compressImageToDataUrl(
  file: Blob,
  options: CompressImageOptions = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) return await readAsDataUrl(file);

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const maxBytes = options.maxBytes ?? 350 * 1024;
  const qualityStart = options.qualityStart ?? 0.82;
  const qualityMin = options.qualityMin ?? 0.55;
  const qualityStep = options.qualityStep ?? 0.07;
  const preferMimeTypes = options.preferMimeTypes ?? [
    "image/webp",
    "image/jpeg"
  ];

  const source = await loadImageBitmap(file);
  const scale = Math.min(
    1,
    maxWidth / Math.max(1, source.width),
    maxHeight / Math.max(1, source.height)
  );
  const targetWidth = Math.max(1, Math.round(source.width * scale));
  const targetHeight = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return await readAsDataUrl(file);

  if (source.kind === "bitmap") {
    ctx.drawImage(source.bitmap, 0, 0, targetWidth, targetHeight);
    if (typeof source.bitmap.close === "function") source.bitmap.close();
  } else {
    ctx.drawImage(source.img, 0, 0, targetWidth, targetHeight);
  }

  let activeMime = preferMimeTypes[0] ?? "image/webp";
  let quality = qualityStart;
  let blob: Blob | null = null;
  for (const mime of preferMimeTypes) {
    const tried = await canvasToBlob(canvas, mime, quality);
    if (tried) {
      activeMime = mime;
      blob = tried;
      break;
    }
  }
  if (!blob) return await readAsDataUrl(file);

  while (blob.size > maxBytes && quality > qualityMin) {
    quality = Math.max(qualityMin, quality - qualityStep);
    const next = await canvasToBlob(canvas, activeMime, quality);
    if (!next) break;
    blob = next;
  }

  return await readAsDataUrl(blob);
}
