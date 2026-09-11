import axios, { AxiosInstance } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api: AxiosInstance = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, clear tokens and bounce to login — keeps every page from having to
// handle auth expiry individually.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export type Job = {
  id: string;
  name: string;
  target_url: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "paused";
  pages_processed: number;
  records_found: number;
  errors_count: number;
  created_at: string;
};

export type Lead = {
  id: string;
  job_id: string;
  company_name: string | null;
  website_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  source_url: string;
  status: string;
  tags: string[] | null;
  is_favorite: boolean;
  scraped_at: string;
};

export type UsageSummary = {
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  total_records: number;
  monthly_credits: number;
  credits_used_this_period: number;
  credits_remaining: number;
  plan: string;
  recent_jobs: { id: string; name: string; status: string; records_found: number; created_at: string }[];
};
