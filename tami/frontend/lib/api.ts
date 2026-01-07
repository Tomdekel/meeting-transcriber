import axios, { AxiosInstance, AxiosError } from "axios";
import { supabase } from "./supabase";

// Use environment variable, or production backend URL, or localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? "https://backend-seven-brown-94.vercel.app"
    : "http://localhost:8000");

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

// Types
export interface UploadResponse {
  uploadId: string;
  fileName: string;
  fileSize: number;
  filePath: string;
}

export interface TranscriptionRequest {
  uploadId: string;
  context: string;
  participants?: string[];
  transcriptionProvider?: string;
  transcriptionModel?: string;
  summaryModel?: string;
  userId?: string;
}

export interface TranscriptionStatusResponse {
  sessionId: string;
  status: "pending" | "processing" | "completed" | "failed";
  audioFileName?: string;
  audioFileUrl?: string;
  transcript?: Transcript;
  summary?: Summary;
  error?: string;
}

export interface Transcript {
  id: string;
  sessionId: string;
  language: string;
  duration?: number;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  id: string;
  transcriptId: string;
  speakerId: string;
  speakerName?: string;
  text: string;
  startTime: number;
  endTime: number;
  order: number;
}

export interface Summary {
  id: string;
  sessionId: string;
  overview: string;
  keyPoints: string[];
  actionItems: ActionItem[];
}

export interface ActionItem {
  id: string;
  summaryId: string;
  description: string;
  assignee?: string;
  deadline?: string;
  completed: boolean;
}

export interface Session {
  id: string;
  title?: string;
  userId?: string;
  audioFileName: string;
  audioFileUrl: string;
  audioStreamUrl?: string;
  context: string;
  language: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  transcriptionProvider: string;
  transcriptionModel: string;
  summaryModel: string;
  chatModel: string;
}

// API functions

/**
 * Upload an audio file
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<UploadResponse>("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

/**
 * Start transcription
 */
export async function startTranscription(
  request: TranscriptionRequest
): Promise<TranscriptionStatusResponse> {
  const response = await apiClient.post<TranscriptionStatusResponse>(
    "/api/transcribe",
    request
  );
  return response.data;
}

/**
 * Get transcription status
 */
export async function getTranscriptionStatus(
  sessionId: string
): Promise<TranscriptionStatusResponse> {
  const response = await apiClient.get<TranscriptionStatusResponse>(
    `/api/transcribe/${sessionId}/status`
  );
  return response.data;
}

/**
 * List sessions
 */
export async function listSessions(params?: {
  userId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ sessions: Session[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get("/api/sessions", { params });
  return response.data;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session> {
  const response = await apiClient.get<Session>(`/api/sessions/${sessionId}`);
  return response.data;
}

/**
 * Update speaker names
 */
export async function updateSpeakers(
  sessionId: string,
  speakers: Record<string, string>
): Promise<void> {
  await apiClient.patch(`/api/sessions/${sessionId}/speakers`, { speakers });
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/sessions/${sessionId}`);
}

/**
 * Update session metadata
 */
export async function updateSession(
  sessionId: string,
  updates: { title?: string; context?: string; language?: string }
): Promise<Session> {
  const response = await apiClient.patch<Session>(`/api/sessions/${sessionId}`, updates);
  return response.data;
}

/**
 * Send chat message
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<ChatMessage> {
  const response = await apiClient.post<ChatMessage>("/api/chat", {
    sessionId,
    message,
  });
  return response.data;
}

/**
 * Get chat history
 */
export async function getChatHistory(
  sessionId: string
): Promise<{ messages: ChatMessage[]; sessionId: string }> {
  const response = await apiClient.get(`/api/sessions/${sessionId}/chat`);
  return response.data;
}

/**
 * Clear chat history
 */
export async function clearChatHistory(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/sessions/${sessionId}/chat`);
}

/**
 * Update summary
 */
export async function updateSummary(
  sessionId: string,
  update: { overview?: string; keyPoints?: string[] }
): Promise<void> {
  await apiClient.patch(`/api/sessions/${sessionId}/summary`, update);
}

/**
 * Create action item
 */
export async function createActionItem(
  sessionId: string,
  actionItem: { description: string; assignee?: string; deadline?: string }
): Promise<{ id: string }> {
  const response = await apiClient.post(
    `/api/sessions/${sessionId}/action-items`,
    actionItem
  );
  return response.data;
}

/**
 * Update action item
 */
export async function updateActionItem(
  sessionId: string,
  actionItemId: string,
  update: { completed?: boolean; assignee?: string; deadline?: string; description?: string }
): Promise<void> {
  await apiClient.patch(
    `/api/sessions/${sessionId}/action-items/${actionItemId}`,
    update
  );
}

/**
 * Delete action item
 */
export async function deleteActionItem(
  sessionId: string,
  actionItemId: string
): Promise<void> {
  await apiClient.delete(`/api/sessions/${sessionId}/action-items/${actionItemId}`);
}

/**
 * Get user settings
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const response = await apiClient.get<UserSettings>(`/api/settings/${userId}`);
  return response.data;
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  await apiClient.put(`/api/settings/${userId}`, settings);
}

/**
 * Test API connection
 */
export async function testConnection(params: {
  provider: string;
  apiKey: string;
  model?: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post("/api/settings/test-connection", params);
  return response.data;
}

/**
 * Start a recording session
 */
export async function startRecording(): Promise<{ recordingId: string; status: string; message: string }> {
  const response = await apiClient.post("/api/record/start");
  return response.data;
}

/**
 * Stop a recording session
 */
export async function stopRecording(recordingId: string): Promise<UploadResponse & { duration: number }> {
  const response = await apiClient.post(`/api/record/${recordingId}/stop`);
  return response.data;
}

/**
 * Cancel a recording session
 */
export async function cancelRecording(recordingId: string): Promise<void> {
  await apiClient.delete(`/api/record/${recordingId}`);
}

/**
 * Get recording status
 */
export async function getRecordingStatus(recordingId: string): Promise<{
  recordingId: string;
  status: string;
  duration: number;
  chunksReceived: number;
  totalSize: number;
}> {
  const response = await apiClient.get(`/api/record/${recordingId}/status`);
  return response.data;
}

// Error handler
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail: string }>;
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  return "שגיאה לא צפויה";
}

export default apiClient;
