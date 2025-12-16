// JWT Authentication utilities
// Using Web Crypto API available in CloudFlare Workers

import type { JWTPayload, User } from '../types';

const encoder = new TextEncoder();

async function createHmacKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

function base64UrlEncode(data: ArrayBuffer | string): string {
    const bytes = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export async function createToken(user: User, secret: string, expiresIn = 7 * 24 * 60 * 60): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
        iat: now,
        exp: now + expiresIn
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const message = `${headerB64}.${payloadB64}`;

    const key = await createHmacKey(secret);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const signatureB64 = base64UrlEncode(signature);

    return `${message}.${signatureB64}`;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;
        const message = `${headerB64}.${payloadB64}`;

        const key = await createHmacKey(secret);
        const signature = base64UrlDecode(signatureB64);
        const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));

        if (!isValid) return null;

        const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    // Using SHA-256 with salt for password hashing
    // Note: In production, consider using a proper password hashing library
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

    const data = encoder.encode(saltHex + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        const [saltHex, expectedHash] = storedHash.split(':');
        if (!saltHex || !expectedHash) return false;

        const data = encoder.encode(saltHex + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return hashHex === expectedHash;
    } catch {
        return false;
    }
}

export function extractToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}
