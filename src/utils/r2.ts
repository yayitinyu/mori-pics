// R2 Storage utilities

import type { Env } from '../types';

export interface UploadOptions {
    filename?: string;
    useOriginalFilename?: boolean;
    uploadPath?: string;
}

export function generateFilename(originalName: string, options: UploadOptions = {}): string {
    let filename: string;

    if (options.useOriginalFilename && originalName) {
        filename = originalName;
    } else {
        const ext = originalName ? originalName.split('.').pop() : 'png';
        const randomStr = Math.random().toString(36).substring(2, 10);
        filename = `${Date.now()}_${randomStr}.${ext}`;
    }

    if (options.uploadPath) {
        const prefix = options.uploadPath.endsWith('/')
            ? options.uploadPath
            : options.uploadPath + '/';
        const cleanPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix;
        filename = `${cleanPrefix}${filename}`;
    }

    return filename;
}

export async function uploadToR2(
    r2: R2Bucket,
    filename: string,
    body: ArrayBuffer | ReadableStream,
    contentType: string
): Promise<R2Object> {
    const object = await r2.put(filename, body, {
        httpMetadata: {
            contentType
        }
    });

    if (!object) {
        throw new Error('Failed to upload to R2');
    }

    return object;
}

export async function deleteFromR2(r2: R2Bucket, filename: string): Promise<void> {
    await r2.delete(filename);
}

export function buildImageUrl(filename: string, customDomain: string): string {
    const domain = customDomain.replace(/\/$/, '');
    const path = filename.startsWith('/') ? filename : '/' + filename;
    return `${domain}${path}`;
}

// Image compression to WebP using Canvas (not available in Workers, will be done client-side)
// This function just validates the file type
export function isCompressibleImage(mimeType: string): boolean {
    const compressibleTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
    return compressibleTypes.includes(mimeType);
}

export function isGif(mimeType: string): boolean {
    return mimeType === 'image/gif';
}
