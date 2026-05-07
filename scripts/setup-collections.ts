/**
 * Setup Directus collections for Expiry Alert v2.
 *
 * Creates:
 *   - ea_suppliers
 *   - ea_reagent_catalog
 *   - ea_destruction_log
 *   - ea_duplication_log
 *   - New fields on existing `reagents` collection
 *
 * Idempotent: skips resources that already exist (handles 409 / field-check).
 *
 * Usage:
 *   DIRECTUS_URL=http://localhost:8055 \
 *   DIRECTUS_STATIC_TOKEN=<token> \
 *   npx tsx scripts/setup-collections.ts
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL?.replace(/\/+$/, "");
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

if (!DIRECTUS_URL || !DIRECTUS_STATIC_TOKEN) {
  console.error(
    "ERROR: DIRECTUS_URL and DIRECTUS_STATIC_TOKEN env vars are required.",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${DIRECTUS_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function collectionExists(collection: string): Promise<boolean> {
  const res = await apiRequest("GET", `/collections/${collection}`);
  if (!res.ok) return false;
  // Verify it has an actual DB table (schema is not null).
  // A collection with schema: null is virtual (metadata only) — treat as non-existent.
  const data = res.data as { data?: { schema?: unknown } };
  return data?.data?.schema != null;
}

async function fieldExists(
  collection: string,
  field: string,
): Promise<boolean> {
  const res = await apiRequest(
    "GET",
    `/fields/${collection}/${field}`,
  );
  return res.ok;
}

// ---------------------------------------------------------------------------
// Collection creation
// ---------------------------------------------------------------------------

interface FieldDef {
  field: string;
  type: string;
  schema?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

interface CollectionDef {
  collection: string;
  meta: Record<string, unknown>;
  fields: FieldDef[];
}

async function createCollection(def: CollectionDef): Promise<void> {
  const name = def.collection;
  if (await collectionExists(name)) {
    console.log(`  [SKIP] Collection "${name}" already exists.`);
    return;
  }

  const res = await apiRequest("POST", "/collections", {
    collection: def.collection,
    schema: {},          // Required: empty object tells Directus to create an actual DB table
    meta: def.meta,
    fields: def.fields,
  });

  if (res.ok) {
    console.log(`  [OK]   Collection "${name}" created.`);
  } else if (res.status === 409) {
    console.log(`  [SKIP] Collection "${name}" already exists (409).`);
  } else {
    console.error(
      `  [ERR]  Failed to create "${name}" (${res.status}):`,
      JSON.stringify(res.data, null, 2),
    );
  }
}

async function addFieldToCollection(
  collection: string,
  fieldDef: FieldDef,
): Promise<void> {
  const fname = fieldDef.field;
  if (await fieldExists(collection, fname)) {
    console.log(`  [SKIP] Field "${collection}.${fname}" already exists.`);
    return;
  }

  const res = await apiRequest(
    "POST",
    `/fields/${collection}`,
    fieldDef,
  );

  if (res.ok) {
    console.log(`  [OK]   Field "${collection}.${fname}" created.`);
  } else if (res.status === 409) {
    console.log(
      `  [SKIP] Field "${collection}.${fname}" already exists (409).`,
    );
  } else {
    console.error(
      `  [ERR]  Failed to create field "${collection}.${fname}" (${res.status}):`,
      JSON.stringify(res.data, null, 2),
    );
  }
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const eaSuppliersFields: FieldDef[] = [
  {
    field: "id",
    type: "integer",
    schema: { is_primary_key: true, has_auto_increment: true },
    meta: { hidden: true, readonly: true },
  },
  {
    field: "team",
    type: "integer",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true, note: "FK to teams" },
  },
  {
    field: "name",
    type: "string",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true },
  },
  {
    field: "short_code",
    type: "string",
    schema: { max_length: 10, is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "is_active",
    type: "boolean",
    schema: { default_value: true },
    meta: { interface: "boolean", width: "half" },
  },
  {
    field: "date_created",
    type: "timestamp",
    schema: { is_nullable: true },
    meta: { special: ["date-created"], interface: "datetime", readonly: true, hidden: true },
  },
];

const eaReagentCatalogFields: FieldDef[] = [
  {
    field: "id",
    type: "integer",
    schema: { is_primary_key: true, has_auto_increment: true },
    meta: { hidden: true, readonly: true },
  },
  {
    field: "team",
    type: "integer",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true, note: "FK to teams" },
  },
  {
    field: "name",
    type: "string",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true },
  },
  {
    field: "catalog_number",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "supplier_id",
    type: "integer",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true, note: "FK to ea_suppliers" },
  },
  {
    field: "is_active",
    type: "boolean",
    schema: { default_value: true },
    meta: { interface: "boolean", width: "half" },
  },
  {
    field: "date_created",
    type: "timestamp",
    schema: { is_nullable: true },
    meta: { special: ["date-created"], interface: "datetime", readonly: true, hidden: true },
  },
];

const eaDestructionLogFields: FieldDef[] = [
  {
    field: "id",
    type: "integer",
    schema: { is_primary_key: true, has_auto_increment: true },
    meta: { hidden: true, readonly: true },
  },
  {
    field: "team",
    type: "integer",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true },
  },
  {
    field: "reagent_name",
    type: "string",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true },
  },
  {
    field: "supplier_name",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "lot_number",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "expiry_date",
    type: "date",
    schema: { is_nullable: true },
    meta: { interface: "datetime" },
  },
  {
    field: "quantity_original",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "quantity_destroyed",
    type: "integer",
    schema: { default_value: 0, is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "destroyed_by",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "destroyed_by_name",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "destruction_date",
    type: "timestamp",
    schema: { is_nullable: true },
    meta: { special: ["date-created"], interface: "datetime", readonly: true },
  },
  {
    field: "notes",
    type: "text",
    schema: { is_nullable: true },
    meta: { interface: "input-multiline" },
  },
];

const eaDuplicationLogFields: FieldDef[] = [
  {
    field: "id",
    type: "integer",
    schema: { is_primary_key: true, has_auto_increment: true },
    meta: { hidden: true, readonly: true },
  },
  {
    field: "team",
    type: "integer",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true },
  },
  {
    field: "original_reagent_id",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "new_reagent_id",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "reagent_name",
    type: "string",
    schema: { is_nullable: false },
    meta: { interface: "input", required: true },
  },
  {
    field: "supplier_name",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "lot_number",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "expiry_date",
    type: "date",
    schema: { is_nullable: true },
    meta: { interface: "datetime" },
  },
  {
    field: "quantity",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "received_by",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "received_by_name",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "received_date",
    type: "timestamp",
    schema: { is_nullable: true },
    meta: { special: ["date-created"], interface: "datetime", readonly: true },
  },
];

// Fields to add to existing `reagents` collection
const reagentsNewFields: FieldDef[] = [
  {
    field: "supplier_id",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input", note: "FK to ea_suppliers" },
  },
  {
    field: "supplier_name",
    type: "string",
    schema: { is_nullable: true },
    meta: { interface: "input" },
  },
  {
    field: "catalog_reagent_id",
    type: "integer",
    schema: { is_nullable: true },
    meta: { interface: "input", note: "FK to ea_reagent_catalog" },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Expiry Alert v2 — Directus Collection Setup ===\n");
  console.log(`Target: ${DIRECTUS_URL}\n`);

  // 1. ea_suppliers
  console.log("[1/5] ea_suppliers");
  await createCollection({
    collection: "ea_suppliers",
    meta: {
      icon: "local_shipping",
      note: "Reagent suppliers per team",
      singleton: false,
    },
    fields: eaSuppliersFields,
  });

  // 2. ea_reagent_catalog
  console.log("\n[2/5] ea_reagent_catalog");
  await createCollection({
    collection: "ea_reagent_catalog",
    meta: {
      icon: "science",
      note: "Reagent catalog (templates) per team",
      singleton: false,
    },
    fields: eaReagentCatalogFields,
  });

  // 3. ea_destruction_log
  console.log("\n[3/5] ea_destruction_log");
  await createCollection({
    collection: "ea_destruction_log",
    meta: {
      icon: "delete_forever",
      note: "Log of destroyed/disposed reagents",
      singleton: false,
    },
    fields: eaDestructionLogFields,
  });

  // 4. ea_duplication_log
  console.log("\n[4/5] ea_duplication_log");
  await createCollection({
    collection: "ea_duplication_log",
    meta: {
      icon: "content_copy",
      note: "Log of duplicated/received reagent shipments",
      singleton: false,
    },
    fields: eaDuplicationLogFields,
  });

  // 5. Add fields to existing `reagents` collection
  console.log("\n[5/5] Add new fields to reagents");
  for (const fieldDef of reagentsNewFields) {
    await addFieldToCollection("reagents", fieldDef);
  }

  console.log("\n=== Setup complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
