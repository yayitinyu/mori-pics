// Type definitions for mori-pics

export interface Env {
    DB: D1Database;
    R2: R2Bucket;
    CUSTOM_DOMAIN: string;
    JWT_SECRET: string;
}

export interface User {
    id: number;
    username: string;
    password_hash: string;
    role: 'admin' | 'guest';
    created_at: string;
}

export interface Image {
    id: number;
    user_id: number | null;
    filename: string;
    original_name: string | null;
    url: string;
    size: number;
    width: number | null;
    height: number | null;
    mime_type: string | null;
    tags: string; // JSON array string
    description: string;
    is_public: number;
    view_count: number;
    created_at: string;
}

export interface DailyStats {
    id: number;
    date: string;
    upload_count: number;
    view_count: number;
    upload_size: number;
}

export interface JWTPayload {
    sub: number; // user id
    username: string;
    role: 'admin' | 'guest';
    exp: number;
    iat: number;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ImageListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    tags?: string;
}

export interface UploadResult {
    id: number;
    url: string;
    filename: string;
    size: number;
    savedBytes?: number; // WebP compression savings
}

export interface StatsOverview {
    totalImages: number;
    totalSize: number;
    totalViews: number;
    todayUploads: number;
    todaySize: number;
}
