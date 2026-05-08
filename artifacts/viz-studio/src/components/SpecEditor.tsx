import { useMemo, useState } from "react";
import { Code2, FormInput } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { ChartSpec } from "@/lib/chart-spec";

/**
 * Per-archetype spec editor. Renders structured form controls bound to the
 * fields each chart archetype actually supports (lengths, enums, score
 * bounds) so the writer never has to hand-edit JSON. A "raw JSON" toggle
 * is kept as an escape hatch — useful when the verifier suggests a wholly
 * different shape, or when an archetype's editor doesn't yet cover an
 * uncommon optional field.
 *
 * The component is controlled — it owns NO derived state for the spec; it
 * just calls `onChange` with the fully-formed next spec on every keystroke.
 * That keeps the parent (chart row) the single source of truth for the
 * preview pane and the eventual PATCH body.
 */
export function SpecEditor({
  spec,
  onChange,
}: {
  spec: ChartSpec;
  onChange: (next: ChartSpec) => void;
}) {
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(spec, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Whenever the parent gives us a new spec (e.g. "Apply suggested edits"
  // from the verifier), refresh the JSON textarea so it stays in sync.
  const specJson = useMemo(() => JSON.stringify(spec, null, 2), [spec]);
  if (mode === "form" && jsonText !== specJson) {
    // Form mode: keep textarea ready with the latest spec for when the
    // writer flips to JSON mode mid-edit.
    setJsonText(specJson);
  }

  function commitJson(next: string) {
    setJsonText(next);
    try {
      const parsed = JSON.parse(next);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        (parsed as { type?: unknown }).type !== spec.type
      ) {
        setJsonError(`spec.type must remain "${spec.type}"`);
        return;
      }
      setJsonError(null);
      onChange(parsed as ChartSpec);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span style={tinyLabel}>Spec ({spec.type})</span>
        <div className="flex items-center gap-1" style={{ background: BRAND.slate100, borderRadius: 8, padding: 2 }}>
          <ModeBtn active={mode === "form"} onClick={() => setMode("form")}>
            <FormInput size={11} /> Form
          </ModeBtn>
          <ModeBtn active={mode === "json"} onClick={() => setMode("json")}>
            <Code2 size={11} /> JSON
          </ModeBtn>
        </div>
      </div>

      {mode === "form" ? (
        <FormForType spec={spec} onChange={onChange} />
      ) : (
        <>
          <textarea
            value={jsonText}
            onChange={(e) => commitJson(e.target.value)}
            spellCheck={false}
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              padding: 12,
              borderRadius: 10,
              background: BRAND.slate50,
              border: `1px solid ${jsonError ? BRAND.candy : BRAND.slate200}`,
              color: BRAND.slate950,
              minHeight: 280,
              resize: "vertical",
              outline: "none",
            }}
          />
          {jsonError && (
            <span style={{ color: BRAND.candy, fontSize: 11, fontWeight: 700 }}>
              {jsonError}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function FormForType({
  spec,
  onChange,
}: {
  spec: ChartSpec;
  onChange: (next: ChartSpec) => void;
}) {
  switch (spec.type) {
    case "weekly_pattern":
      return <WeeklyPatternEditor spec={spec} onChange={onChange} />;
    case "hourly_heatmap":
      return <HourlyHeatmapEditor spec={spec} onChange={onChange} />;
    case "month_calendar":
      return <MonthCalendarEditor spec={spec} onChange={onChange} />;
    case "booking_window":
      return <BookingWindowEditor spec={spec} onChange={onChange} />;
    case "stat_grid":
      return <StatGridEditor spec={spec} onChange={onChange} />;
    case "compare_zones":
      return <CompareZonesEditor spec={spec} onChange={onChange} />;
    case "donut_breakdown":
      return <DonutBreakdownEditor spec={spec} onChange={onChange} />;
    case "seasonal_curve":
      return <SeasonalCurveEditor spec={spec} onChange={onChange} />;
    case "ticket_ladder":
      return <TicketLadderEditor spec={spec} onChange={onChange} />;
    case "daily_pattern":
      return <DailyPatternEditor spec={spec} onChange={onChange} />;
    case "tribune_density":
      return <TribuneDensityEditor spec={spec} onChange={onChange} />;
    case "duration_profiles":
      return <DurationProfilesEditor spec={spec} onChange={onChange} />;
    case "entrance_lanes":
      return <EntranceLanesEditor spec={spec} onChange={onChange} />;
    case "co_bookings":
      return <CoBookingsEditor spec={spec} onChange={onChange} />;
    default:
      return (
        <div style={dim}>
          No structured editor for "{(spec as { type: string }).type}" yet —
          use the JSON tab.
        </div>
      );
  }
}

const TONES_PILL = ["candy", "okay", "purps"] as const;
const TONES_LANE = ["candy", "purps", "okay", "slate"] as const;
const TONES_DAILY = ["best", "peak", "second_best"] as const;
const TONES_DENSITY = ["quiet", "packed", "second_window"] as const;
const ICONS_PILL = [
  "calendar",
  "people",
  "people_full",
  "sun",
  "clock",
] as const;
const ICONS_PROFILE = [
  "stopwatch",
  "head",
  "column",
  "lyre",
  "bust",
  "bench",
] as const;
const ICONS_COBOOK = [
  "landmark",
  "church",
  "castle",
  "building",
  "trees",
  "gem",
] as const;

/* -------------------------------------------------------------------------- */
/* Per-archetype editors                                                       */
/* -------------------------------------------------------------------------- */

type Spec<T extends ChartSpec["type"]> = Extract<ChartSpec, { type: T }>;

const DAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LEVELS = ["closed", "quietest", "quiet", "busy", "busiest"] as const;
const SEASON_STATUSES = [
  "closed",
  "very_quiet",
  "quiet",
  "moderate",
  "busy",
  "peak",
] as const;
const ZONE_STATUSES = [
  "no_wait",
  "short",
  "medium",
  "long",
  "very_long",
  "closed",
] as const;
const ACCENTS = ["purps", "candy", "hola", "okay", "slate"] as const;
const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

function WeeklyPatternEditor({
  spec,
  onChange,
}: {
  spec: Spec<"weekly_pattern">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Hint>One row per day. Score 0–100, level controls colour bucket.</Hint>
      {spec.days.map((d, i) => (
        <div key={i} className="grid items-center gap-2" style={gridCols("60px 1fr 100px 1fr")}>
          <strong style={mono}>{d.day}</strong>
          <Select
            value={d.level}
            options={DAY_LEVELS}
            onChange={(v) =>
              onChange(setIn(spec, ["days", i, "level"], v))
            }
          />
          <NumInput
            value={d.score}
            min={0}
            max={100}
            onChange={(v) => onChange(setIn(spec, ["days", i, "score"], v))}
          />
          <TextInput
            value={d.note ?? ""}
            placeholder="note (optional)"
            onChange={(v) =>
              onChange(setIn(spec, ["days", i, "note"], v || undefined))
            }
          />
        </div>
      ))}
    </div>
  );
}

function HourlyHeatmapEditor({
  spec,
  onChange,
}: {
  spec: Spec<"hourly_heatmap">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2" style={gridCols("1fr 1fr")}>
        <Field label="Open hour (0-23)">
          <NumInput
            value={spec.open_hour}
            min={0}
            max={23}
            onChange={(v) => onChange({ ...spec, open_hour: v })}
          />
        </Field>
        <Field label="Close hour (1-24)">
          <NumInput
            value={spec.close_hour}
            min={1}
            max={24}
            onChange={(v) => onChange({ ...spec, close_hour: v })}
          />
        </Field>
      </div>
      <Hint>
        Heatmap intensity 0–100 per hour. Edit cells inline or use the JSON tab
        for bulk paste.
      </Hint>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th />
              {Array.from({ length: 24 }).map((_, h) => (
                <th
                  key={h}
                  style={{ padding: "2px 4px", color: BRAND.slate500 }}
                >
                  {h}
                </th>
              ))}
              <th style={{ padding: "2px 6px" }}>closed?</th>
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: "2px 6px" }}>
                  <strong style={mono}>{row.day}</strong>
                </td>
                {row.hours.map((h, hi) => (
                  <td key={hi} style={{ padding: 1 }}>
                    <input
                      type="number"
                      value={h}
                      min={0}
                      max={100}
                      onChange={(e) =>
                        onChange(
                          setIn(spec, ["rows", i, "hours", hi], Number(e.target.value)),
                        )
                      }
                      style={cellInput}
                    />
                  </td>
                ))}
                <td style={{ padding: "2px 6px" }}>
                  <input
                    type="checkbox"
                    checked={row.closed}
                    onChange={(e) =>
                      onChange(setIn(spec, ["rows", i, "closed"], e.target.checked))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthCalendarEditor({
  spec,
  onChange,
}: {
  spec: Spec<"month_calendar">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Start date (YYYY-MM-DD)">
        <TextInput
          value={spec.start_date}
          onChange={(v) => onChange({ ...spec, start_date: v })}
        />
      </Field>
      <Hint>
        Day grid is large ({spec.days.length} rows). Use the JSON tab for bulk
        edits; this form lets you tune the recommended dates that appear as
        chips below the calendar.
      </Hint>
      <Field label="Recommended dates (max 6)">
        <ListEditor
          items={spec.recommended_dates}
          empty={() => ({ date: "", reason: "" })}
          onChange={(next) => onChange({ ...spec, recommended_dates: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("160px 1fr")}>
              <TextInput
                value={item.date}
                placeholder="YYYY-MM-DD"
                onChange={(v) => set({ ...item, date: v })}
              />
              <TextInput
                value={item.reason}
                placeholder="why (≤ 80 chars)"
                onChange={(v) => set({ ...item, reason: v })}
              />
            </div>
          )}
          maxItems={6}
        />
      </Field>
    </div>
  );
}

function BookingWindowEditor({
  spec,
  onChange,
}: {
  spec: Spec<"booking_window">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Sweet spot label">
        <TextInput
          value={spec.sweet_spot.label}
          onChange={(v) =>
            onChange({
              ...spec,
              sweet_spot: { ...spec.sweet_spot, label: v },
            })
          }
        />
      </Field>
      <div className="grid gap-2" style={gridCols("1fr 1fr")}>
        <Field label="Sweet spot — min days before">
          <NumInput
            value={spec.sweet_spot.days_before_min}
            min={0}
            max={180}
            onChange={(v) =>
              onChange({
                ...spec,
                sweet_spot: { ...spec.sweet_spot, days_before_min: v },
              })
            }
          />
        </Field>
        <Field label="Sweet spot — max days before">
          <NumInput
            value={spec.sweet_spot.days_before_max}
            min={0}
            max={180}
            onChange={(v) =>
              onChange({
                ...spec,
                sweet_spot: { ...spec.sweet_spot, days_before_max: v },
              })
            }
          />
        </Field>
      </div>
      <Field label="Booking-curve points (days before → share %)">
        <ListEditor
          items={spec.curve}
          empty={() => ({ days_before: 0, share: 0 })}
          onChange={(next) => onChange({ ...spec, curve: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("1fr 1fr")}>
              <NumInput
                value={item.days_before}
                min={0}
                max={180}
                onChange={(v) => set({ ...item, days_before: v })}
              />
              <NumInput
                value={item.share}
                min={0}
                max={100}
                onChange={(v) => set({ ...item, share: v })}
              />
            </div>
          )}
          minItems={8}
        />
      </Field>
    </div>
  );
}

function StatGridEditor({
  spec,
  onChange,
}: {
  spec: Spec<"stat_grid">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <Field label="Stats (2-6)">
      <ListEditor
        items={spec.stats}
        empty={() => ({
          label: "",
          value: "",
          unit: undefined,
          accent: "purps" as const,
        })}
        onChange={(next) => onChange({ ...spec, stats: next })}
        render={(item, set) => (
          <div className="grid gap-2" style={gridCols("1fr 1fr 1fr 1fr")}>
            <TextInput
              value={item.label}
              placeholder="label"
              onChange={(v) => set({ ...item, label: v })}
            />
            <TextInput
              value={item.value}
              placeholder="value"
              onChange={(v) => set({ ...item, value: v })}
            />
            <TextInput
              value={item.unit ?? ""}
              placeholder="unit (opt)"
              onChange={(v) => set({ ...item, unit: v || undefined })}
            />
            <Select
              value={item.accent ?? "purps"}
              options={ACCENTS}
              onChange={(v) => set({ ...item, accent: v })}
            />
          </div>
        )}
        minItems={2}
        maxItems={6}
      />
    </Field>
  );
}

function CompareZonesEditor({
  spec,
  onChange,
}: {
  spec: Spec<"compare_zones">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Metric label">
        <TextInput
          value={spec.metric_label}
          onChange={(v) => onChange({ ...spec, metric_label: v })}
        />
      </Field>
      <Field label="Zones (2-6)">
        <ListEditor
          items={spec.zones}
          empty={() => ({
            name: "",
            wait_min: 0,
            wait_max: 0,
            status: "short" as const,
          })}
          onChange={(next) => onChange({ ...spec, zones: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("1.4fr 90px 90px 1fr")}>
              <TextInput
                value={item.name}
                placeholder="zone name"
                onChange={(v) => set({ ...item, name: v })}
              />
              <NumInput
                value={item.wait_min}
                min={0}
                max={360}
                onChange={(v) => set({ ...item, wait_min: v })}
              />
              <NumInput
                value={item.wait_max}
                min={0}
                max={360}
                onChange={(v) => set({ ...item, wait_max: v })}
              />
              <Select
                value={item.status}
                options={ZONE_STATUSES}
                onChange={(v) => set({ ...item, status: v })}
              />
            </div>
          )}
          minItems={2}
          maxItems={6}
        />
      </Field>
    </div>
  );
}

function DonutBreakdownEditor({
  spec,
  onChange,
}: {
  spec: Spec<"donut_breakdown">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2" style={gridCols("1fr 1fr")}>
        <Field label="Center value">
          <TextInput
            value={spec.center_value}
            onChange={(v) => onChange({ ...spec, center_value: v })}
          />
        </Field>
        <Field label="Center label">
          <TextInput
            value={spec.center_label}
            onChange={(v) => onChange({ ...spec, center_label: v })}
          />
        </Field>
      </div>
      <Field label="Segments (2-6, total ≈ 100)">
        <ListEditor
          items={spec.segments}
          empty={() => ({ label: "", value: 0, accent: "purps" as const })}
          onChange={(next) => onChange({ ...spec, segments: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("1fr 100px 1fr")}>
              <TextInput
                value={item.label}
                placeholder="label"
                onChange={(v) => set({ ...item, label: v })}
              />
              <NumInput
                value={item.value}
                min={0}
                max={100}
                onChange={(v) => set({ ...item, value: v })}
              />
              <Select
                value={item.accent ?? "purps"}
                options={ACCENTS}
                onChange={(v) => set({ ...item, accent: v })}
              />
            </div>
          )}
          minItems={2}
          maxItems={6}
        />
      </Field>
    </div>
  );
}

function SeasonalCurveEditor({
  spec,
  onChange,
}: {
  spec: Spec<"seasonal_curve">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Hint>One row per month. Score 0–100, status drives colour band.</Hint>
      {spec.months.map((m, i) => (
        <div key={i} className="grid items-center gap-2" style={gridCols("60px 100px 1fr 1fr")}>
          <strong style={mono}>{m.month}</strong>
          <NumInput
            value={m.score}
            min={0}
            max={100}
            onChange={(v) => onChange(setIn(spec, ["months", i, "score"], v))}
          />
          <Select
            value={m.status}
            options={SEASON_STATUSES}
            onChange={(v) => onChange(setIn(spec, ["months", i, "status"], v))}
          />
          <TextInput
            value={m.note ?? ""}
            placeholder="note (optional)"
            onChange={(v) =>
              onChange(setIn(spec, ["months", i, "note"], v || undefined))
            }
          />
        </div>
      ))}
      <Field label="Best months (CSV of jan,feb…)">
        <TextInput
          value={spec.best_months.join(",")}
          onChange={(v) =>
            onChange({
              ...spec,
              best_months: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 4),
            })
          }
        />
      </Field>
      <Field label="Worst months (CSV)">
        <TextInput
          value={spec.worst_months.join(",")}
          onChange={(v) =>
            onChange({
              ...spec,
              worst_months: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 4),
            })
          }
        />
      </Field>
    </div>
  );
}

function TicketLadderEditor({
  spec,
  onChange,
}: {
  spec: Spec<"ticket_ladder">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Currency">
        <TextInput
          value={spec.currency}
          onChange={(v) => onChange({ ...spec, currency: v.slice(0, 4) })}
        />
      </Field>
      <Field label="Tiers (2-5, only one may be 'recommended')">
        <ListEditor
          items={spec.tiers}
          empty={() => ({ name: "", price: 0, includes: [], recommended: false })}
          onChange={(next) => onChange({ ...spec, tiers: next })}
          render={(item, set) => (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2" style={gridCols("1.6fr 100px 90px")}>
                <TextInput
                  value={item.name}
                  placeholder="name"
                  onChange={(v) => set({ ...item, name: v })}
                />
                <NumInput
                  value={item.price}
                  min={0}
                  max={2000}
                  onChange={(v) => set({ ...item, price: v })}
                />
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: BRAND.slate700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.recommended}
                    onChange={(e) => set({ ...item, recommended: e.target.checked })}
                  />
                  recommended
                </label>
              </div>
              <TextInput
                value={item.includes.join(" | ")}
                placeholder="includes (pipe-separated, max 5)"
                onChange={(v) =>
                  set({
                    ...item,
                    includes: v
                      .split("|")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 5),
                  })
                }
              />
            </div>
          )}
          minItems={2}
          maxItems={5}
        />
      </Field>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Curated-archetype editors (Florence cluster)                                */
/* -------------------------------------------------------------------------- */

function DailyPatternEditor({
  spec,
  onChange,
}: {
  spec: Spec<"daily_pattern">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Time-of-day points (HH:MM, crowd 0–10)">
        <ListEditor
          items={spec.points}
          empty={() => ({ time: "12:00", crowd: 5 })}
          onChange={(next) => onChange({ ...spec, points: next })}
          minItems={1}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("100px 1fr")}>
              <TextInput
                value={item.time}
                placeholder="HH:MM"
                onChange={(v) => set({ ...item, time: v })}
              />
              <NumInput
                value={item.crowd}
                min={0}
                max={10}
                onChange={(v) => set({ ...item, crowd: v })}
              />
            </div>
          )}
        />
      </Field>
      <Field label="Background zones">
        <ListEditor
          items={spec.zones}
          empty={(): Spec<"daily_pattern">["zones"][number] => ({ label: "Best", tone: "best", start: "09:00", end: "11:00" })}
          onChange={(next) => onChange({ ...spec, zones: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("1fr 110px 90px 90px")}>
              <TextInput value={item.label} onChange={(v) => set({ ...item, label: v })} />
              <Select value={item.tone} options={TONES_DAILY} onChange={(v) => set({ ...item, tone: v })} />
              <TextInput value={item.start} placeholder="HH:MM" onChange={(v) => set({ ...item, start: v })} />
              <TextInput value={item.end} placeholder="HH:MM" onChange={(v) => set({ ...item, end: v })} />
            </div>
          )}
        />
      </Field>
      <div className="grid gap-3" style={gridCols("1fr 1fr")}>
        <Field label="Caption · opens">
          <TextInput
            value={spec.caption?.opens ?? ""}
            placeholder="Opens 8:15am"
            onChange={(v) =>
              onChange({
                ...spec,
                caption: { ...(spec.caption ?? {}), opens: v || undefined },
              })
            }
          />
        </Field>
        <Field label="Caption · last entry">
          <TextInput
            value={spec.caption?.last_entry ?? ""}
            placeholder="Last entry 6:20pm"
            onChange={(v) =>
              onChange({
                ...spec,
                caption: { ...(spec.caption ?? {}), last_entry: v || undefined },
              })
            }
          />
        </Field>
      </div>
    </div>
  );
}

function TribuneDensityEditor({
  spec,
  onChange,
}: {
  spec: Spec<"tribune_density">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3" style={gridCols("1fr 1fr")}>
        <Field label="Scope">
          <TextInput value={spec.scope} onChange={(v) => onChange({ ...spec, scope: v })} />
        </Field>
        <Field label="Y-axis label">
          <TextInput value={spec.y_label} onChange={(v) => onChange({ ...spec, y_label: v })} />
        </Field>
      </div>
      <Field label="Density points (HH:MM, 0–10)">
        <ListEditor
          items={spec.points}
          empty={() => ({ time: "12:00", density: 5 })}
          onChange={(next) => onChange({ ...spec, points: next })}
          minItems={1}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("100px 1fr")}>
              <TextInput value={item.time} placeholder="HH:MM" onChange={(v) => set({ ...item, time: v })} />
              <NumInput value={item.density} min={0} max={10} onChange={(v) => set({ ...item, density: v })} />
            </div>
          )}
        />
      </Field>
      <Field label="Zones">
        <ListEditor
          items={spec.zones}
          empty={(): Spec<"tribune_density">["zones"][number] => ({ label: "Quiet", tone: "quiet", start: "09:00", end: "11:00" })}
          onChange={(next) => onChange({ ...spec, zones: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("1fr 130px 90px 90px")}>
              <TextInput value={item.label} onChange={(v) => set({ ...item, label: v })} />
              <Select value={item.tone} options={TONES_DENSITY} onChange={(v) => set({ ...item, tone: v })} />
              <TextInput value={item.start} placeholder="HH:MM" onChange={(v) => set({ ...item, start: v })} />
              <TextInput value={item.end} placeholder="HH:MM" onChange={(v) => set({ ...item, end: v })} />
            </div>
          )}
        />
      </Field>
      <Field label="Arrow callout (optional)">
        <div className="grid gap-2" style={gridCols("1fr 90px 1fr")}>
          <TextInput
            value={spec.arrow_callout?.label ?? ""}
            placeholder="Label"
            onChange={(v) =>
              onChange({
                ...spec,
                arrow_callout: v
                  ? { ...(spec.arrow_callout ?? { at: "12:00" }), label: v }
                  : undefined,
              })
            }
          />
          <TextInput
            value={spec.arrow_callout?.at ?? ""}
            placeholder="HH:MM"
            onChange={(v) =>
              onChange({
                ...spec,
                arrow_callout: spec.arrow_callout
                  ? { ...spec.arrow_callout, at: v }
                  : { label: "", at: v },
              })
            }
          />
          <TextInput
            value={spec.arrow_callout?.helper ?? ""}
            placeholder="Helper (optional)"
            onChange={(v) =>
              onChange({
                ...spec,
                arrow_callout: spec.arrow_callout
                  ? { ...spec.arrow_callout, helper: v || undefined }
                  : undefined,
              })
            }
          />
        </div>
      </Field>
      <Field label="Context pills">
        <ListEditor
          items={spec.context_pills}
          empty={(): Spec<"tribune_density">["context_pills"][number] => ({
            icon: "calendar",
            title: "Title",
            subtitle: "Subtitle",
            tone: "purps",
          })}
          onChange={(next) => onChange({ ...spec, context_pills: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("110px 1fr 1fr 90px")}>
              <Select value={item.icon} options={ICONS_PILL} onChange={(v) => set({ ...item, icon: v })} />
              <TextInput value={item.title} onChange={(v) => set({ ...item, title: v })} />
              <TextInput value={item.subtitle} onChange={(v) => set({ ...item, subtitle: v })} />
              <Select value={item.tone} options={TONES_PILL} onChange={(v) => set({ ...item, tone: v })} />
            </div>
          )}
        />
      </Field>
      <Hint>
        Pill `focus` (lock-on-click target) is an advanced field — set it via
        the JSON tab when needed.
      </Hint>
    </div>
  );
}

function DurationProfilesEditor({
  spec,
  onChange,
}: {
  spec: Spec<"duration_profiles">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Headline">
        <TextInput value={spec.headline} onChange={(v) => onChange({ ...spec, headline: v })} />
      </Field>
      <Field label="Time-scale ticks (label + minutes)">
        <ListEditor
          items={spec.scale_min}
          empty={() => ({ label: "1h", minutes: 60 })}
          onChange={(next) => onChange({ ...spec, scale_min: next })}
          render={(item, set) => (
            <div className="grid gap-2" style={gridCols("1fr 100px")}>
              <TextInput value={item.label} onChange={(v) => set({ ...item, label: v })} />
              <NumInput value={item.minutes} min={0} max={600} onChange={(v) => set({ ...item, minutes: v })} />
            </div>
          )}
        />
      </Field>
      <Field label="Visitor profiles">
        <ListEditor
          items={spec.profiles}
          empty={(): Spec<"duration_profiles">["profiles"][number] => ({
            name: "Visitor",
            icon: "head",
            range_min: 30,
            range_max: 60,
          })}
          onChange={(next) => onChange({ ...spec, profiles: next })}
          minItems={1}
          render={(item, set) => (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2" style={gridCols("1fr 110px 90px 90px")}>
                <TextInput value={item.name} onChange={(v) => set({ ...item, name: v })} />
                <Select value={item.icon} options={ICONS_PROFILE} onChange={(v) => set({ ...item, icon: v })} />
                <NumInput value={item.range_min} min={0} max={600} onChange={(v) => set({ ...item, range_min: v })} />
                <NumInput value={item.range_max} min={0} max={600} onChange={(v) => set({ ...item, range_max: v })} />
              </div>
              <TextInput
                value={item.note ?? ""}
                placeholder="Short note (optional)"
                onChange={(v) => set({ ...item, note: v || undefined })}
              />
              <label
                className="flex items-center gap-2"
                style={{ fontSize: 11, fontWeight: 700, color: BRAND.slate700 }}
              >
                <input
                  type="checkbox"
                  checked={!!item.highlight}
                  onChange={(e) => set({ ...item, highlight: e.target.checked })}
                />
                highlight as recommended
              </label>
            </div>
          )}
        />
      </Field>
      <Field label="Tip (optional pill at bottom)">
        <TextInput
          value={spec.tip ?? ""}
          onChange={(v) => onChange({ ...spec, tip: v || undefined })}
        />
      </Field>
      <Hint>
        Locked-panel fields (`description`, `skips`, `lane`) live on each
        profile — edit via JSON tab when needed.
      </Hint>
    </div>
  );
}

function EntranceLanesEditor({
  spec,
  onChange,
}: {
  spec: Spec<"entrance_lanes">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3" style={gridCols("1fr 1fr")}>
        <Field label="Venue label">
          <TextInput
            value={spec.venue_label}
            onChange={(v) => onChange({ ...spec, venue_label: v })}
          />
        </Field>
        <Field label="Shared caption">
          <TextInput
            value={spec.shared_caption}
            onChange={(v) => onChange({ ...spec, shared_caption: v })}
          />
        </Field>
      </div>
      <Field label="Lanes">
        <ListEditor
          items={spec.lanes}
          empty={(): Spec<"entrance_lanes">["lanes"][number] => ({
            name: "Lane",
            wait_label: "10–20 min",
            tone: "okay",
            dots: 10,
          })}
          onChange={(next) => onChange({ ...spec, lanes: next })}
          minItems={1}
          render={(item, set) => (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2" style={gridCols("1fr 1fr 110px 80px")}>
                <TextInput value={item.name} onChange={(v) => set({ ...item, name: v })} />
                <TextInput value={item.wait_label} onChange={(v) => set({ ...item, wait_label: v })} />
                <Select value={item.tone} options={TONES_LANE} onChange={(v) => set({ ...item, tone: v })} />
                <NumInput value={item.dots} min={0} max={40} onChange={(v) => set({ ...item, dots: v })} />
              </div>
              <label
                className="flex items-center gap-2"
                style={{ fontSize: 11, fontWeight: 700, color: BRAND.slate700 }}
              >
                <input
                  type="checkbox"
                  checked={!!item.dashed}
                  onChange={(e) => set({ ...item, dashed: e.target.checked })}
                />
                dashed border
              </label>
            </div>
          )}
        />
      </Field>
      <Hint>
        Locked-detail fields (`who`, `wait_peak`, `wait_off_peak`, `how`) live
        on each lane — edit via JSON tab when needed.
      </Hint>
    </div>
  );
}

function CoBookingsEditor({
  spec,
  onChange,
}: {
  spec: Spec<"co_bookings">;
  onChange: (next: ChartSpec) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Items (paired attractions, % share)">
        <ListEditor
          items={spec.items}
          empty={(): Spec<"co_bookings">["items"][number] => ({
            name: "Pairing",
            share: 25,
            icon: "landmark",
          })}
          onChange={(next) => onChange({ ...spec, items: next })}
          minItems={1}
          render={(item, set) => (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2" style={gridCols("1fr 80px 110px")}>
                <TextInput value={item.name} onChange={(v) => set({ ...item, name: v })} />
                <NumInput value={item.share} min={0} max={100} onChange={(v) => set({ ...item, share: v })} />
                <Select value={item.icon} options={ICONS_COBOOK} onChange={(v) => set({ ...item, icon: v })} />
              </div>
              <TextInput
                value={item.badge ?? ""}
                placeholder="Badge (optional, e.g. Top pairing)"
                onChange={(v) => set({ ...item, badge: v || undefined })}
              />
            </div>
          )}
        />
      </Field>
      <Field label="Highlight top N items in solid Purps (optional)">
        <NumInput
          value={spec.highlight_top ?? 0}
          min={0}
          max={20}
          onChange={(v) => onChange({ ...spec, highlight_top: v || undefined })}
        />
      </Field>
      <Hint>
        Locked-panel fields (`pairing`, `walk`, `on_library`) live on each item
        — edit via JSON tab when needed.
      </Hint>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Generic primitives                                                          */
/* -------------------------------------------------------------------------- */

function ListEditor<T>({
  items,
  empty,
  render,
  onChange,
  minItems,
  maxItems,
}: {
  items: T[];
  empty: () => T;
  render: (item: T, set: (next: T) => void) => React.ReactNode;
  onChange: (next: T[]) => void;
  minItems?: number;
  maxItems?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2"
          style={{
            background: BRAND.slate50,
            border: `1px solid ${BRAND.slate100}`,
            borderRadius: 8,
            padding: 8,
          }}
        >
          <div className="flex-1 min-w-0">
            {render(item, (next) => {
              const arr = items.slice();
              arr[i] = next;
              onChange(arr);
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (minItems && items.length <= minItems) return;
              const arr = items.slice();
              arr.splice(i, 1);
              onChange(arr);
            }}
            disabled={!!minItems && items.length <= minItems}
            title={
              minItems && items.length <= minItems
                ? `Must keep at least ${minItems}`
                : "Remove"
            }
            style={removeBtn}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, empty()])}
        disabled={!!maxItems && items.length >= maxItems}
        style={addBtn}
      >
        + Add {maxItems ? `(${items.length}/${maxItems})` : ""}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={tinyLabel}>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

function NumInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={inputStyle}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={dim}>{children}</div>;
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? "white" : "transparent",
        color: active ? BRAND.slate950 : BRAND.slate500,
        border: "none",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Tiny immutable setter — `setIn(obj, ["a", 0, "b"], value)` returns a new
 * `obj` with the nested path updated. Keeps the per-archetype editors above
 * to a single line per change.
 */
function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const arr = obj.slice();
    const idx = head as number;
    arr[idx] = setIn(arr[idx], rest, value);
    return arr as unknown as T;
  }
  const o = obj as Record<string, unknown>;
  return { ...o, [head as string]: setIn(o[head as string], rest, value) } as T;
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const inputStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BRAND.slate200}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: BRAND.slate950,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  minWidth: 0,
};

const cellInput: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BRAND.slate100}`,
  borderRadius: 4,
  padding: "1px 3px",
  fontSize: 10,
  fontWeight: 600,
  color: BRAND.slate950,
  outline: "none",
  width: 36,
  textAlign: "center",
};

const tinyLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: BRAND.slate700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const dim: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: BRAND.slate500,
  lineHeight: 1.4,
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 11,
  fontWeight: 800,
  color: BRAND.slate700,
};

const removeBtn: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BRAND.slate200}`,
  borderRadius: 6,
  width: 24,
  height: 24,
  fontSize: 14,
  fontWeight: 800,
  color: BRAND.candy,
  cursor: "pointer",
  flexShrink: 0,
};

const addBtn: React.CSSProperties = {
  background: BRAND.slate50,
  border: `1px dashed ${BRAND.slate200}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 800,
  color: BRAND.slate700,
  cursor: "pointer",
};

function gridCols(template: string): React.CSSProperties {
  return { gridTemplateColumns: template };
}
