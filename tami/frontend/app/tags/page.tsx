"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { listTags, createTag, updateTag, deleteTag, type Tag } from "@/lib/api";
import {
  Tag as TagIcon,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const colorOptions = [
  { name: "gray", value: "#6B7280" },
  { name: "red", value: "#EF4444" },
  { name: "orange", value: "#F97316" },
  { name: "yellow", value: "#EAB308" },
  { name: "green", value: "#22C55E" },
  { name: "teal", value: "#14B8A6" },
  { name: "blue", value: "#3B82F6" },
  { name: "indigo", value: "#6366F1" },
  { name: "purple", value: "#A855F7" },
  { name: "pink", value: "#EC4899" },
];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    loadTags();
  }, [showHidden]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await listTags({ includeHidden: showHidden });
      setTags(data.tags || []);
    } catch (error) {
      console.error("Failed to load tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag({ name: newTagName, color: newTagColor });
      setTags((prev) => [...prev, tag]);
      setCreatingTag(false);
      setNewTagName("");
      setNewTagColor("#3B82F6");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    try {
      const updated = await updateTag(editingTag.id, {
        name: editName,
        color: editColor,
      });
      setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTag(null);
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleToggleVisibility = async (tag: Tag) => {
    try {
      const updated = await updateTag(tag.id, { isVisible: !tag.isVisible });
      setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("האם למחוק תגית זו?")) return;
    try {
      await deleteTag(tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  // Filter tags
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate manual and auto tags
  const manualTags = filteredTags.filter((t) => !t.source?.startsWith("auto:"));
  const autoTags = filteredTags.filter((t) => t.source?.startsWith("auto:"));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">תגיות</h1>
            <p className="text-sm text-muted-foreground mt-1">
              נהל את התגיות שלך וסנן שיחות לפיהן
            </p>
          </div>
          <Button onClick={() => setCreatingTag(true)}>
            <Plus className="h-4 w-4 me-2" />
            תגית חדשה
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="חפש תגיות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button
            variant={showHidden ? "default" : "outline"}
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden ? <Eye className="h-4 w-4 me-2" /> : <EyeOff className="h-4 w-4 me-2" />}
            {showHidden ? "מציג מוסתרות" : "הצג מוסתרות"}
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!loading && tags.length === 0 && (
          <Card className="p-8 text-center">
            <TagIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">אין תגיות עדיין</h2>
            <p className="text-muted-foreground mb-4">
              צור תגיות לארגון השיחות שלך
            </p>
            <Button onClick={() => setCreatingTag(true)}>
              <Plus className="h-4 w-4 me-2" />
              תגית חדשה
            </Button>
          </Card>
        )}

        {/* Tags List */}
        {!loading && tags.length > 0 && (
          <div className="space-y-8">
            {/* Manual Tags */}
            {manualTags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">התגיות שלי</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {manualTags.map((tag) => (
                    <TagCard
                      key={tag.id}
                      tag={tag}
                      onEdit={() => {
                        setEditingTag(tag);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                      }}
                      onToggleVisibility={() => handleToggleVisibility(tag)}
                      onDelete={() => handleDeleteTag(tag.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Auto Tags */}
            {autoTags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  תגיות אוטומטיות
                  <Badge variant="secondary">נוצרו מהשיחות</Badge>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {autoTags.map((tag) => (
                    <TagCard
                      key={tag.id}
                      tag={tag}
                      onEdit={() => {
                        setEditingTag(tag);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                      }}
                      onToggleVisibility={() => handleToggleVisibility(tag)}
                      onDelete={() => handleDeleteTag(tag.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Tag Dialog */}
      <Dialog open={creatingTag} onOpenChange={setCreatingTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>תגית חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם התגית</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="לדוגמה: פגישות צוות"
                autoFocus
              />
            </div>
            <div>
              <Label>צבע</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform hover:scale-110",
                      newTagColor === color.value && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewTagColor(color.value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingTag(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateTag}>צור תגית</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ערוך תגית</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם התגית</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>צבע</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform hover:scale-110",
                      editColor === color.value && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setEditColor(color.value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>
              ביטול
            </Button>
            <Button onClick={handleUpdateTag}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function TagCard({
  tag,
  onEdit,
  onToggleVisibility,
  onDelete,
}: {
  tag: Tag;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-4 transition-all",
        !tag.isVisible && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <div className="min-w-0">
            <p className="font-medium truncate">{tag.name}</p>
            <p className="text-xs text-muted-foreground">
              {tag._count?.sessions || 0} שיחות
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 me-2" />
              ערוך
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleVisibility}>
              {tag.isVisible ? (
                <>
                  <EyeOff className="h-4 w-4 me-2" />
                  הסתר
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 me-2" />
                  הצג
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 me-2" />
              מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
