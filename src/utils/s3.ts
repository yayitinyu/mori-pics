import { AwsClient } from 'aws4fetch';
import { Env } from '../types';

export interface S3Config {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicDomain: string;
    enabled?: boolean;
    urlStyle?: 'path' | 'host';
}

export async function getS3Config(db: D1Database): Promise<S3Config | null> {
    const row = await db.prepare('SELECT * FROM storage_configs WHERE id = 1 AND enabled = 1').first<any>();
    if (!row) return null;
    
    return {
        endpoint: row.endpoint,
        region: row.region,
        bucket: row.bucket,
        accessKeyId: row.access_key_id,
        secretAccessKey: row.secret_access_key,
        publicDomain: row.public_domain,
        enabled: !!row.enabled,
        urlStyle: row.url_style || 'path'
    };
}

export function createS3Client(config: S3Config): AwsClient {
    return new AwsClient({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region || 'auto',
        service: 's3',
    });
}

export function getS3Url(config: S3Config, filename: string): string {
    const path = filename.startsWith('/') ? filename : '/' + filename;
    if (config.urlStyle === 'host') {
         // https://bucket.endpoint/key
         // Assumes endpoint is https://s3.example.com
         const url = new URL(config.endpoint);
         url.hostname = `${config.bucket}.${url.hostname}`;
         return `${url.origin}${path}`;
    } else {
        // Path sytle: https://endpoint/bucket/key
        return `${config.endpoint}/${config.bucket}${path}`;
    }
}

export async function uploadToS3(client: AwsClient, config: S3Config, filename: string, body: ArrayBuffer | ReadableStream, contentType: string): Promise<void> {
    // Construct URL based on style
    const urlStr = getS3Url(config, filename);
    
    // For AWS4Fetch, we might need to handle host header for virtual host style if the client doesn't automatically?
    // AwsClient usually handles it if we pass the full URL.
    
    const res = await client.fetch(urlStr, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType
        },
        body
    });

    if (!res.ok) {
        throw new Error(`S3 Upload Failed: ${res.status} ${await res.text()}`);
    }
}

export async function deleteFromS3(client: AwsClient, config: S3Config, filename: string): Promise<void> {
    const urlStr = getS3Url(config, filename);
    await client.fetch(urlStr, { method: 'DELETE' });
}
