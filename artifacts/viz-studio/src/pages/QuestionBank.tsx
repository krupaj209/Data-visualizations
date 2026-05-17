import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CHART_ARCHETYPES,
  QUESTION_BUNDLES,
  VISITOR_INTENTS,
  PAGE_TEMPLATES,
  type BundleId,
  type ChartArchetypeId,
  type PageType,
  type VisitorIntentId,
} from "@workspace/question-bank";

interface BankSnapshot {
  archetypes: typeof CHART_ARCHETYPES;
  intents: typeof VISITOR_INTENTS;
  bundles: typeof QUESTION_BUNDLES;
  pageTemplates: typeof PAGE_TEMPLATES;
  subcategories: { id: string; label: string; description: string }[];
}

async function fetchBank(): Promise<BankSnapshot> {
  const res = await fetch("/api/question-bank");
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

export default function QuestionBank() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["question-bank"],
    queryFn: fetchBank,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Intent-driven question bank
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            The flat per-subcategory question dump is gone. Decks are now
            assembled deterministically from{" "}
            <span className="font-medium">visitor intents</span> →{" "}
            <span className="font-medium">question bundles</span> →{" "}
            <span className="font-medium">page templates</span>. The page
            templates pick which bundles fire for each listing surface.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to CEs
        </Link>
      </header>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="text-sm text-rose-600">
          Failed to load the question bank: {(error as Error).message}
        </p>
      )}

      {data && (
        <div className="space-y-10">
          <Section
            title="Visitor intents"
            subtitle="The seven first-class jobs a visitor brings to a listing page."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {Object.values(data.intents).map((intent) => (
                <article
                  key={intent.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <header className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">
                      {intent.label}
                    </h3>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {intent.id}
                    </code>
                  </header>
                  <p className="mt-1 text-sm text-slate-600">
                    {intent.visitor_state}
                  </p>
                </article>
              ))}
            </div>
          </Section>

          <Section
            title="Question bundles"
            subtitle="Each bundle resolves to one chart. The assembler scores bundles against extracted DRD signals and picks the highest-priority candidate archetype that has evidence."
          >
            <div className="space-y-3">
              {Object.values(data.bundles).map((bundle) => (
                <article
                  key={bundle.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-medium text-slate-900">
                      {bundle.label}
                    </h3>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {bundle.id satisfies BundleId}
                    </code>
                  </header>
                  <p className="mt-1 text-sm text-slate-600">
                    {bundle.description}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">
                        Intent
                      </dt>
                      <dd>
                        {data.intents[bundle.intent as VisitorIntentId]
                          ?.label ?? bundle.intent}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">
                        Candidate archetypes
                      </dt>
                      <dd className="flex flex-wrap gap-1">
                        {bundle.candidates.map((c) => (
                          <code
                            key={c.archetype}
                            className="rounded bg-purps/10 px-1.5 py-0.5 text-[11px] text-purps"
                            title={
                              data.archetypes[c.archetype as ChartArchetypeId]
                                ?.label ?? c.archetype
                            }
                          >
                            {c.archetype}
                          </code>
                        ))}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </Section>

          <Section
            title="Page templates"
            subtitle="Which bundles fire on each listing surface. Slot order is render order, top to bottom."
          >
            <div className="space-y-3">
              {Object.values(data.pageTemplates).map((tmpl) => (
                <article
                  key={tmpl.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-medium text-slate-900">
                      {tmpl.label}
                    </h3>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {tmpl.id satisfies PageType}
                    </code>
                  </header>
                  <p className="mt-1 text-sm text-slate-600">
                    {tmpl.narrative}
                  </p>
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {tmpl.slots.map((slot, idx) => (
                      <li key={idx}>
                        <span className="font-medium">
                          {slot.bundleId
                            ? (data.bundles[slot.bundleId]?.label ??
                              slot.bundleId)
                            : "(forced archetype)"}
                        </span>
                        {slot.required ? (
                          <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                            required
                          </span>
                        ) : null}
                        {slot.forcedArchetype ? (
                          <span className="ml-2 text-xs text-slate-500">
                            → forced to{" "}
                            <code className="text-purps">
                              {slot.forcedArchetype}
                            </code>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </Section>

          <Section
            title="Subcategories (metadata only)"
            subtitle="Used to bootstrap CE rows and route long-tail content. Selection no longer reads per-subcategory question lists — the intent engine handles all decks."
          >
            <ul className="grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-3">
              {data.subcategories.map((s) => (
                <li
                  key={s.id}
                  className="rounded border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="font-medium text-slate-900">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.id}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>
      {children}
    </section>
  );
}
