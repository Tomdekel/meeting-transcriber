"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchGlobal, type SearchResult } from "@/lib/api";
import {
  MessageSquare,
  User,
  Building2,
  FolderKanban,
  MapPin,
  Calendar,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const entityIcons: Record<string, React.ElementType> = {
  person: User,
  organization: Building2,
  project: FolderKanban,
  location: MapPin,
  date: Calendar,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Open with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes
  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await searchGlobal(query);
        setResults(data.results || []);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      if (result.type === "session") {
        router.push(`/session/${result.id}`);
      } else if (result.type === "entity") {
        router.push(`/entities?id=${result.id}`);
      }
    },
    [router]
  );

  const sessionResults = results.filter((r) => r.type === "session");
  const entityResults = results.filter((r) => r.type === "entity");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="חפש שיחות, אנשים, פרויקטים..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
        )}

        {!loading && query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            הקלד לפחות 2 תווים לחיפוש
          </div>
        )}

        {sessionResults.length > 0 && (
          <CommandGroup heading="שיחות">
            {sessionResults.map((result) => (
              <CommandItem
                key={result.id}
                value={result.id}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{result.title}</p>
                  {result.highlight && (
                    <p className="text-xs text-muted-foreground truncate">
                      ...{result.highlight}...
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {entityResults.length > 0 && (
          <CommandGroup heading="ישויות">
            {entityResults.map((result) => {
              const Icon = entityIcons[result.entityType || ""] || User;
              return (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.entityType}
                    </p>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
