"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listSessions, deleteSession, updateSession, Session } from "@/lib/api";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Upload,
  Mic,
  Calendar,
  Languages,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  MessageSquare,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConversationsPage() {
  return (
    <Suspense fallback={<ConversationsLoading />}>
      <ConversationsContent />
    </Suspense>
  );
}

function ConversationsLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3 mb-3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function ConversationsContent() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (editingSession) {
      setEditTitle(editingSession.title || editingSession.audioFileName);
    }
  }, [editingSession]);

  // Filter sessions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sessions.filter(
        (session) =>
          session.title?.toLowerCase().includes(query) ||
          session.audioFileName?.toLowerCase().includes(query) ||
          session.context?.toLowerCase().includes(query)
      );
      setFilteredSessions(filtered);
    }
  }, [searchQuery, sessions]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listSessions({ page: 1, pageSize: 50 });
      setSessions(response.sessions);
    } catch (err: any) {
      setError(err.message || "שגיאה בטעינת השיחות");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="status-completed border-0">
            הושלם
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="status-processing border-0">
            <Loader2 className="w-3 h-3 me-1 animate-spin" />
            מעבד
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="status-failed border-0">
            נכשל
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="status-pending border-0">
            ממתין
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "עכשיו";
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;

    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    if (!deletingSession) return;
    try {
      await deleteSession(deletingSession.id);
      await loadSessions();
      setDeletingSession(null);
    } catch (err) {
      setError("נכשל במחיקת השיחה");
      setDeletingSession(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    try {
      await updateSession(editingSession.id, { title: editTitle });
      await loadSessions();
      setEditingSession(null);
    } catch (err) {
      setError("נכשל בעדכון שם השיחה");
      setEditingSession(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">השיחות שלך</h1>
            <p className="text-sm text-muted-foreground mt-1">
              כל התמלולים והסיכומים שלך יופיעו כאן
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/conversations/new?mode=upload">
                <Upload className="h-4 w-4 me-2" />
                העלה הקלטה
              </Link>
            </Button>
            <Button className="gradient-accent text-white" asChild>
              <Link href="/conversations/new">
                <Plus className="h-4 w-4 me-2" />
                שיחה חדשה
              </Link>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="חפש בשיחות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={loadSessions}>
                נסה שוב
              </Button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && sessions.length === 0 && (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">עדיין אין שיחות</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              תמי שומרת בשבילך את כל מה שנאמר בפגישות החשובות. התחל להקליט או להעלות
              הקלטה קיימת.
            </p>
            <div className="flex gap-3 justify-center">
              <Button className="gradient-accent text-white" asChild>
                <Link href="/conversations/new">
                  <Mic className="h-4 w-4 me-2" />
                  שיחה חדשה
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/conversations/new?mode=upload">
                  <Upload className="h-4 w-4 me-2" />
                  העלה הקלטה
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* No Search Results */}
        {!loading &&
          !error &&
          sessions.length > 0 &&
          filteredSessions.length === 0 && (
            <Card className="p-8 text-center">
              <Search className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">לא נמצאו תוצאות</h2>
              <p className="text-muted-foreground">
                נסה לחפש במילים אחרות
              </p>
            </Card>
          )}

        {/* Sessions List */}
        {!loading && !error && filteredSessions.length > 0 && (
          <div className="space-y-2">
            {filteredSessions.map((session) => (
              <Link key={session.id} href={`/session/${session.id}`}>
                <Card className="p-3 hover:shadow-md transition-all cursor-pointer group hover:border-primary/30">
                  <div className="flex items-center justify-between gap-3">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title Row */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {session.title || session.context || session.audioFileName?.replace(/\.[^/.]+$/, '') || "שיחה חדשה"}
                        </h3>
                        {getStatusBadge(session.status)}
                      </div>

                      {/* Context & Meta on same line */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {session.context && session.title && (
                          <span className="truncate max-w-[200px]">
                            {session.context}
                          </span>
                        )}
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingSession(session);
                            }}
                          >
                            <Pencil className="h-4 w-4 me-2" />
                            ערוך שם
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeletingSession(session);
                            }}
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Sessions Count */}
        {!loading && !error && filteredSessions.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            מציג {filteredSessions.length} מתוך {sessions.length}{" "}
            {sessions.length === 1 ? "שיחה" : "שיחות"}
          </p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ערוך שם שיחה</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="שם השיחה..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>
              ביטול
            </Button>
            <Button onClick={handleSaveEdit}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingSession}
        onOpenChange={(open) => !open && setDeletingSession(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              למחוק שיחה?
            </DialogTitle>
            <DialogDescription>
              האם את/ה בטוח/ה שברצונך למחוק את &quot;
              {deletingSession?.title || deletingSession?.audioFileName}&quot;?
              פעולה זו תמחק לצמיתות את התמלול, הסיכום וכל המידע הקשור.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSession(null)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
