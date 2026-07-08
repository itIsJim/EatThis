const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const parseResponse = async (response) => {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
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
        },
        body: JSON.stringify({ message: msg }),
        ...options,
    });
    return parseResponse(response);
};
