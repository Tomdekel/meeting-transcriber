import axios, { AxiosInstance, AxiosError } from "axios";
import { supabase } from "./supabase";

// Use environment variable, or production backend URL, or localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? "https://backend-seven-brown-94.vercel.app"
    : "http://localhost:8000");

// Development mode - skip auth
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';
const DEV_USER_ID = "dev-user-local-testing";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to all requests (skip in dev mode)
apiClient.interceptors.request.use(async (config) => {
  if (IS_DEV) {
    // In dev mode, add user_id as query param for endpoints that need it
    return config
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

// Helper to get current user ID (real or dev mock)
export async function getCurrentUserId(): Promise<string> {
  if (IS_DEV) {
    return DEV_USER_ID;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || DEV_USER_ID;
}

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

// Search types
export interface SearchResult {
  id: string;
  type: "session" | "entity";
  title: string;
  highlight?: string;
  entityType?: string;
  createdAt?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// Entity types
export interface Entity {
  id: string;
  userId: string;
  type: string;
  value: string;
  normalizedValue: string;
  mentionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EntityMention {
  id: string;
  entityId: string;
  sessionId: string;
  context: string;
  createdAt: string;
  session?: Session;
}

export interface EntityWithMentions extends Entity {
  mentions: EntityMention[];
}

// Tag types
export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
  source: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { sessions: number };
}

export interface SessionTag {
  id: string;
  sessionId: string;
  tagId: string;
  tag?: Tag;
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
  // Add userId for dev mode if not provided
  const userId = request.userId || await getCurrentUserId();
  const response = await apiClient.post<TranscriptionStatusResponse>(
    "/api/transcribe",
    { ...request, userId }
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
  // Add userId for dev mode if not provided
  const userId = params?.userId || await getCurrentUserId();
  const response = await apiClient.get("/api/sessions", { params: { ...params, userId } });
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

// ============================================
// Search API
// ============================================

/**
 * Global search across sessions and entities
 */
export async function searchGlobal(
  query: string,
  params?: { types?: string[]; limit?: number }
): Promise<SearchResponse> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get<SearchResponse>("/api/search", {
    params: { query, userId, ...params },
  });
  return response.data;
}

/**
 * Search within a specific session's transcript
 */
export async function searchSession(
  sessionId: string,
  query: string
): Promise<{ matches: Array<{ segmentId: string; text: string; highlight: string }> }> {
  const response = await apiClient.get(`/api/sessions/${sessionId}/search`, {
    params: { query },
  });
  return response.data;
}

/**
 * Get search suggestions
 */
export async function getSearchSuggestions(
  query: string
): Promise<{ suggestions: string[] }> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get("/api/search/suggestions", {
    params: { query, userId },
  });
  return response.data;
}

// ============================================
// Entity API
// ============================================

/**
 * List all entities for current user
 */
export async function listEntities(params?: {
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entities: Entity[]; total: number }> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get("/api/entities", {
    params: { userId, ...params },
  });
  return response.data;
}

/**
 * Get entity by ID with mentions
 */
export async function getEntity(entityId: string): Promise<EntityWithMentions> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get<EntityWithMentions>(`/api/entities/${entityId}`, {
    params: { userId },
  });
  return response.data;
}

/**
 * Get entities for a specific session
 */
export async function getSessionEntities(sessionId: string): Promise<Entity[]> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get<{ entities: Entity[]; total: number }>(`/api/sessions/${sessionId}/entities`, {
    params: { userId },
  });
  return response.data.entities;
}

/**
 * Delete an entity
 */
export async function deleteEntity(entityId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await apiClient.delete(`/api/entities/${entityId}`, {
    params: { userId },
  });
}

// ============================================
// Tag API
// ============================================

/**
 * List all tags for current user
 */
export async function listTags(params?: {
  includeHidden?: boolean;
}): Promise<{ tags: Tag[] }> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get("/api/tags", {
    params: { userId, ...params },
  });
  return response.data;
}

/**
 * Create a new tag
 */
export async function createTag(data: {
  name: string;
  color?: string;
}): Promise<Tag> {
  const userId = await getCurrentUserId();
  const response = await apiClient.post<Tag>("/api/tags", data, {
    params: { userId },
  });
  return response.data;
}

/**
 * Update a tag
 */
export async function updateTag(
  tagId: string,
  data: { name?: string; color?: string; isVisible?: boolean }
): Promise<Tag> {
  const userId = await getCurrentUserId();
  const response = await apiClient.patch<Tag>(`/api/tags/${tagId}`, data, {
    params: { userId },
  });
  return response.data;
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await apiClient.delete(`/api/tags/${tagId}`, {
    params: { userId },
  });
}

/**
 * Get tags for a session
 */
export async function getSessionTags(sessionId: string): Promise<Tag[]> {
  const userId = await getCurrentUserId();
  const response = await apiClient.get<{ tags: Tag[]; total: number }>(`/api/sessions/${sessionId}/tags`, {
    params: { userId },
  });
  return response.data.tags;
}

/**
 * Add tag to session
 */
export async function addSessionTag(sessionId: string, tagId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await apiClient.post(`/api/sessions/${sessionId}/tags`, null, {
    params: { userId, tagId },
  });
}

/**
 * Remove tag from session
 */
export async function removeSessionTag(sessionId: string, tagId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await apiClient.delete(`/api/sessions/${sessionId}/tags/${tagId}`, {
    params: { userId },
  });
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
