import type { AxiosError } from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const ax = error as AxiosError<{ error?: string }>;
  const msg = ax.response?.data?.error;
  if (typeof msg === "string" && msg.trim()) return msg;
  return fallback;
}
