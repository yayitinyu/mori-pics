// Images API - Download proxy
import type { Env, Image } from "../../../../src/types";
import { error } from "../../../../src/utils/response";
import { getS3Config, createS3Client, getS3Url } from '../../../../src/utils/s3';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const imageId = params.id as string;

  try {
    const image = await env.DB.prepare("SELECT * FROM images WHERE id = ?")
      .bind(imageId)
      .first<Image>();

    if (!image) {
      return error("Image not found", 404);
    }

    let responseBody: ReadableStream | Blob | null = null;
    let contentType = image.mime_type || 'application/octet-stream';
    let etag = '';

    // Check if S3 (by active config? Or try both? Or rely on stored URL?)
    // S3 proxy relies on active config usually.
    const s3Config = await getS3Config(env.DB);
    let fetchedFromS3 = false;
    
    // Check if image.url belongs to S3 domain OR if S3 is enabled and we are using proxy URLs?
    // If we use proxy URLs (/file/...), image.url on DB won't match s3 public domain.
    // Logic: If s3Config enabled, try to fetch from S3 first (using same filename).
    
    if (s3Config && s3Config.enabled) {
         try {
             // Proxy from S3 using auth client
             const client = createS3Client(s3Config);
             // Use auth fetch to ensure access
             const s3Url = getS3Url(s3Config, image.filename);
             const res = await client.fetch(s3Url);
             if (res.ok) {
                 responseBody = res.body;
                 contentType = res.headers.get('content-type') || contentType;
                 etag = res.headers.get('etag') || '';
                 fetchedFromS3 = true;
             }
         } catch (e) {
             console.error("S3 fetch error", e);
         }
    }

    if (!fetchedFromS3) {
        // Fallback to R2
        const object = await env.R2.get(image.filename);
        if (object) {
            responseBody = object.body;
            object.writeHttpMetadata(new Headers()); 
            if (object.httpMetadata?.contentType) contentType = object.httpMetadata.contentType;
            etag = object.httpEtag;
        }
    }

    if (!responseBody) {
      return error("Image not found in storage", 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    if (etag) headers.set("etag", etag);
    
    // Force download with original filename
    // Fix: encodeURIComponent might be double encoded or browser issue?
    // Standard approach: filename*=UTF-8''encoded
    // User requested to use system filename (UUID) for download consistency.
    const downloadName = image.filename;
    const encodedName = encodeURIComponent(downloadName);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`
    );

    return new Response(responseBody, {
      headers,
    });
  } catch (e) {
    console.error("Download error:", e);
    return error("Failed to download image", 500);
  }
};

