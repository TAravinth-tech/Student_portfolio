import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ImageOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/freelance.jpg";

const SHEET_ID = "1NkCQvdV7Qw1InANBlE-AOnCjFb0v2TEiz3_a1-Rbzk8";
const COURSES_TAB = "Form Responses 1";
const PROJECTS_TAB = "Form Responses 2";

type Row = Record<string, string>;
type Project = { student: string; title: string; course: string; imageUrl: string };
type GvizResponse = {
  status?: string;
  errors?: { detailed_message?: string }[];
  table?: {
    cols: { label?: string }[];
    rows: { c?: ({ v?: string; f?: string } | null)[] }[];
  };
};

function loadSheet(sheetName: string): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `portfolio_cb_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let settled = false;
    const callbacks = window as Window & Record<string, unknown>;
    const finish = () => {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      delete callbacks[callbackName];
      script.remove();
      return true;
    };
    const timer = window.setTimeout(() => {
      if (finish()) reject(new Error("The portfolio took too long to load. Please try again."));
    }, 15000);

    callbacks[callbackName] = (response: GvizResponse) => {
      if (!finish()) return;
      if (response.status !== "ok" || !response.table) {
        reject(new Error(response.errors?.[0]?.detailed_message || "Could not read the project sheet. Please check its sharing settings."));
        return;
      }
      const columns = response.table.cols.map((column) => (column.label || "").trim().toLowerCase());
      resolve(response.table.rows.map((row) => {
        const result: Row = {};
        columns.forEach((column, index) => {
          const cell = row.c?.[index];
          result[column] = String(cell?.f ?? cell?.v ?? "");
        });
        return result;
      }));
    };
    script.onerror = () => {
      if (finish()) reject(new Error("Could not connect to the project sheet. Please try again."));
    };
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=${encodeURIComponent(`out:json;responseHandler:${callbackName}`)}&sheet=${encodeURIComponent(sheetName)}`;
    document.body.appendChild(script);
  });
}

function pick(row: Row, ...candidates: string[]) {
  for (const candidate of candidates) {
    const key = Object.keys(row).find((item) => item.includes(candidate) && row[item]);
    if (key) return row[key].trim();
  }
  return "";
}

function imageFromDrive(value: string) {
  const match = value.match(/\/d\/([-\w]{10,})/) || value.match(/[?&]id=([-\w]{10,})/) || value.match(/^([-\w]{20,})$/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600` : "";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Freelance Training | Student Projects" },
      { name: "description", content: "Explore student projects and creative work from Freelance Training courses." },
      { property: "og:title", content: "Freelance Training | Student Projects" },
      { property: "og:description", content: "Explore student projects and creative work from Freelance Training courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const [courses, setCourses] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeCourse, setActiveCourse] = useState("All projects");
  const [selected, setSelected] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([loadSheet(COURSES_TAB), loadSheet(PROJECTS_TAB)])
      .then(([courseRows, projectRows]) => {
        if (!live) return;
        const unique = new Set<string>();
        const courseList = courseRows.map((row) => pick(row, "course")).filter((course) => {
          const key = course.toLowerCase();
          if (!course || unique.has(key)) return false;
          unique.add(key);
          return true;
        });
        const projectList = projectRows.map((row) => ({
          student: pick(row, "student"),
          title: pick(row, "project title", "title"),
          course: pick(row, "course"),
          imageUrl: imageFromDrive(pick(row, "image", "photo", "poster", "upload", "file")),
        })).filter((project) => project.student && project.imageUrl);
        setCourses(courseList);
        setProjects(projectList);
        setError("");
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setError(reason instanceof Error ? reason.message : "The portfolio could not load. Please try again.");
        setLoading(false);
      });
    return () => { live = false; };
  }, [refreshKey]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const visibleProjects = useMemo(() => activeCourse === "All projects"
    ? projects
    : projects.filter((project) => project.course.trim().toLowerCase() === activeCourse.trim().toLowerCase()), [projects, activeCourse]);

  const refresh = () => { setLoading(true); setError(""); setRefreshKey((key) => key + 1); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <section className="bg-background">
          <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-8 sm:px-8 sm:pb-16 sm:pt-8 lg:px-12 lg:pb-20">
            <div className="flex flex-col items-center gap-5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
              <img src={logoAsset} alt="Freelance Training logo" className="size-24 object-contain sm:size-28 sm:justify-self-start lg:size-32" />
              <h1 className="text-center font-display text-3xl font-extrabold leading-[1.1] text-foreground min-[400px]:text-4xl sm:whitespace-nowrap md:text-5xl lg:text-6xl">Student <span className="text-primary">Projects</span></h1>
              <div className="hidden sm:block" aria-hidden="true" />
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase text-primary sm:mt-8"><span>Explore the work</span><ArrowDownRight className="size-4" aria-hidden="true" /></div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40" aria-labelledby="work-heading"><div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pt-16">
          <div className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase text-primary">The collection / 01</p>
              <h2 id="work-heading" className="font-display text-3xl font-semibold sm:text-4xl">Explore the work<span className="text-primary">.</span></h2>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end"><p className="text-sm text-muted-foreground">{loading ? "Updating the collection…" : `${visibleProjects.length} ${visibleProjects.length === 1 ? "project" : "projects"}${activeCourse !== "All projects" ? ` in ${activeCourse}` : ""}`}</p><Button variant="outline" size="icon" onClick={refresh} disabled={loading} title="Refresh projects" aria-label="Refresh projects" className="shrink-0 border-border bg-background shadow-none"><RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" /></Button></div>
          </div>

          {!error && (courses.length > 0 || loading) && <div className="mb-9 flex items-center gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter projects by course">
            {["All projects", ...courses].map((course) => <Button key={course} variant={activeCourse === course ? "default" : "outline"} size="sm" onClick={() => setActiveCourse(course)} aria-pressed={activeCourse === course} className="h-10 shrink-0 rounded-none px-5 shadow-none">{course}</Button>)}
          </div>}

          {error ? <div className="border-y border-border py-16 text-center" role="alert">
            <p className="mb-3 text-xs font-bold uppercase text-primary">Connection interrupted</p>
            <h3 className="font-display text-2xl font-semibold">We couldn’t load the projects.</h3>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{error}</p>
            <Button onClick={refresh} className="mt-7 rounded-none"><RefreshCw aria-hidden="true" />Try again</Button>
          </div> : loading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading projects">
            {[0, 1, 2].map((item) => <div key={item} className="animate-pulse"><div className="aspect-[4/3] bg-secondary" /><div className="mt-5 h-4 w-2/3 bg-secondary" /><div className="mt-3 h-3 w-1/3 bg-secondary" /></div>)}
          </div> : visibleProjects.length === 0 ? <div className="border-y border-border py-16 text-center">
            <p className="mb-3 text-xs font-bold uppercase text-primary">Nothing here yet</p>
            <h3 className="font-display text-2xl font-semibold">{courses.length === 0 ? "No courses have been added yet." : "No projects in this course yet."}</h3>
            <p className="mt-3 text-sm text-muted-foreground">New submissions will appear here when they’re added to the sheet.</p>
          </div> : <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project, index) => <article key={`${project.course}-${project.student}-${project.title}-${index}`} className="group min-w-0">
              <Button variant="ghost" type="button" onClick={() => setSelected(project)} aria-label={`View ${project.title} by ${project.student}`} className="relative block h-auto w-full overflow-hidden rounded-none bg-secondary p-0 shadow-none hover:bg-secondary">
                <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden"><img src={project.imageUrl} alt={`${project.title} by ${project.student}`} loading={index > 2 ? "lazy" : "eager"} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("image-failed"); }} /><ImageOff className="hidden size-8 text-muted-foreground [.image-failed_&]:block" aria-hidden="true" /></span>
                <span className="absolute bottom-3 right-3 grid size-9 place-items-center bg-background text-foreground transition-transform group-hover:-translate-y-1"><ArrowUpRight className="size-4" aria-hidden="true" /></span>
              </Button>
              <div className="mt-5 flex items-start justify-between gap-4">
                 <div className="min-w-0"><p className="mb-2 text-[11px] font-bold uppercase text-primary">{project.course}</p><h3 className="font-display text-xl font-semibold leading-tight">{project.title || "Untitled project"}</h3><p className="mt-2 text-sm text-muted-foreground">By {project.student}</p></div>
                <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              </div>
            </article>)}
          </div>}
        </div></section>
      </main>

      <footer className="border-t border-border"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:px-8 lg:px-12"><span>Freelance Training</span><span>Student projects worth sharing.</span></div></footer>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} role="presentation">
        <div className="flex max-h-[94vh] w-full max-w-5xl flex-col bg-background shadow-xl" role="dialog" aria-modal="true" aria-label={`${selected.title} by ${selected.student}`}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-3 sm:px-6"><div className="min-w-0"><p className="truncate font-display text-base font-semibold">{selected.title || "Untitled project"}</p><p className="truncate text-xs text-muted-foreground">{selected.student} · {selected.course}</p></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close project image" title="Close" className="shrink-0 rounded-none"><X aria-hidden="true" /></Button></div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-secondary p-4"><img src={selected.imageUrl} alt={`${selected.title} by ${selected.student}`} className="max-h-[75vh] max-w-full object-contain" /></div>
        </div>
      </div>}
    </div>
  );
}