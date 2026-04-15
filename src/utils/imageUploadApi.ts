import { getDeviceId } from './authStorage';

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  type?: string;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal
    ? ''
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
}

/**
 * Compresses an image on the client side using HTML5 Canvas.
 */
export async function compressImage(file: File | Blob, options: CompressOptions = {}): Promise<Blob> {
  const maxWidth = options.maxWidth || 1024;
  const maxHeight = options.maxHeight || 1024;
  const quality = options.quality !== undefined ? options.quality : 0.8;
  const type = options.type || 'image/webp';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));

        // Handle transparent backgrounds for webp/jpeg
        if (type !== 'image/png') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          type,
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Uploads an image to the backend.
 * @returns The public URL or relative path to the uploaded image.
 */
export async function uploadImage(
  fileOrBlob: File | Blob,
  accessToken: string | null = null,
  context?: string
): Promise<string> {
  const base = getApiBase();
  const url = `${base}/api/images/upload`;
  const formData = new FormData();
  
  formData.append('file', fileOrBlob, 'upload.webp');
  if (context) {
    formData.append('context', context);
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    const devId = getDeviceId();
    if (devId) headers['X-Device-Id'] = devId;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers, // Do NOT set Content-Type for FormData, fetch does it automatically with boundary
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload image');
  }

  if (!data.url) {
    throw new Error('Server did not return an image URL');
  }

  return data.url;
}

