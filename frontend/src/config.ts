// Centralized configuration
const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (!envUrl) return 'http://localhost:8080';
    if (envUrl.startsWith('http')) return envUrl;
    return `https://${envUrl}`; // Render provides host without protocol
};

export const API_BASE_URL = getApiUrl();
