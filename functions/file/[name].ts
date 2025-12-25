import { Env } from '../../src/types';
import { error } from '../../src/utils/response';
import { getS3Config, createS3Client, getS3Url } from '../../src/utils/s3';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env, params } = context;
    const name = params.name as string;

    if (!name) return error('Filename required', 400);

    // Try to get S3 config
    const s3Config = await getS3Config(env.DB);

    if (s3Config && s3Config.enabled) {
        // Proxy from S3
        try {
             const client = createS3Client(s3Config);
             const urlStr = getS3Url(s3Config, name);

             const res = await client.fetch(urlStr);
             
             if (res.ok) {
                 const headers = new Headers(res.headers);
                 // Ensure cache headers
                 headers.set('Cache-Control', 'public, max-age=31536000');
                 return new Response(res.body, {
                     status: 200,
                     headers
                 });
             }
        } catch (e) {
             console.error("S3 Proxy Error", e);
        }
    }

    // Fallback to R2
    const obj = await env.R2.get(name);
    if (!obj) return error('Not found', 404);

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(obj.body, { headers });
};
