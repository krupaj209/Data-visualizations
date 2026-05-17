import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  VolumeX,
  X,
  ExternalLink,
} from "lucide-react";
import {
  listCategories,
  type HeadoutCategory,
  type HeadoutSubcategory,
  type HeadoutSubcategoryId,
} from "@workspace/taxonomy";
import {
  RATIFIED_HEADOUT_SUBCATEGORY_IDS,
  VISITOR_INTENTS,
  type VisitorIntentId,
} from "@workspace/question-bank";
import {
  useGetQuestionBank,
  useCreateCategoryOverride,
  useUpdateCategoryOverride,
  useDeleteCategoryOverride,
  useBulkApplyCategoryOverride,
  useBulkRevertCategoryOverride,
  getGetQuestionBankQueryKey,
  getGetQuestionBankQueryOptions,
  type MergedQuestionBundle,
  type MergedQuestionCandidate,
  type QuestionBankView,
  type QuestionCategoryOverride,
  type QuestionOverrideActionKind,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";

const WRITER_KEY = "viz-studio:writer-name";
const PILL = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

type Scope =
  | { kind: "global" }
  | { kind: "category"; categoryId: number }
  | { kind: "subcategory"; categoryId: number; subcategoryId: string };

interface EditorState {
  mode: "edit-existing" | "edit-globally" | "add-subcategory" | "bulk-edit";
  scope: Scope;
  bundleId: string;
  archetype: string;
  defaultTemplate: string;
  existingOverrideId?: number;
  initialTemplate?: string;
  initialNotes?: string;
  /** For bulk mode: pool of subcategories the user can target. */
  bulkSubcategoryIds?: string[];
}

type OverrideCountsBySub = Map<string, number>;

const CATEGORIES: HeadoutCategory[] = listCategories(
  RATIFIED_HEADOUT_SUBCATEGORY_IDS,
);

function subIdToString(id: HeadoutSubcategoryId): string {
  return String(id);
}

export default function QuestionBank() {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();

  // ---- URL state (?sub=, ?cat=) -------------------------------------------
  const initialScope = useMemo<Scope>(() => {
    const qs = new URLSearchParams(window.location.search);
    const sub = qs.get("sub") ?? qs.get("subcategory");
    if (sub) {
      const match = CATEGORIES.find((c) =>
        c.subcategories.some((s) => subIdToString(s.subcategoryId) === sub),
      );
      if (match) {
        return {
          kind: "subcategory",
          categoryId: match.categoryId,
          subcategoryId: sub,
        };
      }
    }
    const cat = qs.get("cat");
    if (cat && /^\d+$/.test(cat)) {
      const id = Number(cat);
      if (CATEGORIES.some((c) => c.categoryId === id)) {
        return { kind: "category", categoryId: id };
      }
    }
    return { kind: "global" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const [scope, setScope] = useState<Scope>(initialScope);
  useEffect(() => {
    setScope(initialScope);
  }, [initialScope]);

  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const s = new Set<number>();
    if (initialScope.kind !== "global") s.add(initialScope.categoryId);
    return s;
  });
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<
    "all" | "has-overrides" | "unratified"
  >("all");
  const [compareToDefault, setCompareToDefault] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [writerName, setWriterName] = useState<string>(() => {
    try {
      return window.localStorage.getItem(WRITER_KEY) ?? "";
    } catch {
      return "";
    }
  });

  function updateWriterName(name: string) {
    setWriterName(name);
    try {
      window.localStorage.setItem(WRITER_KEY, name);
    } catch {
      /* ignore */
    }
  }

  function selectScope(next: Scope) {
    setScope(next);
    if (next.kind !== "global") {
      setExpanded((prev) => new Set(prev).add(next.categoryId));
    }
    const params = new URLSearchParams();
    if (next.kind === "subcategory") {
      params.set("sub", next.subcategoryId);
    } else if (next.kind === "category") {
      params.set("cat", String(next.categoryId));
    }
    const qs = params.toString();
    navigate(qs ? `/question-bank?${qs}` : "/question-bank", {
      replace: true,
    });
  }

  function toggleExpand(catId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  // ---- Data fetch for active scope ----------------------------------------
  const params =
    scope.kind === "category"
      ? { categoryId: scope.categoryId }
      : scope.kind === "subcategory"
        ? { subcategoryId: scope.subcategoryId }
        : undefined;

  const { data: view, isLoading, error } = useGetQuestionBank(params);

  function invalidateBank() {
    qc.invalidateQueries({ queryKey: getGetQuestionBankQueryKey() });
  }

  /**
   * Push a freshly-returned merged view into the active scope's cache so the
   * UI updates instantly, then invalidate the broader key so any other scope
   * (e.g. global view, sibling subcategory) also picks up the change on next
   * read. This avoids the "click → wait for refetch round-trip" lag that pure
   * invalidation would produce.
   */
  function applyMutationView(v: QuestionBankView) {
    qc.setQueryData<QuestionBankView>(getGetQuestionBankQueryKey(params), v);
    invalidateBank();
  }

  // ---- Pre-fetch every category's overrides so the tree counts + the
  // "has-overrides" filter work without waiting for the user to expand. The
  // calls are cached by react-query; refetches only happen on invalidation.
  const categoryQueries = useQueries({
    queries: CATEGORIES.map((c) =>
      getGetQuestionBankQueryOptions({ categoryId: c.categoryId }),
    ),
  });
  const overridesByCategory = useMemo(() => {
    const map = new Map<number, OverrideCountsBySub>();
    CATEGORIES.forEach((cat, idx) => {
      const q = categoryQueries[idx];
      const inner: OverrideCountsBySub = new Map();
      const overrides = q?.data?.categoryOverrides ?? [];
      for (const o of overrides) {
        inner.set(o.subcategoryId, (inner.get(o.subcategoryId) ?? 0) + 1);
      }
      map.set(cat.categoryId, inner);
    });
    return map;
  }, [categoryQueries]);

  // ---- Filter the visible categories/subcategories ------------------------
  const lowerSearch = search.trim().toLowerCase();
  const matchesSearch = (s: HeadoutSubcategory) =>
    !lowerSearch ||
    s.subcategoryName.toLowerCase().includes(lowerSearch) ||
    s.categoryName.toLowerCase().includes(lowerSearch) ||
    subIdToString(s.subcategoryId).includes(lowerSearch);
  const matchesCategoryName = (name: string) =>
    !lowerSearch || name.toLowerCase().includes(lowerSearch);

  // ---- Side-effect: clear filter when none match ---------------------------
  return (
    <div
      style={{ background: BRAND.bgShell, minHeight: "100vh" }}
      className="flex flex-col"
    >
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-md"
        style={{
          borderColor: BRAND.slate200,
          background: "rgba(250,247,255,0.92)",
        }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1
              className="text-2xl font-extrabold"
              style={{
                color: BRAND.slate950,
                letterSpacing: "-0.01em",
              }}
            >
              Question bank editor
            </h1>
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: BRAND.slate700 }}
            >
              Edit the questions Viz Studio uses to assemble each CE's chart
              deck. Edits ladder up: code defaults → category-scope →
              CE-scope.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WriterNameInput value={writerName} onChange={updateWriterName} />
            <Link
              to="/"
              className="rounded-xl border px-3 py-1.5 text-xs font-bold"
              style={{
                borderColor: BRAND.slate200,
                color: BRAND.slate700,
                background: "white",
              }}
            >
              Back to CEs
            </Link>
          </div>
        </div>
      </header>

      <div
        className="mx-auto grid w-full max-w-[1400px] gap-6 px-6 py-6"
        style={{ gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)" }}
      >
        {/* ----- Left rail ----- */}
        <aside
          className="self-start rounded-2xl border"
          style={{
            background: "white",
            borderColor: BRAND.slate200,
            position: "sticky",
            top: 96,
            maxHeight: "calc(100vh - 120px)",
            overflow: "auto",
          }}
        >
          <div className="border-b p-3" style={{ borderColor: BRAND.slate200 }}>
            <div className="relative">
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: 9,
                  color: BRAND.slate500,
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subcategories…"
                className="w-full rounded-lg border py-1.5 pl-7 pr-2 text-sm"
                style={{
                  borderColor: BRAND.slate200,
                  background: BRAND.slate50,
                  color: BRAND.slate900,
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(["all", "has-overrides", "unratified"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterMode(f)}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background:
                      filterMode === f ? BRAND.purps : BRAND.slate100,
                    color: filterMode === f ? "white" : BRAND.slate700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {f === "all"
                    ? "All"
                    : f === "has-overrides"
                      ? "Has overrides"
                      : "Unratified"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => selectScope({ kind: "global" })}
              className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold"
              style={{
                background:
                  scope.kind === "global" ? BRAND.purpsSoft : "transparent",
                color:
                  scope.kind === "global" ? BRAND.purps : BRAND.slate700,
                border: "none",
                cursor: "pointer",
              }}
            >
              ▦ Global · code defaults
            </button>
          </div>
          <nav className="p-2">
            {CATEGORIES.map((cat) => (
              <CategoryNode
                key={cat.categoryId}
                category={cat}
                expanded={expanded.has(cat.categoryId)}
                scope={scope}
                filterMode={filterMode}
                overridesBySub={
                  overridesByCategory.get(cat.categoryId) ?? new Map()
                }
                matchesSearch={matchesSearch}
                categoryNameMatches={matchesCategoryName(cat.categoryName)}
                onToggle={() => toggleExpand(cat.categoryId)}
                onSelect={selectScope}
              />
            ))}
          </nav>
        </aside>

        {/* ----- Main panel ----- */}
        <main className="min-w-0">
          {isLoading && (
            <div
              className="rounded-2xl border p-8 text-center text-sm"
              style={{
                background: "white",
                borderColor: BRAND.slate200,
                color: BRAND.slate700,
              }}
            >
              <Loader2
                size={18}
                className="mr-2 inline animate-spin"
                style={{ color: BRAND.purps }}
              />
              Loading scope…
            </div>
          )}
          {error && (
            <div
              className="rounded-2xl border p-6 text-sm"
              style={{
                background: BRAND.bgBlush,
                borderColor: BRAND.candySoft,
                color: BRAND.candy,
              }}
            >
              Failed to load: {(error as Error).message}
            </div>
          )}
          {view && (
            <ScopeView
              scope={scope}
              view={view}
              writerName={writerName}
              compareToDefault={compareToDefault}
              setCompareToDefault={setCompareToDefault}
              onEdit={setEditor}
              onAction={async () => invalidateBank()}
              applyView={applyMutationView}
            />
          )}
        </main>
      </div>

      {editor && (
        <EditorModal
          state={editor}
          writerName={writerName}
          onWriterNameChange={updateWriterName}
          onClose={() => setEditor(null)}
          applyView={applyMutationView}
          onSaved={() => {
            invalidateBank();
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Writer-name input                                                          */
/* -------------------------------------------------------------------------- */

function WriterNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Your name (audit trail)"
      className="rounded-xl border px-3 py-1.5 text-xs font-bold"
      style={{
        borderColor: BRAND.slate200,
        color: BRAND.slate900,
        background: "white",
        width: 200,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Left-rail tree                                                             */
/* -------------------------------------------------------------------------- */

function CategoryNode({
  category,
  expanded,
  scope,
  filterMode,
  overridesBySub,
  matchesSearch,
  categoryNameMatches,
  onToggle,
  onSelect,
}: {
  category: HeadoutCategory;
  expanded: boolean;
  scope: Scope;
  filterMode: "all" | "has-overrides" | "unratified";
  overridesBySub: OverrideCountsBySub;
  matchesSearch: (s: HeadoutSubcategory) => boolean;
  categoryNameMatches: boolean;
  onToggle: () => void;
  onSelect: (s: Scope) => void;
}) {
  const visibleSubs = category.subcategories.filter((s) => {
    if (!matchesSearch(s)) return false;
    if (filterMode === "has-overrides") {
      return (overridesBySub.get(subIdToString(s.subcategoryId)) ?? 0) > 0;
    }
    if (filterMode === "unratified") return s.unratified;
    return true;
  });

  const totalOverrides = Array.from(overridesBySub.values()).reduce(
    (a, b) => a + b,
    0,
  );
  // Hide the whole category row when no subcategory survives the active
  // search / filter combo. This keeps the rail tight when narrowing down.
  if (visibleSubs.length === 0 && !categoryNameMatches) return null;
  if (filterMode === "has-overrides" && totalOverrides === 0) return null;
  if (filterMode === "unratified" && visibleSubs.length === 0) return null;
  const isCatSelected =
    scope.kind === "category" && scope.categoryId === category.categoryId;

  return (
    <div className="mb-0.5">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          className="p-1"
          aria-label={expanded ? "Collapse" : "Expand"}
          style={{ color: BRAND.slate500 }}
        >
          {expanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        <button
          type="button"
          onClick={() =>
            onSelect({ kind: "category", categoryId: category.categoryId })
          }
          className="flex-1 rounded-lg px-2 py-1 text-left text-xs font-bold"
          style={{
            background: isCatSelected ? BRAND.purpsSoft : "transparent",
            color: isCatSelected ? BRAND.purps : BRAND.slate900,
          }}
        >
          {category.categoryName}
          {totalOverrides > 0 && (
            <span
              className={PILL + " ml-1.5"}
              style={{
                background: BRAND.bgMint,
                color: BRAND.okayInk,
              }}
            >
              {totalOverrides}
            </span>
          )}
        </button>
      </div>
      {expanded && (
        <ul className="ml-5 mt-0.5 border-l pl-2" style={{ borderColor: BRAND.slate200 }}>
          {visibleSubs.length === 0 ? (
            <li
              className="px-2 py-1 text-[11px]"
              style={{ color: BRAND.slate500 }}
            >
              No matching subcategories.
            </li>
          ) : (
            visibleSubs.map((s) => {
              const sid = subIdToString(s.subcategoryId);
              const overrideCount = overridesBySub.get(sid) ?? 0;
              const selected =
                scope.kind === "subcategory" && scope.subcategoryId === sid;
              return (
                <li key={sid}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelect({
                        kind: "subcategory",
                        categoryId: category.categoryId,
                        subcategoryId: sid,
                      })
                    }
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs"
                    style={{
                      background: selected ? BRAND.purpsSoft : "transparent",
                      color: selected ? BRAND.purps : BRAND.slate700,
                      fontWeight: selected ? 800 : 600,
                    }}
                  >
                    <span className="truncate">{s.subcategoryName}</span>
                    <span className="ml-2 flex shrink-0 items-center gap-1">
                      {s.unratified && (
                        <span
                          className={PILL}
                          style={{
                            background: BRAND.slate100,
                            color: BRAND.slate700,
                            fontSize: 9,
                          }}
                          title="No curated bundle has been ratified for this subcategory yet"
                        >
                          Unratified
                        </span>
                      )}
                      {overrideCount > 0 && (
                        <span
                          className={PILL}
                          style={{
                            background: BRAND.bgMint,
                            color: BRAND.okayInk,
                            fontSize: 9,
                          }}
                          title={`${overrideCount} override${overrideCount === 1 ? "" : "s"} active`}
                        >
                          {overrideCount}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main scope view                                                            */
/* -------------------------------------------------------------------------- */

function ScopeView({
  scope,
  view,
  writerName,
  compareToDefault,
  setCompareToDefault,
  onEdit,
  onAction,
  applyView,
}: {
  scope: Scope;
  view: QuestionBankView;
  writerName: string;
  compareToDefault: boolean;
  setCompareToDefault: (v: boolean) => void;
  onEdit: (s: EditorState) => void;
  onAction: () => Promise<void>;
  applyView: (v: QuestionBankView) => void;
}) {
  const cat =
    scope.kind !== "global"
      ? CATEGORIES.find((c) => c.categoryId === scope.categoryId)
      : null;
  const sub =
    scope.kind === "subcategory" && cat
      ? cat.subcategories.find(
          (s) => subIdToString(s.subcategoryId) === scope.subcategoryId,
        )
      : null;

  if (scope.kind === "global") {
    return (
      <div className="space-y-4">
        <Banner
          tone="purps"
          title="Global view — code defaults"
          body="Select a category or subcategory in the left rail to see effective questions and edit overrides. Code defaults are the read-only floor that every override is layered on top of."
        />
        <BundleGroupedList
          bundles={view.mergedBundles}
          showActions={false}
          compareToDefault={false}
        />
      </div>
    );
  }

  if (scope.kind === "category" && cat) {
    return (
      <CategoryScopeView
        cat={cat}
        view={view}
        writerName={writerName}
        compareToDefault={compareToDefault}
        setCompareToDefault={setCompareToDefault}
        onEdit={onEdit}
        onAction={onAction}
        applyView={applyView}
      />
    );
  }

  if (scope.kind === "subcategory" && cat && sub) {
    return (
      <SubcategoryScopeView
        cat={cat}
        sub={sub}
        view={view}
        writerName={writerName}
        compareToDefault={compareToDefault}
        setCompareToDefault={setCompareToDefault}
        onEdit={onEdit}
        onAction={onAction}
        applyView={applyView}
      />
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Category scope                                                             */
/* -------------------------------------------------------------------------- */

function CategoryScopeView({
  cat,
  view,
  writerName,
  compareToDefault,
  setCompareToDefault,
  onEdit,
  onAction,
  applyView,
}: {
  cat: HeadoutCategory;
  view: QuestionBankView;
  writerName: string;
  compareToDefault: boolean;
  setCompareToDefault: (v: boolean) => void;
  onEdit: (s: EditorState) => void;
  onAction: () => Promise<void>;
  applyView: (v: QuestionBankView) => void;
}) {
  const subcategoryIds = useMemo(
    () => cat.subcategories.map((s) => subIdToString(s.subcategoryId)),
    [cat],
  );
  const bulkRevertMut = useBulkRevertCategoryOverride();
  const subCount = cat.subcategories.length;

  // Group categoryOverrides by (bundleId, archetype) to show "applied to N/M"
  const overrideGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        bundleId: string;
        archetype: string;
        action: QuestionOverrideActionKind;
        rows: QuestionCategoryOverride[];
      }
    >();
    for (const o of view.categoryOverrides) {
      const key = `${o.bundleId}|${o.archetype}|${o.action}`;
      const prev = map.get(key);
      if (prev) prev.rows.push(o);
      else
        map.set(key, {
          bundleId: o.bundleId,
          archetype: o.archetype,
          action: o.action,
          rows: [o],
        });
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.bundleId}${a.archetype}`.localeCompare(`${b.bundleId}${b.archetype}`),
    );
  }, [view.categoryOverrides]);

  async function handleBulkRevert(
    bundleId: string,
    archetype: string,
    action: QuestionOverrideActionKind,
  ) {
    if (
      !confirm(
        `Revert this bulk override across all ${subCount} subcategories in ${cat.categoryName}?`,
      )
    )
      return;
    await bulkRevertMut.mutateAsync({
      data: { categoryId: cat.categoryId, bundleId, archetype, action },
    });
    // Bulk endpoint doesn't return a merged view; invalidate to refetch.
    await onAction();
  }

  return (
    <div className="space-y-4">
      <Banner
        tone="purps"
        title={`${cat.categoryName} — category scope`}
        body={`Edits made here apply to all ${subCount} subcategories in ${cat.categoryName}. The list below shows code defaults; use "Edit globally" on a row to bulk-apply an override across the whole category.`}
      />

      {overrideGroups.length > 0 && (
        <section
          className="rounded-2xl border p-4"
          style={{
            background: BRAND.bgMint,
            borderColor: "#7AD2A6",
          }}
        >
          <h3
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: BRAND.okayInk }}
          >
            Active category overrides ({overrideGroups.length})
          </h3>
          <ul className="mt-2 space-y-1.5">
            {overrideGroups.map((g) => (
              <li
                key={`${g.bundleId}-${g.archetype}-${g.action}`}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "white" }}
              >
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-bold" style={{ color: BRAND.slate950 }}>
                    {g.bundleId} · {g.archetype}
                  </span>
                  <span
                    className={PILL + " ml-2"}
                    style={{
                      background:
                        g.action === "mute"
                          ? BRAND.candySoft
                          : g.action === "add"
                            ? BRAND.purpsSoft
                            : BRAND.slate100,
                      color:
                        g.action === "mute"
                          ? BRAND.candy
                          : g.action === "add"
                            ? BRAND.purps
                            : BRAND.slate700,
                    }}
                  >
                    {g.action}
                  </span>
                  <span className="ml-2" style={{ color: BRAND.slate700 }}>
                    applied to {g.rows.length}/{subCount} sub
                    {subCount === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleBulkRevert(g.bundleId, g.archetype, g.action)
                  }
                  disabled={bulkRevertMut.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
                  style={{
                    borderColor: BRAND.slate200,
                    color: BRAND.candy,
                    background: "white",
                  }}
                >
                  <RotateCcw size={11} /> Bulk revert
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CompareToggle value={compareToDefault} onChange={setCompareToDefault} />

      <BundleGroupedList
        bundles={view.mergedBundles}
        showActions={true}
        compareToDefault={compareToDefault}
        renderActions={(bundle, c) => (
          <button
            type="button"
            disabled={!writerName}
            title={!writerName ? "Enter your name first" : ""}
            onClick={() =>
              onEdit({
                mode: "bulk-edit",
                scope: { kind: "category", categoryId: cat.categoryId },
                bundleId: bundle.bundleId,
                archetype: c.archetype,
                defaultTemplate: c.questionTemplate,
                bulkSubcategoryIds: subcategoryIds,
              })
            }
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
            style={{
              borderColor: BRAND.slate200,
              color: BRAND.purps,
              background: "white",
            }}
          >
            <Edit3 size={11} /> Bulk apply
          </button>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcategory scope                                                          */
/* -------------------------------------------------------------------------- */

function SubcategoryScopeView({
  cat,
  sub,
  view,
  writerName,
  compareToDefault,
  setCompareToDefault,
  onEdit,
  onAction,
  applyView,
}: {
  cat: HeadoutCategory;
  sub: HeadoutSubcategory;
  view: QuestionBankView;
  writerName: string;
  compareToDefault: boolean;
  setCompareToDefault: (v: boolean) => void;
  onEdit: (s: EditorState) => void;
  onAction: () => Promise<void>;
  applyView: (v: QuestionBankView) => void;
}) {
  const sid = subIdToString(sub.subcategoryId);
  const subcategoryIds = useMemo(
    () => cat.subcategories.map((s) => subIdToString(s.subcategoryId)),
    [cat],
  );
  const createMut = useCreateCategoryOverride();
  const deleteMut = useDeleteCategoryOverride();

  async function requestRevert(overrideId: number) {
    if (!confirm("Revert this override and restore the previous source?"))
      return;
    const res = await deleteMut.mutateAsync({ id: overrideId });
    applyView(res.view);
    await onAction();
  }

  async function quickMute(bundleId: string, archetype: string) {
    if (!writerName) {
      alert("Enter your name in the header before muting.");
      return;
    }
    if (!confirm(`Mute ${archetype} for ${sub.subcategoryName}?`)) return;
    const res = await createMut.mutateAsync({
      data: {
        subcategoryId: sid,
        bundleId,
        archetype,
        action: "mute",
        createdBy: writerName,
      },
    });
    applyView(res.view);
    await onAction();
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4"
        style={{ background: "white", borderColor: BRAND.slate200 }}
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <h2
            className="text-lg font-extrabold"
            style={{ color: BRAND.slate950 }}
          >
            {sub.subcategoryName}
          </h2>
          <span
            className={PILL}
            style={{
              background: BRAND.slate100,
              color: BRAND.slate700,
            }}
          >
            {cat.categoryName} · id {sid}
          </span>
          {sub.unratified && (
            <span
              className={PILL}
              style={{ background: BRAND.holaSoft, color: BRAND.hola }}
            >
              Unratified
            </span>
          )}
        </div>
        <p className="mt-1 text-xs" style={{ color: BRAND.slate700 }}>
          Edits at this scope apply only to {sub.subcategoryName}. Pick "Edit
          globally" to bulk-apply across all {cat.subcategories.length}{" "}
          subcategories in {cat.categoryName}.
        </p>
      </div>

      <CompareToggle value={compareToDefault} onChange={setCompareToDefault} />

      <BundleGroupedList
        bundles={view.mergedBundles}
        showActions={true}
        compareToDefault={compareToDefault}
        renderActions={(bundle, c) => (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={!writerName}
              title={!writerName ? "Enter your name first" : "Edit just for this subcategory"}
              onClick={() =>
                onEdit({
                  mode: "edit-existing",
                  scope: {
                    kind: "subcategory",
                    categoryId: cat.categoryId,
                    subcategoryId: sid,
                  },
                  bundleId: bundle.bundleId,
                  archetype: c.archetype,
                  defaultTemplate: c.questionTemplate,
                  existingOverrideId:
                    c.source === "category_override"
                      ? (c.overrideId ?? undefined)
                      : undefined,
                  initialTemplate:
                    c.source === "category_override"
                      ? c.questionTemplate
                      : undefined,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
              style={{
                borderColor: BRAND.slate200,
                color: BRAND.purps,
                background: "white",
              }}
            >
              <Edit3 size={11} /> Edit for this sub
            </button>
            <button
              type="button"
              disabled={!writerName}
              title="Bulk apply this edit across the whole category"
              onClick={() =>
                onEdit({
                  mode: "edit-globally",
                  scope: { kind: "category", categoryId: cat.categoryId },
                  bundleId: bundle.bundleId,
                  archetype: c.archetype,
                  defaultTemplate: c.questionTemplate,
                  bulkSubcategoryIds: subcategoryIds,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
              style={{
                borderColor: BRAND.slate200,
                color: BRAND.slate700,
                background: "white",
              }}
            >
              Edit globally
            </button>
            {!c.muted && (
              <button
                type="button"
                disabled={!writerName || createMut.isPending}
                onClick={() => quickMute(bundle.bundleId, c.archetype)}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
                style={{
                  borderColor: BRAND.candySoft,
                  color: BRAND.candy,
                  background: "white",
                }}
              >
                <VolumeX size={11} /> Mute
              </button>
            )}
            {c.source === "category_override" && c.overrideId && (
              <button
                type="button"
                onClick={() => requestRevert(c.overrideId!)}
                disabled={deleteMut.isPending}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
                style={{
                  borderColor: BRAND.slate200,
                  color: BRAND.candy,
                  background: "white",
                }}
              >
                <RotateCcw size={11} /> Revert
              </button>
            )}
          </div>
        )}
        bundleFooter={(bundle) => (
          <button
            type="button"
            disabled={!writerName}
            onClick={() =>
              onEdit({
                mode: "add-subcategory",
                scope: {
                  kind: "subcategory",
                  categoryId: cat.categoryId,
                  subcategoryId: sid,
                },
                bundleId: bundle.bundleId,
                archetype: "",
                defaultTemplate: "",
              })
            }
            className="mt-2 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
            style={{
              borderColor: BRAND.purpsSoft,
              color: BRAND.purps,
              background: "white",
            }}
          >
            <Plus size={11} /> Add subcategory question
          </button>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bundle-grouped list (shared by global, category, subcategory, CE)          */
/* -------------------------------------------------------------------------- */

export function BundleGroupedList({
  bundles,
  showActions,
  compareToDefault,
  renderActions,
  bundleFooter,
}: {
  bundles: MergedQuestionBundle[];
  showActions: boolean;
  compareToDefault: boolean;
  renderActions?: (
    bundle: MergedQuestionBundle,
    c: MergedQuestionCandidate,
  ) => React.ReactNode;
  bundleFooter?: (bundle: MergedQuestionBundle) => React.ReactNode;
}) {
  // Group bundles by intent for readability.
  const grouped = useMemo(() => {
    const m = new Map<VisitorIntentId, MergedQuestionBundle[]>();
    for (const b of bundles) {
      const key = b.intent as VisitorIntentId;
      const arr = m.get(key) ?? [];
      arr.push(b);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [bundles]);

  return (
    <div className="space-y-5">
      {grouped.map(([intentId, list]) => {
        const intent = VISITOR_INTENTS[intentId];
        return (
          <section key={intentId}>
            <h3
              className="mb-2 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: BRAND.purps }}
            >
              {intent?.label ?? intentId}
            </h3>
            <div className="space-y-3">
              {list.map((bundle) => (
                <article
                  key={bundle.bundleId}
                  className="rounded-2xl border"
                  style={{
                    background: "white",
                    borderColor: BRAND.slate200,
                  }}
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3" style={{ borderColor: BRAND.slate100 }}>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h4
                          className="text-sm font-extrabold"
                          style={{ color: BRAND.slate950 }}
                        >
                          {bundle.label}
                        </h4>
                        <span
                          className={PILL}
                          style={{
                            background: BRAND.slate100,
                            color: BRAND.slate700,
                            fontSize: 9,
                          }}
                        >
                          {bundle.bundleId}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: BRAND.slate700 }}
                      >
                        {bundle.description}
                      </p>
                    </div>
                  </header>
                  <ul>
                    {bundle.candidates
                      .filter(
                        (c) => !compareToDefault || c.source !== "code",
                      )
                      .map((c, idx) => {
                        const isOverride = c.source !== "code";
                        const accent =
                          c.source === "ce_override"
                            ? BRAND.hola
                            : c.source === "category_override"
                              ? BRAND.okayInk
                              : "transparent";
                        return (
                      <li
                        key={`${c.archetype}-${idx}`}
                        className="border-b px-4 py-3 last:border-b-0"
                        style={{
                          borderColor: BRAND.slate100,
                          borderLeft: isOverride
                            ? `3px solid ${accent}`
                            : "3px solid transparent",
                          background: isOverride
                            ? "rgba(122, 210, 166, 0.06)"
                            : "transparent",
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={PILL}
                                style={{
                                  background: BRAND.purpsSoft,
                                  color: BRAND.purps,
                                  fontSize: 9,
                                }}
                              >
                                {c.archetype}
                              </span>
                              <SourceBadge source={c.source} />
                              {c.muted && (
                                <span
                                  className={PILL}
                                  style={{
                                    background: BRAND.candySoft,
                                    color: BRAND.candy,
                                    fontSize: 9,
                                  }}
                                >
                                  Muted
                                </span>
                              )}
                            </div>
                            <p
                              className="mt-1 text-sm font-medium"
                              style={{
                                color: c.muted
                                  ? BRAND.slate500
                                  : BRAND.slate900,
                                textDecoration: c.muted
                                  ? "line-through"
                                  : "none",
                                lineHeight: 1.4,
                              }}
                            >
                              {c.questionTemplate}
                            </p>
                          </div>
                          {showActions && renderActions && (
                            <div className="shrink-0">
                              {renderActions(bundle, c)}
                            </div>
                          )}
                        </div>
                      </li>
                        );
                      })}
                    {compareToDefault &&
                      bundle.candidates.filter((c) => c.source !== "code")
                        .length === 0 && (
                        <li
                          className="px-4 py-3 text-[11px]"
                          style={{ color: BRAND.slate500 }}
                        >
                          No overrides in this bundle — matches code defaults.
                        </li>
                      )}
                  </ul>
                  {bundleFooter && (
                    <div
                      className="border-t px-4 py-2"
                      style={{ borderColor: BRAND.slate100 }}
                    >
                      {bundleFooter(bundle)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    code: { label: "Default", bg: BRAND.slate100, fg: BRAND.slate700 },
    category_override: {
      label: "Category override",
      bg: BRAND.bgMint,
      fg: BRAND.okayInk,
    },
    ce_override: {
      label: "CE override",
      bg: BRAND.holaSoft,
      fg: BRAND.hola,
    },
  };
  const entry = map[source] ?? map.code;
  return (
    <span
      className={PILL}
      style={{ background: entry.bg, color: entry.fg, fontSize: 9 }}
    >
      {entry.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Compare-to-default toggle                                                  */
/* -------------------------------------------------------------------------- */

function CompareToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border px-3 py-2"
      style={{
        borderColor: BRAND.slate200,
        background: value ? BRAND.bgMint : "white",
      }}
    >
      <div className="text-xs" style={{ color: BRAND.slate900 }}>
        <span className="font-bold">Compare to default</span>
        <span className="ml-2" style={{ color: BRAND.slate700 }}>
          {value
            ? "Showing only rows that differ from code defaults."
            : "Show everything; overrides get a green left border."}
        </span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="font-bold" style={{ color: BRAND.purps }}>
          Only changes
        </span>
      </label>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Banner                                                                     */
/* -------------------------------------------------------------------------- */

function Banner({
  tone,
  title,
  body,
}: {
  tone: "purps" | "mint";
  title: string;
  body: string;
}) {
  const bg = tone === "purps" ? BRAND.purpsSoft : BRAND.bgMint;
  const fg = tone === "purps" ? BRAND.purps : BRAND.okayInk;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: bg, borderColor: bg }}
    >
      <h2 className="text-sm font-extrabold" style={{ color: fg }}>
        {title}
      </h2>
      <p
        className="mt-1 text-xs font-medium"
        style={{ color: BRAND.slate900 }}
      >
        {body}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Editor modal                                                               */
/* -------------------------------------------------------------------------- */

function EditorModal({
  state,
  writerName,
  onWriterNameChange,
  onClose,
  onSaved,
  applyView,
}: {
  state: EditorState;
  writerName: string;
  onWriterNameChange: (v: string) => void;
  onClose: () => void;
  onSaved: () => void;
  applyView: (v: QuestionBankView) => void;
}) {
  const [template, setTemplate] = useState(
    state.initialTemplate ?? state.defaultTemplate ?? "",
  );
  const [archetype, setArchetype] = useState(state.archetype);
  const [notes, setNotes] = useState(state.initialNotes ?? "");
  const [name, setName] = useState(writerName);
  const allBulkIds = state.bulkSubcategoryIds ?? [];
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(
    () => new Set(allBulkIds),
  );

  const createCatMut = useCreateCategoryOverride();
  const updateCatMut = useUpdateCategoryOverride();
  const bulkApplyMut = useBulkApplyCategoryOverride();

  const isPending =
    createCatMut.isPending ||
    updateCatMut.isPending ||
    bulkApplyMut.isPending;
  const isAdd = state.mode === "add-subcategory";
  const isBulk =
    state.mode === "bulk-edit" || state.mode === "edit-globally";
  const bulkAppliesToAll =
    isBulk && allBulkIds.length > 0 && selectedBulkIds.size === allBulkIds.length;

  function toggleBulkId(id: string) {
    setSelectedBulkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Enter your name for the audit trail.");
      return;
    }
    if (!template.trim()) {
      alert("Question template cannot be empty.");
      return;
    }
    if (isAdd && !archetype.trim()) {
      alert("Pick an archetype for the new question.");
      return;
    }
    if (isBulk && selectedBulkIds.size === 0) {
      alert("Pick at least one subcategory to apply this edit to.");
      return;
    }
    onWriterNameChange(name.trim());

    try {
      let lastView: QuestionBankView | undefined;
      if (isBulk && state.scope.kind === "category") {
        if (bulkAppliesToAll) {
          // Fast path: single bulk endpoint hits every subcategory.
          // Returns a bulk summary (no merged view); invalidation handles refresh.
          await bulkApplyMut.mutateAsync({
            data: {
              categoryId: state.scope.categoryId,
              bundleId: state.bundleId,
              archetype: archetype || state.archetype,
              action: "edit",
              questionTemplate: template.trim(),
              notes: notes.trim() || undefined,
              createdBy: name.trim(),
            },
          });
        } else {
          // Subset path: fan out individual create-override calls so each
          // selected subcategory gets its own override row.
          for (const sid of selectedBulkIds) {
            const res = await createCatMut.mutateAsync({
              data: {
                subcategoryId: sid,
                bundleId: state.bundleId,
                archetype: archetype || state.archetype,
                action: "edit",
                questionTemplate: template.trim(),
                notes: notes.trim() || undefined,
                createdBy: name.trim(),
              },
            });
            lastView = res.view;
          }
        }
      } else if (state.scope.kind === "subcategory") {
        if (state.existingOverrideId) {
          const res = await updateCatMut.mutateAsync({
            id: state.existingOverrideId,
            data: {
              questionTemplate: template.trim(),
              notes: notes.trim() || null,
              createdBy: name.trim(),
            },
          });
          lastView = res.view;
        } else {
          const res = await createCatMut.mutateAsync({
            data: {
              subcategoryId: state.scope.subcategoryId,
              bundleId: state.bundleId,
              archetype: archetype || state.archetype,
              action: isAdd ? "add" : "edit",
              questionTemplate: template.trim(),
              notes: notes.trim() || undefined,
              createdBy: name.trim(),
            },
          });
          lastView = res.view;
        }
      }
      if (lastView) applyView(lastView);
      onSaved();
    } catch (err) {
      alert(
        `Save failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const titleText = isAdd
    ? "Add subcategory question"
    : isBulk
      ? "Bulk-apply across category"
      : "Edit question";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,15,16,0.55)" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border"
        style={{ background: "white", borderColor: BRAND.slate200 }}
      >
        <header
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: BRAND.slate200 }}
        >
          <h3
            className="text-base font-extrabold"
            style={{ color: BRAND.slate950 }}
          >
            {titleText}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1"
            style={{ color: BRAND.slate500 }}
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-3 px-5 py-4">
          <div
            className="rounded-lg px-3 py-2 text-[11px]"
            style={{ background: BRAND.slate50, color: BRAND.slate700 }}
          >
            <span className="font-bold">Bundle:</span> {state.bundleId}
            {!isAdd && (
              <>
                <span className="mx-1">·</span>
                <span className="font-bold">Archetype:</span> {state.archetype}
              </>
            )}
          </div>

          {isBulk && allBulkIds.length > 0 && (
            <Field
              label={`Apply to (${selectedBulkIds.size}/${allBulkIds.length} subcategories)`}
              hint="All subcategories are selected by default. Uncheck any you want to skip."
            >
              <div
                className="flex flex-wrap items-center gap-2 rounded-lg border px-2 py-2"
                style={{ borderColor: BRAND.slate200 }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBulkIds(new Set(allBulkIds))}
                  className="rounded border px-2 py-0.5 text-[10px] font-bold"
                  style={{ borderColor: BRAND.slate200, color: BRAND.purps }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBulkIds(new Set())}
                  className="rounded border px-2 py-0.5 text-[10px] font-bold"
                  style={{ borderColor: BRAND.slate200, color: BRAND.candy }}
                >
                  None
                </button>
                <div className="w-full" />
                {allBulkIds.map((sid) => {
                  const sub = CATEGORIES.flatMap((c) => c.subcategories).find(
                    (s) => subIdToString(s.subcategoryId) === sid,
                  );
                  const checked = selectedBulkIds.has(sid);
                  return (
                    <label
                      key={sid}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                      style={{
                        borderColor: checked ? BRAND.purps : BRAND.slate200,
                        background: checked ? BRAND.purpsSoft : "white",
                        color: checked ? BRAND.purps : BRAND.slate700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBulkId(sid)}
                      />
                      {sub?.subcategoryName ?? sid}
                    </label>
                  );
                })}
              </div>
            </Field>
          )}

          {isAdd && (
            <Field label="Archetype id">
              <input
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                placeholder="e.g. weekly_pattern"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.slate200 }}
              />
            </Field>
          )}

          <Field
            label="Question template"
            hint="Use {{ceName}} as a placeholder — it'll be substituted at assembly."
          >
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.slate200, fontFamily: "inherit" }}
            />
          </Field>

          <Field label="Notes (optional, audit trail)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Why this edit? Cite a DRD section or a CMS request."
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.slate200, fontFamily: "inherit" }}
            />
          </Field>

          <Field label="Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.slate200 }}
            />
          </Field>
        </div>
        <footer
          className="flex items-center justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: BRAND.slate200 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{
              borderColor: BRAND.slate200,
              color: BRAND.slate700,
              background: "white",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-extrabold"
            style={{
              background: isPending ? BRAND.slate200 : BRAND.purps,
              color: "white",
              border: "none",
            }}
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            {isBulk
              ? bulkAppliesToAll
                ? `Apply to all ${allBulkIds.length}`
                : `Apply to ${selectedBulkIds.size}`
              : isAdd
                ? "Add"
                : "Save"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[11px] font-bold uppercase tracking-wide"
        style={{ color: BRAND.slate700 }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span
          className="mt-1 block text-[11px]"
          style={{ color: BRAND.slate500 }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* External link helper for CE detail panel                                   */
/* -------------------------------------------------------------------------- */

export function questionBankDeepLinkForSub(
  subcategoryId: string | number,
): string {
  return `/question-bank?sub=${encodeURIComponent(String(subcategoryId))}`;
}

export function OpenInBankLink({
  subcategoryId,
}: {
  subcategoryId: string | number;
}) {
  return (
    <Link
      to={questionBankDeepLinkForSub(subcategoryId)}
      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
      style={{
        borderColor: BRAND.slate200,
        color: BRAND.purps,
        background: "white",
      }}
    >
      <ExternalLink size={11} /> Open in editor
    </Link>
  );
}
