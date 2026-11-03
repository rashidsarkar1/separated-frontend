import axios from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
export const resolveApiAssetUrl = (url: string) => url.startsWith("/") ? `${API_ORIGIN}${url}` : url;

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });
