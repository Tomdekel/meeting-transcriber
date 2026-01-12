"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  getTranscriptionStatus,
  updateSummary,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  sendChatMessage,
  getSessionEntities,
  getSessionTags,
  type Entity,
  type Tag,
} from "@/lib/api";
import {
  ChevronRight,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Clock,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Send,
  User,
  Building2,
  FolderKanban,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Gavel,
  MessageSquare,
  Search,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatus {
  sessionId: string;
  status: string;
  audioFileName?: string;
  audioFileUrl?: string;
  context?: string;
  title?: string;
  error?: string;
  transcript?: {
    segments: Array<{
      speakerId: string;
      speakerName?: string;
      text: string;
      startTime: number;
      endTime: number;
    }>;
  };
  summary?: {
    id?: string;
    overview: string;
    keyPoints: string[];
    actionItems: Array<{
      id?: string;
      summaryId?: string;
      description: string;
      assignee?: string;
      deadline?: string;
      completed?: boolean;
    }>;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const entityConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  person: { icon: User, label: "אדם", color: "entity-person" },
  organization: { icon: Building2, label: "ארגון", color: "entity-organization" },
  project: { icon: FolderKanban, label: "פרויקט", color: "entity-project" },
  location: { icon: MapPin, label: "מיקום", color: "entity-location" },
  date: { icon: Calendar, label: "תאריך", color: "entity-date" },
  time: { icon: Clock, label: "זמן", color: "entity-time" },
  price: { icon: DollarSign, label: "מחיר", color: "entity-price" },
  deliverable: { icon: FileText, label: "תוצר", color: "entity-deliverable" },
  decision: { icon: Gavel, label: "החלטה", color: "entity-decision" },
};

const SPEAKER_COLORS = [
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-orange-50 border-orange-200",
  "bg-purple-50 border-purple-200",
  "bg-pink-50 border-pink-200",
];

export default function SessionPage() {
  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionContent />
    </Suspense>
  );
}

function SessionLoading() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </AppLayout>
  );
}

function SessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // Speaker color mapping
  const speakerColorMapRef = useRef(new Map<string, string>());

  // Summary editing state
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedOverview, setEditedOverview] = useState("");
  const [editedKeyPoints, setEditedKeyPoints] = useState<string[]>([]);
  const [savingSummary, setSavingSummary] = useState(false);

  // Action item state
  const [newActionItem, setNewActionItem] = useState("");
  const [addingActionItem, setAddingActionItem] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const getSpeakerColor = (speakerId: string) => {
    if (!speakerColorMapRef.current.has(speakerId)) {
      const colorIndex = speakerColorMapRef.current.size % SPEAKER_COLORS.length;
      speakerColorMapRef.current.set(speakerId, SPEAKER_COLORS[colorIndex]);
    }
    return speakerColorMapRef.current.get(speakerId) || SPEAKER_COLORS[0];
  };

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const status = await getTranscriptionStatus(sessionId);
        setSession(status);
        setLoading(false);

        if (status.status === "processing" || status.status === "pending") {
          setTimeout(fetchStatus, 3000);
        } else if (status.status === "completed") {
          // Fetch entities and tags
          try {
            const [entitiesData, tagsData] = await Promise.all([
              getSessionEntities(sessionId),
              getSessionTags(sessionId),
            ]);
            setEntities(entitiesData || []);
            setTags(tagsData || []);
          } catch (err) {
            console.error("Failed to load entities/tags:", err);
          }
        }
      } catch (err: any) {
        setError(err.message || "שגיאה בטעינת השיחה");
        setLoading(false);
      }
    };

    fetchStatus();
  }, [sessionId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Audio handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const seekToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Summary handlers
  const handleEditSummary = () => {
    if (session?.summary) {
      setEditedOverview(session.summary.overview);
      setEditedKeyPoints([...session.summary.keyPoints]);
      setIsEditingSummary(true);
    }
  };

  const handleSaveSummary = async () => {
    if (!session) return;
    try {
      setSavingSummary(true);
      await updateSummary(sessionId, {
        overview: editedOverview,
        keyPoints: editedKeyPoints,
      });
      setSession({
        ...session,
        summary: session.summary
          ? { ...session.summary, overview: editedOverview, keyPoints: editedKeyPoints }
          : undefined,
      });
      setIsEditingSummary(false);
    } catch (error) {
      console.error("Failed to save summary:", error);
    } finally {
      setSavingSummary(false);
    }
  };

  // Action item handlers
  const handleAddActionItem = async () => {
    if (!newActionItem.trim()) return;
    try {
      setAddingActionItem(true);
      const result = await createActionItem(sessionId, { description: newActionItem });
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: [
              ...session.summary.actionItems,
              { id: result.id, description: newActionItem, completed: false },
            ],
          },
        });
      }
      setNewActionItem("");
    } catch (error) {
      console.error("Failed to add action item:", error);
    } finally {
      setAddingActionItem(false);
    }
  };

  const handleToggleActionItem = async (itemId: string, completed: boolean) => {
    try {
      await updateActionItem(sessionId, itemId, { completed });
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: session.summary.actionItems.map((item) =>
              item.id === itemId ? { ...item, completed } : item
            ),
          },
        });
      }
    } catch (error) {
      console.error("Failed to update action item:", error);
    }
  };

  const handleDeleteActionItem = async (itemId: string) => {
    try {
      await deleteActionItem(sessionId, itemId);
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: session.summary.actionItems.filter((item) => item.id !== itemId),
          },
        });
      }
    } catch (error) {
      console.error("Failed to delete action item:", error);
    }
  };

  // Chat handler
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSending(true);

    try {
      const response = await sendChatMessage(sessionId, userMessage);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.content }]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "שגיאה בקבלת תשובה. נסה שוב." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Filter transcript segments
  const filteredSegments = session?.transcript?.segments.filter((segment) =>
    !transcriptSearch || segment.text.toLowerCase().includes(transcriptSearch.toLowerCase())
  ) || [];

  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  // Loading state
  if (loading) {
    return <SessionLoading />;
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <Card className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">שגיאה בטעינת השיחה</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" asChild>
            <Link href="/conversations">חזור לשיחות</Link>
          </Button>
        </Card>
      </AppLayout>
    );
  }

  // Processing state
  if (session?.status === "processing" || session?.status === "pending") {
    return (
      <AppLayout>
        <Card className="p-8 text-center max-w-md mx-auto">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="text-lg font-semibold mb-2">מעבד את השיחה...</h2>
          <p className="text-muted-foreground mb-2">התמלול והסיכום יהיו מוכנים בקרוב</p>
          <p className="text-xs text-muted-foreground">זה עשוי לקחת מספר דקות</p>
        </Card>
      </AppLayout>
    );
  }

  // Failed state
  if (session?.status === "failed") {
    return (
      <AppLayout>
        <Card className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">התמלול נכשל</h2>
          <p className="text-muted-foreground mb-6">{session.error || "אירעה שגיאה בעיבוד"}</p>
          <Button variant="outline" asChild>
            <Link href="/conversations">חזור לשיחות</Link>
          </Button>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/conversations"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
          >
            <ChevronRight className="h-4 w-4" />
            חזור לשיחות
          </Link>
          <h1 className="text-2xl font-bold">
            {session?.title || session?.audioFileName || "שיחה"}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {duration > 0 ? formatTime(duration) : "--:--"}
            </span>
            <span className="flex items-center gap-1">
              <Languages className="h-4 w-4" />
              עברית
            </span>
          </div>
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Audio Player */}
        {session?.audioFileUrl && (
          <Card className="p-4">
            <audio
              ref={audioRef}
              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${session.audioFileUrl}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 mr-[-2px]" />}
              </Button>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-12 text-left tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12 tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>

              <Button variant="outline" size="sm" onClick={changePlaybackRate}>
                {playbackRate}x
              </Button>
            </div>
          </Card>
        )}

        {/* Main Content with Tabs */}
        <Tabs defaultValue="transcript" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transcript">תמלול</TabsTrigger>
            <TabsTrigger value="summary">סיכום</TabsTrigger>
            <TabsTrigger value="entities">
              ישויות
              {entities.length > 0 && (
                <Badge variant="secondary" className="mr-2 text-xs">
                  {entities.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="qa">שאלות</TabsTrigger>
          </TabsList>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="mt-4">
            <Card className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="חפש בתמלול..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* Segments */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {filteredSegments.map((segment, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg p-3 border cursor-pointer hover:shadow-sm transition-shadow",
                      getSpeakerColor(segment.speakerId)
                    )}
                    onClick={() => seekToTime(segment.startTime)}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span className="font-medium">
                        {segment.speakerName || segment.speakerId}
                      </span>
                      <span>•</span>
                      <span>{formatTime(segment.startTime)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  </div>
                ))}
                {filteredSegments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {transcriptSearch ? "לא נמצאו תוצאות" : "אין תמלול זמין"}
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4">
            <Card className="p-4 space-y-6">
              {session?.summary ? (
                <>
                  {/* Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">סיכום השיחה</h3>
                      {!isEditingSummary && (
                        <Button variant="ghost" size="sm" onClick={handleEditSummary}>
                          <Edit2 className="h-4 w-4 me-1" />
                          ערוך
                        </Button>
                      )}
                    </div>
                    {isEditingSummary ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedOverview}
                          onChange={(e) => setEditedOverview(e.target.value)}
                          className="w-full h-24 px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveSummary} disabled={savingSummary}>
                            <Save className="h-4 w-4 me-1" />
                            {savingSummary ? "שומר..." : "שמור"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingSummary(false)}
                          >
                            <X className="h-4 w-4 me-1" />
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {session.summary.overview}
                      </p>
                    )}
                  </div>

                  {/* Key Points */}
                  <div>
                    <h4 className="font-medium mb-3">נקודות עיקריות</h4>
                    <ul className="space-y-2">
                      {session.summary.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span className="text-muted-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Items */}
                  <div>
                    <h4 className="font-medium mb-3">משימות</h4>
                    <div className="space-y-2">
                      {session.summary.actionItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 group">
                          <input
                            type="checkbox"
                            checked={item.completed || false}
                            onChange={(e) =>
                              item.id && handleToggleActionItem(item.id, e.target.checked)
                            }
                            className="mt-1 w-4 h-4 accent-primary"
                          />
                          <span
                            className={cn(
                              "flex-1 text-sm",
                              item.completed
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            )}
                          >
                            {item.description}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => item.id && handleDeleteActionItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}

                      {/* Add new task */}
                      <div className="flex gap-2 mt-3">
                        <Input
                          value={newActionItem}
                          onChange={(e) => setNewActionItem(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddActionItem()}
                          placeholder="הוסף משימה חדשה..."
                          className="flex-1"
                        />
                        <Button
                          onClick={handleAddActionItem}
                          disabled={addingActionItem || !newActionItem.trim()}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {addingActionItem ? "..." : "הוסף"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">אין סיכום זמין</p>
              )}
            </Card>
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities" className="mt-4">
            <Card className="p-4">
              {entities.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedEntities).map(([type, typeEntities]) => {
                    const config = entityConfig[type] || {
                      icon: User,
                      label: type,
                      color: "bg-gray-100",
                    };
                    const Icon = config.icon;

                    return (
                      <div key={type}>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {config.label}
                          <Badge variant="secondary" className="text-xs">
                            {typeEntities.length}
                          </Badge>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {typeEntities.map((entity) => (
                            <Link key={entity.id} href={`/entities?id=${entity.id}`}>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "cursor-pointer hover:shadow-sm transition-shadow",
                                  config.color
                                )}
                              >
                                {entity.value}
                                <span className="text-muted-foreground mr-1">
                                  ({entity.mentionCount})
                                </span>
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">לא נמצאו ישויות בשיחה זו</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Q&A Tab */}
          <TabsContent value="qa" className="mt-4">
            <Card className="p-4">
              <div className="flex flex-col h-[50vh]">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  שאלות ותשובות
                </h3>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">שאל שאלה על השיחה...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        למשל: &quot;מה היו הנקודות העיקריות?&quot;
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-lg p-3 max-w-[85%]",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground mr-auto"
                          : "bg-muted ml-auto"
                      )}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                  {isSending && (
                    <div className="bg-muted rounded-lg p-3 max-w-[85%] ml-auto">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="שאל שאלה על השיחה..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!chatInput.trim() || isSending}>
                    <Send className="h-4 w-4 me-1" />
                    שלח
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
