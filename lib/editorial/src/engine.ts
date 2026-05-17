/**
 * Editorial Engine
 *
 * Generates complete EditorialOverlay instances from:
 * - Template registry
 * - Chart data
 * - CE data
 * - Visitor context
 */

import {
  EditorialOverlay as EditorialOverlaySchema,
  type EditorialOverlay,
  type VisitorContext,
} from "./types";
import { findTemplate } from "./templates";

// ─────────────────────────────────────────────────────────────
// Variable Resolver
// ─────────────────────────────────────────────────────────────

interface VariableSource {
  chartData: Record<string, unknown>;
  ceData: Record<string, unknown>;
  visitorContext: VisitorContext;
  computed: Record<string, unknown>;
}

function resolveVariable(
  name: string,
  definition: { source: string; key?: string; fallback: string },
  sources: VariableSource,
): string {
  const lookup = definition.key ?? name;
  let value: unknown;

  switch (definition.source) {
    case "chartData":
      value = sources.chartData[lookup];
      break;
    case "ceData":
      value = sources.ceData[lookup];
      break;
    case "visitorContext":
      value = (sources.visitorContext as Record<string, unknown>)[lookup];
      break;
    case "computed":
      value = sources.computed[lookup];
      break;
  }

  if (value === undefined || value === null) {
    return definition.fallback;
  }

  return String(value);
}

// ─────────────────────────────────────────────────────────────
// Template String Renderer
// ─────────────────────────────────────────────────────────────

function renderTemplate(
  template: string,
  variables: Record<string, { source: string; fallback: string }>,
  sources: VariableSource,
): string {
  let result = template;

  for (const [name, definition] of Object.entries(variables)) {
    const value = resolveVariable(name, definition, sources);
    result = result.replace(new RegExp(`\\{${name}\\}`, "g"), value);
  }

  result = result.replace(/\{[a-zA-Z_]+\}/g, "");

  return result.trim();
}

// ─────────────────────────────────────────────────────────────
// Condition Evaluator
// ─────────────────────────────────────────────────────────────

function evaluateCondition(
  condition: string | undefined,
  sources: VariableSource,
): boolean {
  if (!condition) return true;

  try {
    let expr = condition;
    for (const [key, val] of Object.entries(sources.chartData)) {
      expr = expr.replace(
        new RegExp(`chartData\\.${key}`, "g"),
        JSON.stringify(val),
      );
    }
    for (const [key, val] of Object.entries(sources.ceData)) {
      expr = expr.replace(
        new RegExp(`ceData\\.${key}`, "g"),
        JSON.stringify(val),
      );
    }
    for (const [key, val] of Object.entries(sources.visitorContext)) {
      expr = expr.replace(
        new RegExp(`visitorContext\\.${key}`, "g"),
        JSON.stringify(val),
      );
    }
    for (const [key, val] of Object.entries(sources.computed)) {
      expr = expr.replace(
        new RegExp(`computed\\.${key}`, "g"),
        JSON.stringify(val),
      );
    }

    // Strip any unresolved references so they evaluate to undefined
    expr = expr.replace(
      /(chartData|ceData|visitorContext|computed)\.[a-zA-Z_][a-zA-Z0-9_]*/g,
      "undefined",
    );

    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(`return (${expr});`);
    return Boolean(fn());
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Main Generator
// ─────────────────────────────────────────────────────────────

interface GenerateOptions {
  pageType: string;
  chartType: string;
  archetype: string;
  chartData: Record<string, unknown>;
  ceData: Record<string, unknown>;
  visitorContext?: VisitorContext;
  existingOverlay?: Partial<EditorialOverlay>;
}

export function generateEditorialOverlay(
  options: GenerateOptions,
): EditorialOverlay {
  const {
    pageType,
    chartType,
    archetype,
    chartData,
    ceData,
    visitorContext = {},
    existingOverlay,
  } = options;

  const template = findTemplate(pageType, chartType, archetype);

  const sources: VariableSource = {
    chartData,
    ceData,
    visitorContext,
    computed: {
      months: "6",
      recentBuyers: "2,000+",
      dataPoints: chartData.dataPoints ?? "thousands of",
    },
  };

  let headline = existingOverlay?.headline;
  let subheadline = existingOverlay?.subheadline;

  if (template) {
    const matchingHeadlines = template.headlineTemplates
      .filter((h) => evaluateCondition(h.condition, sources))
      .sort((a, b) => a.priority - b.priority);

    if (matchingHeadlines.length > 0) {
      headline = renderTemplate(
        matchingHeadlines[0].template,
        template.variables,
        sources,
      );
    }

    const matchingSubheadlines = [...template.subheadlineTemplates].sort(
      (a, b) => a.priority - b.priority,
    );

    if (matchingSubheadlines.length > 0) {
      subheadline = renderTemplate(
        matchingSubheadlines[0].template,
        template.variables,
        sources,
      );
    }
  }

  headline = headline || `${chartType} for ${ceData.name ?? "this attraction"}`;
  subheadline = subheadline || "Based on visitor data";

  let cta = existingOverlay?.cta;
  if (template?.ctaTemplates) {
    const matchingCtas = template.ctaTemplates
      .filter((c) => evaluateCondition(c.condition, sources))
      .sort((a, b) => a.priority - b.priority);

    if (matchingCtas.length > 0) {
      const chosen = matchingCtas[0];
      cta = {
        text: renderTemplate(chosen.template, template.variables, sources),
        variant: chosen.variant,
        url: chosen.urlTemplate
          ? renderTemplate(chosen.urlTemplate, template.variables, sources)
          : undefined,
      };
    }
  }

  let tip = existingOverlay?.tip;
  if (template?.tipTemplates) {
    const matchingTips = template.tipTemplates.filter((t) =>
      evaluateCondition(t.condition, sources),
    );

    if (matchingTips.length > 0) {
      const selectedTip =
        matchingTips[Math.floor(Math.random() * matchingTips.length)];
      tip = {
        icon: "💡",
        text: renderTemplate(
          selectedTip.template,
          template.variables,
          sources,
        ),
        highlight: false,
      };
    }
  }

  let warning = existingOverlay?.warning;
  if (template?.warningTemplates) {
    const matchingWarnings = template.warningTemplates.filter((w) =>
      evaluateCondition(w.condition, sources),
    );

    if (matchingWarnings.length > 0) {
      const selectedWarning = matchingWarnings[0];
      warning = {
        icon: selectedWarning.severity === "alert" ? "🚫" : "⚠️",
        text: renderTemplate(
          selectedWarning.template,
          template.variables,
          sources,
        ),
        severity: selectedWarning.severity,
      };
    }
  }

  let personalizationNote: string | undefined;
  if (visitorContext.visitMonth) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    personalizationNote = `Showing data for ${months[visitorContext.visitMonth - 1]}`;
  }
  if (visitorContext.hasMobilityNeeds) {
    personalizationNote = personalizationNote
      ? `${personalizationNote} · Accessibility-optimized`
      : "Showing accessibility-optimized options";
  }

  const confidence = existingOverlay?.confidence ?? {
    level: (chartData.confidence as "high" | "medium" | "low") ?? "medium",
    explanation: chartData.confidenceExplanation as string | undefined,
    dataPoints: chartData.dataPoints as number | undefined,
    dateRange: chartData.dateRange as string | undefined,
  };

  const freshness = existingOverlay?.freshness ?? {
    lastUpdated: new Date().toISOString(),
    updateFrequency:
      (chartData.updateFrequency as
        | "live"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly") ?? "monthly",
  };

  return EditorialOverlaySchema.parse({
    headline,
    subheadline,
    cta,
    tip,
    warning,
    personalizationNote,
    confidence,
    freshness,
    generatedAt: new Date().toISOString(),
    generatedBy: existingOverlay?.generatedBy ?? "ai",
    templateId: template?.id,
  });
}

// ─────────────────────────────────────────────────────────────
// Personalization Applier
// ─────────────────────────────────────────────────────────────

export function personalizeOverlay(
  overlay: EditorialOverlay,
  context: VisitorContext,
): EditorialOverlay {
  const personalized: EditorialOverlay = { ...overlay };

  if (context.isLastMinute && personalized.cta) {
    personalized.cta = {
      ...personalized.cta,
      text: personalized.cta.text.replace("Book", "Book now"),
      variant: "primary",
    };
  }

  if (context.hasChildren && personalized.tip) {
    personalized.tip = {
      ...personalized.tip,
      text: `${personalized.tip.text} (Family-friendly tips included)`,
    };
  }

  if (context.budgetPriority === "low" && personalized.cta) {
    personalized.subheadline = `${personalized.subheadline} · Best value options highlighted`;
  }

  return personalized;
}
