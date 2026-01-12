"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  searchGlobal,
  type SearchResult,
  type SearchResponse,
} from "@/lib/api";
import {
  Search,
  MessageSquare,
  User,
  Building2,
  FolderKanban,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

const entityIcons: Record<string, React.ElementType> = {
  person: User,
  organization: Building2,
  project: FolderKanban,
  location: MapPin,
  date: Calendar,
  time: Clock,
  price: DollarSign,
};

const entityLabels: Record<string, string> = {
  person: "אנשים",
  organization: "ארגונים",
  project: "פרויקטים",
  location: "מיקומים",
  date: "תאריכים",
  time: "זמנים",
  price: "מחירים",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-32 animate-pulse" />
        <div className="h-12 bg-muted rounded animate-pulse" />
      </div>
    </AppLayout>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchGlobal(searchQuery);
      setResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      performSearch(query);
    }
  };

  const sessionResults = results.filter((r) => r.type === "session");
  const entityResults = results.filter((r) => r.type === "entity");

  const filteredResults =
    activeTab === "all"
      ? results
      : activeTab === "sessions"
      ? sessionResults
      : entityResults;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">חיפוש</h1>
          <p className="text-sm text-muted-foreground mt-1">
            חפש בכל השיחות, האנשים והפרויקטים שלך
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="חפש..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10 h-12 text-lg"
              autoFocus
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </form>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query && query.length >= 2 && results.length === 0 && (
          <Card className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">לא נמצאו תוצאות</h2>
            <p className="text-muted-foreground">
              נסה לחפש במילים אחרות או בודק את האיות
            </p>
          </Card>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  הכל ({results.length})
                </TabsTrigger>
                <TabsTrigger value="sessions">
                  שיחות ({sessionResults.length})
                </TabsTrigger>
                <TabsTrigger value="entities">
                  ישויות ({entityResults.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4 space-y-3">
                {filteredResults.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </TabsContent>

              <TabsContent value="sessions" className="mt-4 space-y-3">
                {sessionResults.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </TabsContent>

              <TabsContent value="entities" className="mt-4 space-y-3">
                {entityResults.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!loading && !query && (
          <Card className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">התחל לחפש</h2>
            <p className="text-muted-foreground mb-4">
              הקלד מילות חיפוש למציאת שיחות, אנשים, פרויקטים ועוד
            </p>
            <p className="text-xs text-muted-foreground">
              טיפ: לחץ <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Cmd</kbd> +{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">K</kbd> לחיפוש מהיר מכל מקום
            </p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const Icon =
    result.type === "session"
      ? MessageSquare
      : entityIcons[result.entityType || ""] || User;

  const href =
    result.type === "session"
      ? `/session/${result.id}`
      : `/entities?id=${result.id}`;

  return (
    <Link href={href}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              result.type === "session"
                ? "bg-blue-100 text-blue-700"
                : `entity-${result.entityType}`
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{result.title}</h3>
              {result.entityType && (
                <Badge variant="outline" className="text-xs">
                  {entityLabels[result.entityType] || result.entityType}
                </Badge>
              )}
            </div>
            {result.highlight && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                ...{result.highlight}...
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
