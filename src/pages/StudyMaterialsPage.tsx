import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, FileText, BookOpen, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const StudyMaterialsPage = () => {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["study-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subjects = useMemo(
    () => [...new Set(materials.map((m) => m.subject))].sort(),
    [materials]
  );

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchesSubject = subjectFilter === "all" || m.subject === subjectFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q);
      return matchesSubject && matchesSearch;
    });
  }, [materials, subjectFilter, search]);

  const handleDownload = (fileUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  return (
    <PageShell title="Study Materials" icon={<BookOpen className="h-6 w-6" />} subtitle="Browse and download shared study materials">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, subject, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/60 backdrop-blur-sm border-white/10"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="bg-background/60 backdrop-blur-sm border-white/10">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No materials found</p>
          <p className="text-sm">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group relative rounded-xl border border-white/10 bg-card/40 backdrop-blur-md p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              {/* Subject badge */}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full w-fit">
                {m.subject}
              </span>

              <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
                {m.title}
              </h3>

              {m.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-white/5">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{m.file_name}</span>
              </div>

              <Button
                size="sm"
                className="w-full mt-1"
                onClick={() => handleDownload(m.file_url, m.file_name)}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default StudyMaterialsPage;
