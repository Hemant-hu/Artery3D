// Centralized API configuration for Artery3D
// Reads the production backend URL from Vite environment variable VITE_API_URL
// Falls back to local FastAPI server (http://127.0.0.1:8000) for local development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default API_BASE_URL;
