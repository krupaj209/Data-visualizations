#!/usr/bin/env node
/**
 * Integration test for /api/question-bank override CRUD + bulk apply.
 *
 * Walks the full editor workflow:
 *   1. Fetch the merged view (global)                              → only `code` sources
 *   2. Create a category override on "museums" (edit timing/weekly_pattern)
 *      and re-fetch with ?subcategoryId=museums                    → swap to category_override
 *   3. Mute a candidate at CE scope (uffizi · duration / time_split)
 *      and re-fetch with ?ceSlug=galleria-degli-uffizi             → muted=true, source=ce_override
 *   4. PATCH the category override → notes / template updated, freshly merged view returned
 *   5. Bulk apply across category 1 (Tickets) — every museum / landmark / etc.
 *      gets the same override row, count matches subcategory count
 *   6. Bulk delete the same tuple                                  → rows removed
 *   7. DELETE the original category override                       → fall back to code default
 *
 * Pre-reqs:
 *   - API server running on $API_BASE (defaults to http://localhost:80)
 *   - DB schema pushed (lib/db; see `pnpm --filter @workspace/db run push`)
 *   - The curated `galleria-degli-uffizi` CE is seeded on api-server startup,
 *     so no extra fixtures are needed.
 *
 * Run from repo root:
 *   pnpm --filter @workspace/scripts run test-overrides-api
 */

const BASE = process.env.API_BASE || "http://localhost:80";
const URL = `${BASE}/api/question-bank`;

const HEADERS = { "content-type": "application/json" };
const CE_SLUG = "galleria-degli-uffizi";
const CREATED_BY = "test-overrides-api";

let pass = 0;
let fail = 0;
const failures = [];

function ok(label) {
  pass++;
  console.log(`  PASS  ${label}`);
}
function bad(label, detail) {
  fail++;
  failures.push(`${label}\n        ${detail}`);
  console.log(`  FAIL  ${label}\n        ${detail}`);
}
function assert(cond, label, detail = "") {
  if (cond) ok(label);
  else bad(label, detail || "assertion failed");
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json */
  }
  return { status: res.status, json, text };
}

function findCandidate(view, bundleId, archetype) {
  const bundle = view.mergedBundles.find((b) => b.bundleId === bundleId);
  if (!bundle) return null;
  return bundle.candidates.find((c) => c.archetype === archetype) ?? null;
}

const createdIds = { category: [], ce: [] };

async function cleanup() {
  for (const id of createdIds.category) {
    await request("DELETE", `/api/question-bank/category-overrides/${id}`).catch(
      () => {},
    );
  }
  for (const id of createdIds.ce) {
    await request("DELETE", `/api/question-bank/ce-overrides/${id}`).catch(
      () => {},
    );
  }
}

async function main() {
  console.log(`Question-bank overrides API integration test → ${URL}`);

  // 0) sanity ping
  const ping = await request("GET", "/api/healthz");
  if (ping.status !== 200) {
    bad("api server reachable", `GET /api/healthz → ${ping.status}`);
    console.log(`\nAborting: api server must be running at ${BASE}`);
    process.exit(1);
  }
  ok("api server reachable");

  // 1) global view
  {
    const r = await request("GET", "/api/question-bank");
    assert(r.status === 200, "GET /question-bank (global) → 200", `got ${r.status}`);
    const view = r.json;
    assert(view?.scope?.kind === "global", "scope.kind=global");
    assert(
      Array.isArray(view?.mergedBundles) && view.mergedBundles.length > 0,
      "mergedBundles populated",
    );
    assert(
      view.mergedBundles.every((b) =>
        b.candidates.every((c) => c.source === "code" && c.muted === false),
      ),
      "every candidate has source=code, muted=false (no overrides)",
    );
    assert(
      view.categoryOverrides.length === 0 && view.ceOverrides.length === 0,
      "category/ce override arrays empty for global scope",
    );
  }

  // 2) create a category override on museums / timing.weekly_pattern → edit
  let categoryRow;
  {
    const r = await request("POST", "/api/question-bank/category-overrides", {
      subcategoryId: "museums",
      bundleId: "timing",
      archetype: "weekly_pattern",
      action: "edit",
      questionTemplate: "When is {{ceName}} least crowded by day-of-week?",
      notes: "test override",
      createdBy: CREATED_BY,
    });
    assert(r.status === 201, "POST category-override (edit) → 201", `got ${r.status}: ${r.text}`);
    categoryRow = r.json?.categoryOverride;
    assert(categoryRow?.id > 0, "returned categoryOverride has id");
    if (categoryRow?.id) createdIds.category.push(categoryRow.id);
    const view = r.json?.view;
    assert(view?.scope?.kind === "subcategory", "mutation view scope=subcategory");
    assert(view?.scope?.subcategoryId === "museums", "scope.subcategoryId=museums");
    const cand = findCandidate(view, "timing", "weekly_pattern");
    assert(
      cand && cand.source === "category_override" && cand.overrideId === categoryRow.id,
      "weekly_pattern now source=category_override with matching overrideId",
      JSON.stringify(cand),
    );
    assert(
      cand?.questionTemplate?.includes("least crowded by day-of-week"),
      "weekly_pattern question_template was overridden",
    );
  }

  // 3) GET filtered view picks up the same override
  {
    const r = await request(
      "GET",
      "/api/question-bank?subcategoryId=museums",
    );
    assert(r.status === 200, "GET /question-bank?subcategoryId=museums → 200");
    const cand = findCandidate(r.json, "timing", "weekly_pattern");
    assert(
      cand?.source === "category_override",
      "filtered GET reflects category override",
    );
    assert(
      r.json.categoryOverrides.some((o) => o.id === categoryRow.id),
      "categoryOverrides[] contains the new row",
    );
  }

  // 4) CE override: mute a candidate on uffizi
  let ceRow;
  {
    const r = await request("POST", "/api/question-bank/ce-overrides", {
      ceSlug: CE_SLUG,
      bundleId: "duration",
      archetype: "time_split",
      action: "mute",
      createdBy: CREATED_BY,
    });
    assert(
      r.status === 201,
      "POST ce-override (mute time_split) → 201",
      `got ${r.status}: ${r.text}`,
    );
    ceRow = r.json?.ceOverride;
    assert(ceRow?.id > 0, "returned ceOverride has id");
    if (ceRow?.id) createdIds.ce.push(ceRow.id);
  }

  // 5) GET ?ceSlug= shows muted candidate AND inherited subcategory override
  {
    const r = await request("GET", `/api/question-bank?ceSlug=${CE_SLUG}`);
    assert(r.status === 200, "GET /question-bank?ceSlug=uffizi → 200");
    assert(
      r.json?.scope?.resolvedSubcategoryId === "museums",
      `scope.resolvedSubcategoryId=museums (got ${r.json?.scope?.resolvedSubcategoryId})`,
    );
    const muted = findCandidate(r.json, "duration", "time_split");
    assert(
      muted?.muted === true && muted.source === "ce_override",
      "time_split candidate is muted with source=ce_override",
      JSON.stringify(muted),
    );
    const inherited = findCandidate(r.json, "timing", "weekly_pattern");
    assert(
      inherited?.source === "category_override",
      "weekly_pattern still inherits museums category override at ce scope",
    );
  }

  // 6) PATCH the category override
  {
    const r = await request(
      "PATCH",
      `/api/question-bank/category-overrides/${categoryRow.id}`,
      {
        questionTemplate: "What weekday is quietest at {{ceName}}?",
        notes: "patched",
      },
    );
    assert(r.status === 200, "PATCH category-override → 200", r.text);
    const cand = findCandidate(r.json?.view, "timing", "weekly_pattern");
    assert(
      cand?.questionTemplate === "What weekday is quietest at {{ceName}}?",
      "patched question_template surfaces in merged view",
    );
    assert(
      r.json?.categoryOverride?.notes === "patched",
      "returned row has updated notes",
    );
  }

  // 7) Bulk apply across category 1 (Tickets)
  let bulkResult;
  {
    const r = await request(
      "POST",
      "/api/question-bank/category-overrides:bulk",
      {
        categoryId: 1,
        bundleId: "logistics",
        archetype: "entrance_map",
        action: "edit",
        questionTemplate: "Which entrance is fastest at {{ceName}}?",
        notes: "bulk-test",
        createdBy: CREATED_BY,
      },
    );
    assert(r.status === 200, "POST bulk apply → 200", r.text);
    bulkResult = r.json;
    assert(
      bulkResult?.categoryId === 1,
      `bulk.categoryId=1 (got ${bulkResult?.categoryId})`,
    );
    assert(
      bulkResult?.upserted > 0,
      `bulk.upserted > 0 (got ${bulkResult?.upserted})`,
    );
    assert(
      Array.isArray(bulkResult?.affectedSubcategoryIds) &&
        bulkResult.affectedSubcategoryIds.length === bulkResult.upserted,
      `bulk affected ${bulkResult?.upserted} subcategories (got ${bulkResult?.affectedSubcategoryIds?.length})`,
    );
    // remember any new ids that aren't our pre-existing categoryRow
    const newIds = (bulkResult.overrides || [])
      .filter((o) => o.bundleId === "logistics" && o.archetype === "entrance_map")
      .map((o) => o.id);
    for (const id of newIds) {
      if (!createdIds.category.includes(id)) createdIds.category.push(id);
    }
  }

  // 8) Bulk apply is idempotent — second call upserts the same rows, no errors
  {
    const r = await request(
      "POST",
      "/api/question-bank/category-overrides:bulk",
      {
        categoryId: 1,
        bundleId: "logistics",
        archetype: "entrance_map",
        action: "edit",
        questionTemplate: "Which entrance is fastest at {{ceName}}? (v2)",
        createdBy: CREATED_BY,
      },
    );
    assert(r.status === 200, "POST bulk apply (idempotent) → 200", r.text);
    assert(
      r.json?.upserted === bulkResult.upserted,
      `idempotent upsert count matches (${r.json?.upserted} vs ${bulkResult.upserted})`,
    );
  }

  // 9) Bulk delete the tuple
  {
    const r = await request(
      "DELETE",
      "/api/question-bank/category-overrides:bulk",
      {
        categoryId: 1,
        bundleId: "logistics",
        archetype: "entrance_map",
        action: "edit",
      },
    );
    assert(r.status === 200, "DELETE bulk → 200", r.text);
    assert(
      r.json?.deleted >= bulkResult.upserted,
      `bulk delete removed ≥ ${bulkResult.upserted} rows (got ${r.json?.deleted})`,
    );
    // these are already gone from DB; drop them from cleanup list
    createdIds.category = createdIds.category.filter(
      (id) =>
        !(bulkResult.overrides || []).some(
          (o) =>
            o.id === id &&
            o.bundleId === "logistics" &&
            o.archetype === "entrance_map",
        ),
    );
  }

  // 10) DELETE the original category override → fall back to code default
  {
    const r = await request(
      "DELETE",
      `/api/question-bank/category-overrides/${categoryRow.id}`,
    );
    assert(r.status === 200, "DELETE category-override → 200", r.text);
    createdIds.category = createdIds.category.filter((id) => id !== categoryRow.id);
    const cand = findCandidate(r.json?.view, "timing", "weekly_pattern");
    assert(
      cand?.source === "code",
      "weekly_pattern reverts to code default after revert",
      JSON.stringify(cand),
    );
  }

  // 11) DELETE the ce override
  {
    const r = await request(
      "DELETE",
      `/api/question-bank/ce-overrides/${ceRow.id}`,
    );
    assert(r.status === 200, "DELETE ce-override → 200", r.text);
    createdIds.ce = createdIds.ce.filter((id) => id !== ceRow.id);
    const cand = findCandidate(r.json?.view, "duration", "time_split");
    assert(
      cand?.muted === false && cand.source === "code",
      "time_split unmuted after ce-override revert",
      JSON.stringify(cand),
    );
  }

  // 11b) CE-over-category shadowing: same bundle/archetype overridden at both
  // scopes — CE should win in CE scope, but the category override remains the
  // effective candidate in the bare subcategory scope.
  {
    const cat = await request("POST", "/api/question-bank/category-overrides", {
      subcategoryId: "museums",
      bundleId: "timing",
      archetype: "weekly_pattern",
      action: "edit",
      questionTemplate: "CAT: best weekday at {{ceName}}?",
      createdBy: CREATED_BY,
    });
    assert(cat.status === 201, "shadow POST category-override → 201", cat.text);
    const shadowCategoryId = cat.json?.categoryOverride?.id;
    if (shadowCategoryId) createdIds.category.push(shadowCategoryId);

    const ce = await request("POST", "/api/question-bank/ce-overrides", {
      ceSlug: CE_SLUG,
      bundleId: "timing",
      archetype: "weekly_pattern",
      action: "edit",
      questionTemplate: "CE: best weekday at {{ceName}}?",
      createdBy: CREATED_BY,
    });
    assert(ce.status === 201, "shadow POST ce-override → 201", ce.text);
    const shadowCeId = ce.json?.ceOverride?.id;
    if (shadowCeId) createdIds.ce.push(shadowCeId);

    const ceView = await request(
      "GET",
      `/api/question-bank?ceSlug=${encodeURIComponent(CE_SLUG)}`,
    );
    const candCe = findCandidate(ceView.json, "timing", "weekly_pattern");
    assert(
      candCe?.source === "ce_override" && candCe?.overrideId === shadowCeId,
      `CE override shadows category in CE scope (source=${candCe?.source} id=${candCe?.overrideId})`,
    );

    const subView = await request(
      "GET",
      "/api/question-bank?subcategoryId=museums",
    );
    const candSub = findCandidate(subView.json, "timing", "weekly_pattern");
    assert(
      candSub?.source === "category_override" &&
        candSub?.overrideId === shadowCategoryId,
      `category override visible in subcategory scope (source=${candSub?.source} id=${candSub?.overrideId})`,
    );
  }

  // 12) validation: unknown bundleId / archetype / subcategoryId rejected
  {
    const r1 = await request("POST", "/api/question-bank/category-overrides", {
      subcategoryId: "museums",
      bundleId: "no_such_bundle",
      archetype: "weekly_pattern",
      action: "mute",
    });
    assert(r1.status === 400, "POST unknown bundleId → 400");

    const r2 = await request("POST", "/api/question-bank/category-overrides", {
      subcategoryId: "museums",
      bundleId: "timing",
      archetype: "no_such_archetype",
      action: "mute",
    });
    assert(r2.status === 400, "POST unknown archetype → 400");

    const r3 = await request("POST", "/api/question-bank/ce-overrides", {
      ceSlug: "no-such-ce",
      bundleId: "timing",
      archetype: "weekly_pattern",
      action: "mute",
    });
    assert(r3.status === 400, "POST unknown ceSlug → 400");

    const r4 = await request("POST", "/api/question-bank/category-overrides", {
      subcategoryId: "museums",
      bundleId: "timing",
      archetype: "weekly_pattern",
      action: "edit",
      // missing questionTemplate
    });
    assert(r4.status === 400, "POST edit without questionTemplate → 400");
  }
}

let exitCode = 0;
try {
  await main();
} catch (err) {
  console.error("unexpected error:", err);
  exitCode = 1;
} finally {
  await cleanup();
}

console.log(`\nResults: ${pass} passed · ${fail} failed`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
  exitCode = 1;
}
process.exit(exitCode);
