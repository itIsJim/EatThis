import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const parseResponse = async (response) => {
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body?.detail || `HTTP error! Status: ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
};

const authHeaders = async () => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getConfig = async () => {
    const response = await fetch(`${API_URL}/config`);
    return parseResponse(response);
};

export const getMe = async () => {
    const response = await fetch(`${API_URL}/auth/me`, { headers: await authHeaders() });
    return parseResponse(response);
};

export const nextUploadImage = async (imageFile, options = {}) => {
    const response = await fetch(`${API_URL}/image/upload`, {
        method: 'POST',
        body: imageFile,
        ...options,
    });
    return parseResponse(response);
};

export const nextSegmentImage = async (imageFile, options = {}) => {
    const response = await fetch(`${API_URL}/image/segment`, {
        method: 'POST',
        body: imageFile,
        ...options,
    });
    return parseResponse(response);
};

export const nextRecipeDescription = async (msg, options = {}) => {
    const response = await fetch(`${API_URL}/recipe/description`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(await authHeaders()),
        },
        body: JSON.stringify({ message: msg }),
        ...options,
    });
    return parseResponse(response);
};

export const nextDalleGeneration = async (msg, options = {}) => {
    const response = await fetch(`${API_URL}/dalle/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(await authHeaders()),
        },
        body: JSON.stringify({ message: msg }),
        ...options,
    });
    return parseResponse(response);
};
