import { EntranceMapChart } from "@viz/components/charts/EntranceMapChart";
import type { EntranceMapSpec } from "@/lib/chart-spec";

/* Colosseum — exercises the new spatial fields (compass positions,
 * transport, assembly point, intro phrase). */
const COLOSSEUM_SPEC: EntranceMapSpec = {
  type: "entrance_map",
  venue_label: "Colosseum",
  intro_phrase: "3 entrances · west, north, north-east",
  entrances: [
    {
      name: "Sperone Valadier",
      status: "recommended",
      position: "w",
      wait_label: "10–20 min",
      best_for: ["individuals", "skip-the-line tickets"],
      transport: { mode: "metro", label: "Metro B · Colosseo (3 min walk)" },
      note: "Main visitor entrance on the west side, facing Via di San Gregorio.",
    },
    {
      name: "Group Gate",
      status: "groups",
      position: "n",
      wait_label: "Tour-led",
      best_for: ["organised groups"],
      transport: { mode: "metro", label: "Metro B · Colosseo (2 min walk)" },
    },
    {
      name: "Stern Gate",
      status: "groups",
      position: "ne",
      wait_label: "Tour-led",
      best_for: ["school groups"],
      transport: { mode: "bus", label: "Bus 75/87 · Via Labicana" },
    },
  ],
  assembly_point: {
    label: "Tour meeting point · Arco di Costantino",
    position: "sw",
  },
  callout:
    "The Colosseum has three entrances on its northern half — Sperone Valadier on the west, Group Gate on the north, and Stern Gate on the north-east facing Via Labicana.",
};

/* Vatican Museums — no spatial fields, exercises the auto-layout
 * ring fallback so legacy specs still render as a map. */
const VATICAN_SPEC: EntranceMapSpec = {
  type: "entrance_map",
  venue_label: "Vatican Museums",
  entrances: [
    {
      name: "Viale Vaticano (main)",
      status: "standard",
      wait_label: "60–120 min",
      best_for: ["walk-up tickets"],
      note: "Default queue at the official ticket office.",
    },
    {
      name: "Sant'Anna Gate (reserved)",
      status: "recommended",
      wait_label: "5–15 min",
      best_for: ["skip-the-line tickets", "early entry"],
      note: "Used by pre-booked timed-entry holders.",
    },
    {
      name: "Cancello Petriano",
      status: "groups",
      wait_label: "Tour-led",
      best_for: ["organised groups"],
    },
    {
      name: "Step-free entrance",
      status: "accessible",
      best_for: ["wheelchair users", "strollers"],
      note: "Ramp and lift access.",
    },
    { name: "Old service gate", status: "closed", note: "Staff-only." },
  ],
  callout:
    "Pre-book a timed slot and use Sant'Anna — biggest queue-saver at the Vatican.",
};

function Frame({
  title,
  width,
  height,
  spec,
  compact,
}: {
  title: string;
  width: number | string;
  height: number;
  spec: EntranceMapSpec;
  compact?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#666",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {title} — {typeof width === "number" ? `${width}px` : width} × {height}px
      </div>
      <div
        style={{
          width,
          height,
          border: "1px dashed #d0d0d0",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <EntranceMapChart spec={spec} compact={compact} />
      </div>
    </div>
  );
}

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <header>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              color: "#0F0F10",
            }}
          >
            Entrance map — schematic
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#666",
              margin: "6px 0 0",
              maxWidth: 720,
            }}
          >
            Two variants at the three embed-size break-points the CMS targets.
            Colosseum exercises the new spatial fields; Vatican falls back to
            the auto-layout ring.
          </p>
        </header>

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Colosseum — with spatial fields
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            <Frame title="Desktop article body" width={720} height={400} spec={COLOSSEUM_SPEC} />
            <Frame title="Mobile" width={360} height={420} spec={COLOSSEUM_SPEC} />
            <Frame title="Compact" width={320} height={260} spec={COLOSSEUM_SPEC} compact />
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Vatican Museums — auto-layout fallback (no positions)
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            <Frame title="Desktop article body" width={720} height={460} spec={VATICAN_SPEC} />
            <Frame title="Mobile" width={360} height={520} spec={VATICAN_SPEC} />
            <Frame title="Compact" width={320} height={280} spec={VATICAN_SPEC} compact />
          </div>
        </section>
      </div>
    </div>
  );
}
