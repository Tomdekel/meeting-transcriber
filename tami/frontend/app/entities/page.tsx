"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listEntities,
  getEntity,
  deleteEntity,
  type Entity,
  type EntityWithMentions,
} from "@/lib/api";
import {
  Search,
  User,
  Building2,
  FolderKanban,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Gavel,
  Loader2,
  Trash2,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const entityConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  person: { icon: User, label: "אנשים", color: "entity-person" },
  organization: { icon: Building2, label: "ארגונים", color: "entity-organization" },
  project: { icon: FolderKanban, label: "פרויקטים", color: "entity-project" },
  location: { icon: MapPin, label: "מיקומים", color: "entity-location" },
  date: { icon: Calendar, label: "תאריכים", color: "entity-date" },
  time: { icon: Clock, label: "זמנים", color: "entity-time" },
  price: { icon: DollarSign, label: "מחירים", color: "entity-price" },
  deliverable: { icon: FileText, label: "תוצרים", color: "entity-deliverable" },
  decision: { icon: Gavel, label: "החלטות", color: "entity-decision" },
};

export default function EntitiesPage() {
  return (
    <Suspense fallback={<EntitiesLoading />}>
      <EntitiesContent />
    </Suspense>
  );
}

function EntitiesLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-32 animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    </AppLayout>
  );
}

function EntitiesContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityWithMentions | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadEntityDetails(selectedId);
    }
  }, [selectedId]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const data = await listEntities();
      setEntities(data.entities || []);
    } catch (error) {
      console.error("Failed to load entities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntityDetails = async (entityId: string) => {
    try {
      setLoadingEntity(true);
      const entity = await getEntity(entityId);
      setSelectedEntity(entity);
    } catch (error) {
      console.error("Failed to load entity:", error);
    } finally {
      setLoadingEntity(false);
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (!confirm("האם למחוק ישות זו?")) return;
    try {
      await deleteEntity(entityId);
      setEntities((prev) => prev.filter((e) => e.id !== entityId));
      if (selectedEntity?.id === entityId) {
        setSelectedEntity(null);
      }
    } catch (error) {
      console.error("Failed to delete entity:", error);
    }
  };

  // Filter entities
  const filteredEntities = entities.filter((entity) => {
    const matchesSearch =
      !searchQuery ||
      entity.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || entity.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Group by type
  const groupedEntities = filteredEntities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  // Count by type
  const typeCounts = entities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">ישויות</h1>
          <p className="text-sm text-muted-foreground mt-1">
            כל האנשים, הארגונים והפרויקטים שהוזכרו בשיחות שלך
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="חפש ישויות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <ScrollArea className="w-full sm:w-auto">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedType === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(null)}
              >
                הכל ({entities.length})
              </Button>
              {Object.entries(entityConfig).map(([type, config]) => {
                const count = typeCounts[type] || 0;
                if (count === 0) return null;
                return (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                    className="shrink-0"
                  >
                    <config.icon className="h-4 w-4 me-1" />
                    {config.label} ({count})
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!loading && entities.length === 0 && (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">אין ישויות עדיין</h2>
            <p className="text-muted-foreground">
              ישויות יחולצו אוטומטית מהשיחות שלך
            </p>
          </Card>
        )}

        {/* No Results */}
        {!loading && entities.length > 0 && filteredEntities.length === 0 && (
          <Card className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">לא נמצאו תוצאות</h2>
            <p className="text-muted-foreground">נסה לחפש במילים אחרות</p>
          </Card>
        )}

        {/* Entity Grid */}
        {!loading && filteredEntities.length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedEntities).map(([type, typeEntities]) => {
              const config = entityConfig[type] || {
                icon: User,
                label: type,
                color: "bg-gray-100",
              };
              const Icon = config.icon;

              return (
                <div key={type}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {config.label}
                    <Badge variant="secondary">{typeEntities.length}</Badge>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {typeEntities.map((entity) => (
                      <Card
                        key={entity.id}
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => loadEntityDetails(entity.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                config.color
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{entity.value}</p>
                              <p className="text-xs text-muted-foreground">
                                {entity.mentionCount} אזכורים
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEntity(entity.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Entity Detail Dialog */}
      <Dialog
        open={!!selectedEntity}
        onOpenChange={(open) => !open && setSelectedEntity(null)}
      >
        <DialogContent className="max-w-lg">
          {loadingEntity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedEntity ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = entityConfig[selectedEntity.type];
                    const Icon = config?.icon || User;
                    return (
                      <>
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            config?.color || "bg-gray-100"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {selectedEntity.value}
                      </>
                    );
                  })()}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {entityConfig[selectedEntity.type]?.label || selectedEntity.type}
                  </span>
                  <span>{selectedEntity.mentionCount} אזכורים</span>
                </div>

                <div>
                  <h4 className="font-medium mb-2">הופיע בשיחות:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedEntity.mentions?.map((mention) => (
                      <Link
                        key={mention.id}
                        href={`/session/${mention.sessionId}`}
                        className="block"
                      >
                        <Card className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              {mention.context && (
                                <p className="text-sm text-muted-foreground truncate">
                                  &quot;{mention.context}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                    {(!selectedEntity.mentions || selectedEntity.mentions.length === 0) && (
                      <p className="text-sm text-muted-foreground">אין אזכורים</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
