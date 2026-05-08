import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useListQuestionTroubleScores } from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { HeadoutLogo } from "@/components/HeadoutLogo";

export default function TriageQuestions() {
  const { data, isLoading, error } = useListQuestionTroubleScores();

  return (
    <div className="min-h-screen" style={{ background: BRAND.bgShell }}>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <HeadoutLogo height={20} />
          </Link>
          <span style={{ color: BRAND.slate300 }}>/</span>
          <Link
            href="/triage"
            style={{
              color: BRAND.slate700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <ArrowLeft size={16} />
            Triage
          </Link>
          <span style={{ color: BRAND.slate300 }}>/</span>
          <strong style={{ color: BRAND.slate950, fontSize: 15 }}>
            Trouble-score by question
          </strong>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <p
          style={{
            color: BRAND.slate700,
            fontSize: 13,
            fontWeight: 600,
            maxWidth: 760,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          Aggregates feedback severity, status, and writer-edit counts across
          every CE that asks the same question. Use this to find the chart
          archetypes that consistently underperform — they're the ones worth
          tweaking in the question bank or archetype prompt.
        </p>

        {isLoading && (
          <div className="flex items-center gap-2" style={{ color: BRAND.slate500 }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div style={{ color: BRAND.candy, fontWeight: 700 }}>
            Failed to load trouble scores.
          </div>
        )}
        {!isLoading && !error && (data?.length ?? 0) === 0 && (
          <div
            style={{
              padding: 28,
              border: `1px dashed ${BRAND.slate200}`,
              borderRadius: 16,
              color: BRAND.slate500,
              fontWeight: 600,
            }}
          >
            No trouble signals yet. Once charts get feedback or get edited,
            their parent questions surface here.
          </div>
        )}

        {data && data.length > 0 && (
          <div
            style={{
              background: "white",
              border: `1px solid ${BRAND.slate100}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: BRAND.purpsSoft,
                    color: BRAND.purps,
                    textAlign: "left",
                  }}
                >
                  <Th>Question</Th>
                  <Th>Subcategory</Th>
                  <Th>Type</Th>
                  <Th align="right">Charts</Th>
                  <Th align="right">Open</Th>
                  <Th align="right">Edits</Th>
                  <Th align="right">Trouble</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={`${row.subcategoryId}::${row.questionText}`}
                    style={{
                      borderTop:
                        i === 0 ? "none" : `1px solid ${BRAND.slate100}`,
                    }}
                  >
                    <Td>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: BRAND.slate950,
                          maxWidth: 420,
                        }}
                      >
                        {row.questionText}
                      </div>
                      {row.sampleCeSlugs.length > 0 && (
                        <div
                          style={{
                            fontSize: 11,
                            color: BRAND.slate500,
                            marginTop: 4,
                          }}
                        >
                          e.g.{" "}
                          {row.sampleCeSlugs.slice(0, 3).map((s, j) => (
                            <span key={s}>
                              {j > 0 && ", "}
                              <Link
                                href={`/ce/${s}`}
                                style={{
                                  color: BRAND.purps,
                                  textDecoration: "none",
                                  fontWeight: 700,
                                }}
                              >
                                {s}
                              </Link>
                            </span>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td mono>{row.subcategoryId}</Td>
                    <Td mono>{row.chartType}</Td>
                    <Td align="right">{row.chartCount}</Td>
                    <Td align="right">{row.openFeedbackCount}</Td>
                    <Td align="right">{row.editCount}</Td>
                    <Td align="right">
                      <span
                        style={{
                          background:
                            row.troubleScore >= 2
                              ? BRAND.candySoft
                              : row.troubleScore >= 1
                                ? "#FEF3C7"
                                : BRAND.purpsSoft,
                          color:
                            row.troubleScore >= 2
                              ? BRAND.candy
                              : row.troubleScore >= 1
                                ? "#92400E"
                                : BRAND.purps,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {row.troubleScore.toFixed(2)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      style={{
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children: React.ReactNode;
  align?: "right";
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "12px 14px",
        fontSize: 13,
        fontWeight: 600,
        color: BRAND.slate700,
        textAlign: align ?? "left",
        fontFamily: mono ? "ui-monospace, monospace" : undefined,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
