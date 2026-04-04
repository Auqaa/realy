import { BrowserQRCodeReader } from '@zxing/browser';

const imageReader = new BrowserQRCodeReader();

const MAX_DECODE_DIMENSION = 1600;
const RETRY_SCALES = [1, 0.85, 0.65];

export class QrPhotoDecodeError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'QrPhotoDecodeError';
    this.code = code;
    this.cause = cause;
  }
}

const isBrowserDecodeMiss = (error) => {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return name === 'notfoundexception' || message.includes('not found') || message.includes('no multi format readers');
};

const getScaledDimensions = (width, height, scale = 1) => {
  if (!width || !height) {
    throw new QrPhotoDecodeError('image-load-failed', 'Image dimensions are not available.');
  }

  const maxDimension = Math.max(width, height);
  const baseRatio = maxDimension > MAX_DECODE_DIMENSION ? MAX_DECODE_DIMENSION / maxDimension : 1;
  const ratio = Math.min(1, baseRatio * scale);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
};

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new QrPhotoDecodeError('image-load-failed', 'Failed to load selected photo.'));
    image.src = src;
  });

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new QrPhotoDecodeError('image-read-failed', 'Failed to read selected photo.'));
    reader.readAsDataURL(file);
  });

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawSourceToCanvas = (source, width, height) => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new QrPhotoDecodeError('image-processing-failed', 'Canvas 2D context is unavailable.');
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas;
};

const loadNormalizedCanvas = async (file) => {
  const dataUrl = await readFileAsDataUrl(file);

  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' });
      const { width, height } = getScaledDimensions(bitmap.width, bitmap.height);
      const canvas = drawSourceToCanvas(bitmap, width, height);
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }
      return canvas;
    } catch (error) {
      if (error instanceof QrPhotoDecodeError) throw error;
    }
  }

  const image = await loadImageElement(dataUrl);
  const { width, height } = getScaledDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
  return drawSourceToCanvas(image, width, height);
};

const buildScaledCanvas = (canvas, scale) => {
  if (scale === 1) return canvas;
  const { width, height } = getScaledDimensions(canvas.width, canvas.height, scale);
  return drawSourceToCanvas(canvas, width, height);
};

export const decodeQrFromImageFile = async (file) => {
  if (!file) {
    throw new QrPhotoDecodeError('no-file', 'No photo was selected.');
  }

  let normalizedCanvas;

  try {
    normalizedCanvas = await loadNormalizedCanvas(file);
  } catch (error) {
    if (error instanceof QrPhotoDecodeError) throw error;
    throw new QrPhotoDecodeError('image-processing-failed', 'Failed to prepare selected photo.', error);
  }

  let lastError = null;

  for (const scale of RETRY_SCALES) {
    try {
      const candidateCanvas = buildScaledCanvas(normalizedCanvas, scale);
      const result = imageReader.decodeFromCanvas(candidateCanvas);
      return typeof result?.getText === 'function' ? result.getText() : result?.text;
    } catch (error) {
      lastError = error;
      if (!isBrowserDecodeMiss(error)) {
        throw new QrPhotoDecodeError('decode-failed', 'QR decoder failed on selected photo.', error);
      }
    }
  }

  throw new QrPhotoDecodeError('qr-not-found', 'QR code was not found on selected photo.', lastError);
};
