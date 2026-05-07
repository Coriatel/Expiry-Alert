# Expiry Alert v2 — Multi-Site + Inventory Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-hospital support (Beilinson/HaSharon), supplier/reagent catalog, destruction workflow, enhanced duplication, history pages, and sidebar navigation to Expiry Alert.

**Architecture:** Per-team supplier/reagent catalogs stored in new Directus collections. API layer extended with CRUD for catalogs + log endpoints. Frontend gets sidebar navigation, team toggle, and 2 new history pages. Existing team/auth system reused as-is.

**Tech Stack:** React 18, Express.js, Directus SDK (@directus/sdk), Zustand, i18next, Tailwind CSS, lucide-react icons, Zod validation.

**Spec:** `docs/superpowers/specs/2026-03-31-multi-site-upgrade-requirements.md`

---

## Phases Overview

| Phase | What | Depends On |
|-------|------|------------|
| 1 | Data model: new Directus collections + field additions | — |
| 2 | Backend API: catalog CRUD, destruction, duplication log, import | Phase 1 |
| 3 | Sidebar navigation + team quick-toggle | — (UI only) |
| 4 | Catalog UI: supplier/reagent selection in add/edit forms | Phase 2 + 3 |
| 5 | Destruction workflow + Batch History page | Phase 2 + 3 |
| 6 | Enhanced duplication ("משלוח חדש") + Duplication History page | Phase 2 + 3 |
| 7 | Import between teams + alerts with team name | Phase 2 + 3 |

**Phases 3-7 can be parallelized** (each is a subagent-sized chunk). Phase 1+2 must run first.

---

## Phase 1: Data Model (Directus Collections)

### Task 1.1: Create Directus collections via API script

**Files:**
- Create: `scripts/setup-collections.ts`

This script runs against the Directus API to create the 4 new collections and add fields to the existing `reagents` collection.

- [ ] **Step 1: Write the collection setup script**

```typescript
// scripts/setup-collections.ts
// Run: npx tsx scripts/setup-collections.ts
// Requires: DIRECTUS_URL and DIRECTUS_STATIC_TOKEN env vars

import { createDirectus, rest, staticToken } from "@directus/sdk";

const url = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const token = process.env.DIRECTUS_STATIC_TOKEN ?? "";
const client = createDirectus(url).with(rest()).with(staticToken(token));

async function createCollection(collection: string, fields: any[]) {
  const res = await fetch(`${url}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ collection, meta: { icon: "box" }, fields }),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(`Failed to create ${collection}: ${res.status} ${text}`);
  }
  console.log(`Collection ${collection}: ${res.status === 409 ? "exists" : "created"}`);
}

async function addField(collection: string, field: any) {
  const res = await fetch(`${url}/fields/${collection}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(field),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    console.warn(`Field ${field.field} on ${collection}: ${res.status} ${text}`);
  } else {
    console.log(`Field ${collection}.${field.field}: ${res.status === 409 ? "exists" : "added"}`);
  }
}

async function main() {
  // 1. ea_suppliers
  await createCollection("ea_suppliers", [
    { field: "id", type: "integer", meta: { hidden: true, interface: "input", readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
    { field: "team", type: "integer", meta: { interface: "select-dropdown-m2o" }, schema: { is_nullable: false } },
    { field: "name", type: "string", meta: { interface: "input" }, schema: { is_nullable: false } },
    { field: "short_code", type: "string", meta: { interface: "input" }, schema: { max_length: 10 } },
    { field: "is_active", type: "boolean", meta: { interface: "boolean" }, schema: { default_value: true } },
    { field: "date_created", type: "timestamp", meta: { interface: "datetime", readonly: true, special: ["date-created"] } },
  ]);

  // 2. ea_reagent_catalog
  await createCollection("ea_reagent_catalog", [
    { field: "id", type: "integer", meta: { hidden: true, interface: "input", readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
    { field: "team", type: "integer", meta: { interface: "select-dropdown-m2o" }, schema: { is_nullable: false } },
    { field: "name", type: "string", meta: { interface: "input" }, schema: { is_nullable: false } },
    { field: "catalog_number", type: "string", meta: { interface: "input" } },
    { field: "supplier_id", type: "integer", meta: { interface: "select-dropdown-m2o" }, schema: { is_nullable: false } },
    { field: "is_active", type: "boolean", meta: { interface: "boolean" }, schema: { default_value: true } },
    { field: "date_created", type: "timestamp", meta: { interface: "datetime", readonly: true, special: ["date-created"] } },
  ]);

  // 3. ea_destruction_log
  await createCollection("ea_destruction_log", [
    { field: "id", type: "integer", meta: { hidden: true, interface: "input", readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
    { field: "team", type: "integer", schema: { is_nullable: false } },
    { field: "reagent_name", type: "string", schema: { is_nullable: false } },
    { field: "supplier_name", type: "string" },
    { field: "lot_number", type: "string" },
    { field: "expiry_date", type: "date" },
    { field: "quantity_original", type: "integer" },
    { field: "quantity_destroyed", type: "integer", schema: { default_value: 0 } },
    { field: "destroyed_by", type: "integer" },
    { field: "destroyed_by_name", type: "string" },
    { field: "destruction_date", type: "timestamp", meta: { special: ["date-created"] } },
    { field: "notes", type: "text" },
  ]);

  // 4. ea_duplication_log
  await createCollection("ea_duplication_log", [
    { field: "id", type: "integer", meta: { hidden: true, interface: "input", readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
    { field: "team", type: "integer", schema: { is_nullable: false } },
    { field: "original_reagent_id", type: "integer" },
    { field: "new_reagent_id", type: "integer" },
    { field: "reagent_name", type: "string", schema: { is_nullable: false } },
    { field: "supplier_name", type: "string" },
    { field: "lot_number", type: "string" },
    { field: "expiry_date", type: "date" },
    { field: "quantity", type: "integer" },
    { field: "received_by", type: "integer" },
    { field: "received_by_name", type: "string" },
    { field: "received_date", type: "timestamp", meta: { special: ["date-created"] } },
  ]);

  // 5. Add new fields to existing reagents collection
  const reagentsCollection = "reagents";
  await addField(reagentsCollection, { field: "supplier_id", type: "integer", meta: { interface: "select-dropdown-m2o" } });
  await addField(reagentsCollection, { field: "supplier_name", type: "string", meta: { interface: "input" } });
  await addField(reagentsCollection, { field: "catalog_reagent_id", type: "integer", meta: { interface: "select-dropdown-m2o" } });

  console.log("\nAll collections and fields created successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script**

```bash
cd /root/expiry-alert
DIRECTUS_URL=http://localhost:8055 DIRECTUS_STATIC_TOKEN=$(grep DIRECTUS_STATIC_TOKEN apps/api/.env | cut -d= -f2) npx tsx scripts/setup-collections.ts
```

Expected: All collections created, fields added. Verify in Directus admin at `http://localhost:8055`.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-collections.ts
git commit -m "feat: add Directus collections for suppliers, catalog, destruction & duplication logs"
```

### Task 1.2: Seed supplier and reagent catalog data

**Files:**
- Create: `scripts/seed-catalog.ts`

- [ ] **Step 1: Write seed script**

```typescript
// scripts/seed-catalog.ts
// Seeds ea_suppliers and ea_reagent_catalog for a given team
// Usage: TEAM_ID=123 npx tsx scripts/seed-catalog.ts

import { createDirectus, rest, staticToken, createItems, readItems } from "@directus/sdk";

const url = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const token = process.env.DIRECTUS_STATIC_TOKEN ?? "";
const teamId = Number(process.env.TEAM_ID);
if (!Number.isFinite(teamId)) { console.error("Set TEAM_ID env var"); process.exit(1); }

const client = createDirectus(url).with(rest()).with(staticToken(token));

const SUPPLIERS = [
  { name: "ALMOG", short_code: "ALMO" },
  { name: "BIORAD", short_code: "BIOR" },
  { name: "DANIEL_BIOTECH", short_code: "DANI" },
  { name: "DYN", short_code: "DYN" },
  { name: "ELDAN", short_code: "ELDA" },
  { name: "MEDTECHNICA", short_code: "MEDT" },
  { name: "MEDIGAL", short_code: "MEDI" },
  { name: "OTHER", short_code: "OTHE" },
  { name: "RANIUM", short_code: "RANI" },
  { name: "SARTORIUS", short_code: "SART" },
  { name: "SIGMA_ALDRICH", short_code: "SIGM" },
  { name: "ZOTAL", short_code: "ZOTA" },
];

// Reagents mapped to supplier name
const REAGENTS: Record<string, { name: string; catalog_number?: string }[]> = {
  BIORAD: [
    { name: "Anti IgG", catalog_number: "1140003097" },
    { name: "Liss/Coombs", catalog_number: "1140003089" },
    { name: "ABO/D+Reverse Group", catalog_number: "1554010110" },
    { name: "ABD-Confirmation", catalog_number: "1554052602" },
    { name: "DC screening I", catalog_number: "1140003143" },
    { name: "DC screening II", catalog_number: "1140003135" },
    { name: "ID Anti-IgG1/IgG3", catalog_number: "1000182013" },
    { name: "Anti Fya Serum", catalog_number: "1000197100" },
    { name: "DIACELL I-II-III (3x10ML)", catalog_number: "1140003127" },
    { name: "DIACELL ABO (A1-B)", catalog_number: "1140003070" },
    { name: "DIAPANEL (11x4ML)", catalog_number: "1140003100" },
    { name: "DIAPANEL P (11x4ML)", catalog_number: "1140003119" },
    { name: "Diluent II for IH-1000", catalog_number: "1000072429" },
    { name: "Diluent II 500 ml", catalog_number: "1140003402" },
    { name: "DECON 90", catalog_number: "1554057124" },
    { name: "DTT 0.2M", catalog_number: "slcl4021" },
    { name: "EQAS SHIPMENT A", catalog_number: "1000201433" },
    { name: "EQAS SHIPMENT B", catalog_number: "1000201434" },
    { name: "EQAS SHIPMENT C", catalog_number: "1000201435" },
    { name: "IH-QC 1 (4x6ML)", catalog_number: "1000147018" },
    { name: "IH-QC 2 (4x6ML)", catalog_number: "1000147019" },
    { name: "PIPETTE RED, 1U", catalog_number: "1000192522" },
    { name: "PIPETTE BLACK, 1U", catalog_number: "1000192521" },
    { name: "TIPS", catalog_number: "1140003410" },
  ],
  ELDAN: [
    { name: "Anti-A", catalog_number: "1000006261" },
    { name: "Anti-B", catalog_number: "1000006262" },
    { name: "Anti-D", catalog_number: "1000006265" },
    { name: "Anti-IgG Green", catalog_number: "1000006260" },
    { name: "Anti-A1", catalog_number: "1140005464" },
    { name: "Anti-C", catalog_number: "1140005324" },
    { name: "Anti-c", catalog_number: "1140005340" },
    { name: "Anti-E", catalog_number: "1140005499" },
    { name: "Anti-e", catalog_number: "1140005359" },
    { name: "Anti-K", catalog_number: "1140005375" },
    { name: "Anti-k", catalog_number: "1140005600" },
    { name: "Anti-M", catalog_number: "1140005383" },
    { name: "Anti-N", catalog_number: "1140005391" },
    { name: "Anti-P1", catalog_number: "1140005367" },
    { name: "Anti-Fya", catalog_number: "1140005634" },
    { name: "Anti-Fyb", catalog_number: "1000161746" },
    { name: "Anti-Jkb", catalog_number: "1140005669" },
    { name: "Ficin", catalog_number: "1122016883" },
    { name: "Elu-kit II", catalog_number: "1140005677" },
    { name: "CORQC TEST SYSTEM", catalog_number: "1554068495" },
    { name: "CHECKCELLS", catalog_number: "1140005189" },
    { name: "PANOCELL 10", catalog_number: "1000025956" },
    { name: "PANOSCREEN I,II&III", catalog_number: "1140005200" },
    { name: "REFERENCELLS A1,B", catalog_number: "1000026149" },
    { name: "REFERENCELLS A2", catalog_number: "1000026060" },
  ],
  ALMOG: [
    { name: "Anti-s", catalog_number: "1000105940" },
    { name: "Anti-S", catalog_number: "1000105941" },
    { name: "Anti-Jka", catalog_number: "1000105939" },
  ],
  DANIEL_BIOTECH: [
    { name: "Anti-K Danyel", catalog_number: "1000044842" },
    { name: "Anti-Jkb Danyel", catalog_number: "1000044844" },
  ],
  DYN: [
    { name: "NaOH", catalog_number: "1000209019" },
  ],
};

async function main() {
  // Check if team already has suppliers
  const existing = await client.request(readItems("ea_suppliers" as any, {
    filter: { team: { _eq: teamId } },
    limit: 1,
  }));
  if ((existing as any[]).length > 0) {
    console.log(`Team ${teamId} already has suppliers. Skipping seed.`);
    return;
  }

  // Create suppliers
  const supplierMap = new Map<string, number>();
  for (const s of SUPPLIERS) {
    const result = await client.request(createItems("ea_suppliers" as any, {
      team: teamId,
      name: s.name,
      short_code: s.short_code,
      is_active: true,
    }));
    const record = Array.isArray(result) ? result[0] : result;
    supplierMap.set(s.name, (record as any).id);
    console.log(`Supplier: ${s.name} → id ${(record as any).id}`);
  }

  // Create reagents
  let count = 0;
  for (const [supplierName, reagents] of Object.entries(REAGENTS)) {
    const supplierId = supplierMap.get(supplierName);
    if (!supplierId) { console.warn(`Supplier ${supplierName} not found`); continue; }

    for (const r of reagents) {
      await client.request(createItems("ea_reagent_catalog" as any, {
        team: teamId,
        name: r.name,
        catalog_number: r.catalog_number ?? null,
        supplier_id: supplierId,
        is_active: true,
      }));
      count++;
    }
  }

  console.log(`\nSeeded ${SUPPLIERS.length} suppliers and ${count} reagents for team ${teamId}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run seed for both teams**

First, find the team IDs:
```bash
cd /root/expiry-alert
TOKEN=$(grep DIRECTUS_STATIC_TOKEN apps/api/.env | cut -d= -f2)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8055/items/teams | python3 -c "import sys,json; [print(f'{t[\"id\"]}: {t[\"name\"]}') for t in json.load(sys.stdin)['data']]"
```

Then seed each team:
```bash
DIRECTUS_URL=http://localhost:8055 DIRECTUS_STATIC_TOKEN=$TOKEN TEAM_ID=<beilinson_id> npx tsx scripts/seed-catalog.ts
DIRECTUS_URL=http://localhost:8055 DIRECTUS_STATIC_TOKEN=$TOKEN TEAM_ID=<hasharon_id> npx tsx scripts/seed-catalog.ts
```

Note: If HaSharon team doesn't exist yet, create it first via the Settings page or API.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-catalog.ts
git commit -m "feat: add seed script for supplier/reagent catalog data"
```

---

## Phase 2: Backend API Routes

### Task 2.1: Register new collections in config

**Files:**
- Modify: `apps/api/src/config.ts`
- Modify: `apps/api/src/services/directus.ts`

- [ ] **Step 1: Add collection names to config**

In `apps/api/src/config.ts`, add to `directus.collections`:

```typescript
      // After existing entries:
      suppliers: "ea_suppliers",
      reagentCatalog: "ea_reagent_catalog",
      destructionLog: "ea_destruction_log",
      duplicationLog: "ea_duplication_log",
```

- [ ] **Step 2: Add to Schema interface**

In `apps/api/src/services/directus.ts`, add to `Schema`:

```typescript
  ea_suppliers: any[];
  ea_reagent_catalog: any[];
  ea_destruction_log: any[];
  ea_duplication_log: any[];
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/config.ts apps/api/src/services/directus.ts
git commit -m "feat: register new collections in API config and Directus schema"
```

### Task 2.2: Supplier CRUD service + routes

**Files:**
- Create: `apps/api/src/services/suppliers.ts`
- Create: `apps/api/src/routes/suppliers.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create supplier service**

```typescript
// apps/api/src/services/suppliers.ts
import { config } from "../config.js";
import { createRecord, deleteRecord, listRecords, updateSingleRecord } from "./directus.js";

const collection = config.directus.collections.suppliers as any;

export type SupplierRecord = {
  id: number;
  team: number;
  name: string;
  short_code?: string | null;
  is_active: boolean;
  date_created?: string;
};

export async function listSuppliers(teamId: number): Promise<SupplierRecord[]> {
  return listRecords<SupplierRecord>(collection, {
    filter: { team: { _eq: teamId }, is_active: { _eq: true } },
    sort: ["name"],
    limit: 500,
  });
}

export async function createSupplier(teamId: number, data: { name: string; short_code?: string }): Promise<SupplierRecord> {
  return createRecord<SupplierRecord>(collection, {
    team: teamId,
    name: data.name,
    short_code: data.short_code ?? null,
    is_active: true,
  });
}

export async function deleteSupplier(supplierId: number): Promise<void> {
  // Soft-delete: mark inactive
  await updateSingleRecord(collection, supplierId, { is_active: false });
}

export async function hardDeleteSupplier(supplierId: number): Promise<void> {
  await deleteRecord(collection, supplierId);
}
```

- [ ] **Step 2: Create supplier routes**

```typescript
// apps/api/src/routes/suppliers.ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { listSuppliers, createSupplier, deleteSupplier } from "../services/suppliers.js";
import { listReagentCatalog, deactivateReagentsBySupplier } from "../services/reagentCatalog.js";

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  short_code: z.string().max(10).optional(),
});

// GET /api/suppliers — list team's suppliers
suppliersRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const suppliers = await listSuppliers(teamId);
  res.json({ suppliers });
});

// POST /api/suppliers — add supplier
suppliersRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const supplier = await createSupplier(teamId, parsed.data);
  res.status(201).json(supplier);
});

// DELETE /api/suppliers/:id — delete supplier + cascade reagents
suppliersRouter.delete("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  // Cascade: deactivate all reagents for this supplier in this team
  await deactivateReagentsBySupplier(teamId, id);
  await deleteSupplier(id);
  res.status(204).send();
});
```

- [ ] **Step 3: Register route in index.ts**

In `apps/api/src/index.ts`, add:
```typescript
import { suppliersRouter } from "./routes/suppliers.js";
// ...
app.use("/api/suppliers", suppliersRouter);
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/suppliers.ts apps/api/src/routes/suppliers.ts apps/api/src/index.ts
git commit -m "feat: add supplier CRUD API routes"
```

### Task 2.3: Reagent catalog CRUD service + routes

**Files:**
- Create: `apps/api/src/services/reagentCatalog.ts`
- Create: `apps/api/src/routes/reagentCatalog.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create reagent catalog service**

```typescript
// apps/api/src/services/reagentCatalog.ts
import { config } from "../config.js";
import { createRecord, listRecords, updateSingleRecord, updateRecords } from "./directus.js";

const collection = config.directus.collections.reagentCatalog as any;

export type ReagentCatalogRecord = {
  id: number;
  team: number;
  name: string;
  catalog_number?: string | null;
  supplier_id: number;
  is_active: boolean;
  date_created?: string;
};

export async function listReagentCatalog(teamId: number, supplierId?: number): Promise<ReagentCatalogRecord[]> {
  const filter: any = { team: { _eq: teamId }, is_active: { _eq: true } };
  if (supplierId) filter.supplier_id = { _eq: supplierId };
  return listRecords<ReagentCatalogRecord>(collection, {
    filter,
    sort: ["name"],
    limit: 1000,
  });
}

export async function createReagentCatalogEntry(teamId: number, data: {
  name: string;
  catalog_number?: string;
  supplier_id: number;
}): Promise<ReagentCatalogRecord> {
  return createRecord<ReagentCatalogRecord>(collection, {
    team: teamId,
    name: data.name,
    catalog_number: data.catalog_number ?? null,
    supplier_id: data.supplier_id,
    is_active: true,
  });
}

export async function deactivateReagentCatalogEntry(id: number): Promise<void> {
  await updateSingleRecord(collection, id, { is_active: false });
}

export async function deactivateReagentsBySupplier(teamId: number, supplierId: number): Promise<void> {
  const items = await listRecords<ReagentCatalogRecord>(collection, {
    filter: { team: { _eq: teamId }, supplier_id: { _eq: supplierId }, is_active: { _eq: true } },
    fields: ["id"],
    limit: 1000,
  });
  const ids = items.map((r) => r.id);
  if (ids.length > 0) {
    await updateRecords(collection, ids, { is_active: false });
  }
}
```

- [ ] **Step 2: Create reagent catalog routes**

```typescript
// apps/api/src/routes/reagentCatalog.ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { listReagentCatalog, createReagentCatalogEntry, deactivateReagentCatalogEntry } from "../services/reagentCatalog.js";

export const reagentCatalogRouter = Router();
reagentCatalogRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(200),
  catalog_number: z.string().max(50).optional(),
  supplier_id: z.number().int().positive(),
});

// GET /api/reagent-catalog?supplier_id=X
reagentCatalogRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : undefined;
  const items = await listReagentCatalog(teamId, supplierId);
  res.json({ items });
});

// POST /api/reagent-catalog
reagentCatalogRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const entry = await createReagentCatalogEntry(teamId, parsed.data);
  res.status(201).json(entry);
});

// DELETE /api/reagent-catalog/:id
reagentCatalogRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  await deactivateReagentCatalogEntry(id);
  res.status(204).send();
});
```

- [ ] **Step 3: Register in index.ts**

```typescript
import { reagentCatalogRouter } from "./routes/reagentCatalog.js";
// ...
app.use("/api/reagent-catalog", reagentCatalogRouter);
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/reagentCatalog.ts apps/api/src/routes/reagentCatalog.ts apps/api/src/index.ts
git commit -m "feat: add reagent catalog CRUD API routes"
```

### Task 2.4: Destruction log service + routes

**Files:**
- Create: `apps/api/src/services/destructionLog.ts`
- Create: `apps/api/src/routes/destructionLog.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create destruction log service**

```typescript
// apps/api/src/services/destructionLog.ts
import { config } from "../config.js";
import { createRecord, listRecords } from "./directus.js";

const collection = config.directus.collections.destructionLog as any;

export type DestructionLogRecord = {
  id: number;
  team: number;
  reagent_name: string;
  supplier_name?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  quantity_original?: number | null;
  quantity_destroyed: number;
  destroyed_by?: number | null;
  destroyed_by_name?: string | null;
  destruction_date: string;
  notes?: string | null;
};

export async function listDestructionLog(
  teamId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<DestructionLogRecord[]> {
  const filter: any = { team: { _eq: teamId } };
  if (dateFrom || dateTo) {
    filter.destruction_date = {};
    if (dateFrom) filter.destruction_date._gte = dateFrom;
    if (dateTo) filter.destruction_date._lte = dateTo;
  }
  return listRecords<DestructionLogRecord>(collection, {
    filter,
    sort: ["-destruction_date"],
    limit: 5000,
  });
}

export async function createDestructionEntry(data: Omit<DestructionLogRecord, "id">): Promise<DestructionLogRecord> {
  return createRecord<DestructionLogRecord>(collection, data);
}
```

- [ ] **Step 2: Create destruction log routes**

```typescript
// apps/api/src/routes/destructionLog.ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { listDestructionLog, createDestructionEntry } from "../services/destructionLog.js";
import { updateReagent } from "../services/reagents.js";

export const destructionLogRouter = Router();
destructionLogRouter.use(requireAuth);

const destroySchema = z.object({
  reagent_id: z.number().int().positive(),
  reagent_name: z.string(),
  supplier_name: z.string().optional(),
  lot_number: z.string().optional(),
  expiry_date: z.string().optional(),
  quantity_original: z.number().int().nonnegative().optional(),
  quantity_destroyed: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

// GET /api/destruction-log?from=YYYY-MM-DD&to=YYYY-MM-DD
destructionLogRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const dateFrom = req.query.from as string | undefined;
  const dateTo = req.query.to as string | undefined;
  const log = await listDestructionLog(teamId, dateFrom, dateTo);
  res.json({ log });
});

// POST /api/destruction-log — destroy reagent
destructionLogRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = destroySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const user = (req as any).user;
  const userName = user?.name || user?.email || "Unknown";

  // Create destruction log entry
  const entry = await createDestructionEntry({
    team: teamId,
    reagent_name: parsed.data.reagent_name,
    supplier_name: parsed.data.supplier_name ?? null,
    lot_number: parsed.data.lot_number ?? null,
    expiry_date: parsed.data.expiry_date ?? null,
    quantity_original: parsed.data.quantity_original ?? null,
    quantity_destroyed: parsed.data.quantity_destroyed,
    destroyed_by: user?.id ?? null,
    destroyed_by_name: userName,
    destruction_date: new Date().toISOString(),
    notes: parsed.data.notes ?? null,
  });

  // Archive the reagent (remove from active view)
  await updateReagent(parsed.data.reagent_id, { is_archived: true });

  res.status(201).json(entry);
});
```

- [ ] **Step 3: Register in index.ts**

```typescript
import { destructionLogRouter } from "./routes/destructionLog.js";
// ...
app.use("/api/destruction-log", destructionLogRouter);
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/destructionLog.ts apps/api/src/routes/destructionLog.ts apps/api/src/index.ts
git commit -m "feat: add destruction log API routes"
```

### Task 2.5: Duplication log service + routes

**Files:**
- Create: `apps/api/src/services/duplicationLog.ts`
- Create: `apps/api/src/routes/duplicationLog.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create duplication log service**

```typescript
// apps/api/src/services/duplicationLog.ts
import { config } from "../config.js";
import { createRecord, listRecords } from "./directus.js";

const collection = config.directus.collections.duplicationLog as any;

export type DuplicationLogRecord = {
  id: number;
  team: number;
  original_reagent_id?: number | null;
  new_reagent_id?: number | null;
  reagent_name: string;
  supplier_name?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  quantity?: number | null;
  received_by?: number | null;
  received_by_name?: string | null;
  received_date: string;
};

export async function listDuplicationLog(
  teamId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<DuplicationLogRecord[]> {
  const filter: any = { team: { _eq: teamId } };
  if (dateFrom || dateTo) {
    filter.received_date = {};
    if (dateFrom) filter.received_date._gte = dateFrom;
    if (dateTo) filter.received_date._lte = dateTo;
  }
  return listRecords<DuplicationLogRecord>(collection, {
    filter,
    sort: ["-received_date"],
    limit: 5000,
  });
}

export async function createDuplicationEntry(data: Omit<DuplicationLogRecord, "id">): Promise<DuplicationLogRecord> {
  return createRecord<DuplicationLogRecord>(collection, data);
}
```

- [ ] **Step 2: Create duplication log routes**

```typescript
// apps/api/src/routes/duplicationLog.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { listDuplicationLog } from "../services/duplicationLog.js";

export const duplicationLogRouter = Router();
duplicationLogRouter.use(requireAuth);

// GET /api/duplication-log?from=YYYY-MM-DD&to=YYYY-MM-DD
duplicationLogRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });
  const dateFrom = req.query.from as string | undefined;
  const dateTo = req.query.to as string | undefined;
  const log = await listDuplicationLog(teamId, dateFrom, dateTo);
  res.json({ log });
});
```

- [ ] **Step 3: Update existing duplicate route to also log**

In `apps/api/src/routes/reagents.ts`, modify the `POST /:id/duplicate` handler to also create a duplication log entry. Add import:

```typescript
import { createDuplicationEntry } from "../services/duplicationLog.js";
```

Inside the handler, after `const created = await duplicateReagent(...)`, add:

```typescript
  const user = (req as any).user;
  const userName = user?.name || user?.email || "Unknown";

  await createDuplicationEntry({
    team: teamId,
    original_reagent_id: originalId,
    new_reagent_id: created.id,
    reagent_name: parsed.data.name,
    supplier_name: (req.body as any).supplier_name ?? null,
    lot_number: parsed.data.lotNumber ?? null,
    expiry_date: parsed.data.expiryDate ?? null,
    quantity: (req.body as any).quantity ?? null,
    received_by: user?.id ?? null,
    received_by_name: userName,
    received_date: new Date().toISOString(),
  });
```

- [ ] **Step 4: Register in index.ts**

```typescript
import { duplicationLogRouter } from "./routes/duplicationLog.js";
// ...
app.use("/api/duplication-log", duplicationLogRouter);
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/duplicationLog.ts apps/api/src/routes/duplicationLog.ts apps/api/src/routes/reagents.ts apps/api/src/index.ts
git commit -m "feat: add duplication log API + log on duplicate"
```

### Task 2.6: Import reagents between teams

**Files:**
- Create: `apps/api/src/routes/import.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create import route**

```typescript
// apps/api/src/routes/import.ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { createReagent } from "../services/reagents.js";
import { findOne } from "../services/directus.js";
import { config } from "../config.js";

export const importRouter = Router();
importRouter.use(requireAuth);

const importSchema = z.object({
  targetTeamId: z.number().int().positive(),
  reagentIds: z.array(z.number().int().positive()).min(1).max(100),
});

// POST /api/import/reagents — copy reagents to another team
importRouter.post("/reagents", async (req, res) => {
  const sourceTeamId = getTeamId(req);
  if (!sourceTeamId) return res.status(400).json({ error: "Missing team" });

  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  if (parsed.data.targetTeamId === sourceTeamId) {
    return res.status(400).json({ error: "Cannot import to same team" });
  }

  const reagentCollection = config.directus.collections.reagents as any;
  const copied: number[] = [];

  for (const reagentId of parsed.data.reagentIds) {
    const original = await findOne<any>(reagentCollection, { id: { _eq: reagentId } });
    if (!original) continue;

    const created = await createReagent(parsed.data.targetTeamId, {
      name: original.name,
      category: original.category,
      expiry_date: original.expiry_date,
      lot_number: original.lot_number,
      received_date: original.received_date,
      notes: original.notes,
      is_archived: false,
      quantity: original.quantity,
      supplier_id: original.supplier_id,
      supplier_name: original.supplier_name,
      catalog_reagent_id: original.catalog_reagent_id,
    });
    copied.push(created.id);
  }

  res.status(201).json({ copied: copied.length, ids: copied });
});
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { importRouter } from "./routes/import.js";
// ...
app.use("/api/import", importRouter);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/import.ts apps/api/src/index.ts
git commit -m "feat: add import reagents between teams API"
```

### Task 2.7: Update API reagent routes with new fields

**Files:**
- Modify: `apps/api/src/routes/reagents.ts`
- Modify: `apps/api/src/services/reagents.ts`

- [ ] **Step 1: Accept supplier_id, supplier_name, quantity in create/update**

Update the `reagentSchema` in `apps/api/src/routes/reagents.ts`:
```typescript
const reagentSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["reagents", "beads"]),
  expiryDate: z.string().min(1),
  lotNumber: z.string().optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  supplier_id: z.number().int().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  quantity: z.number().int().optional().nullable(),
});
```

Update `ReagentRecord` type in `apps/api/src/services/reagents.ts`:
```typescript
  supplier_id?: number | null;
  supplier_name?: string | null;
  catalog_reagent_id?: number | null;
```

Pass new fields through in all create/update handlers.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/reagents.ts apps/api/src/services/reagents.ts
git commit -m "feat: accept supplier and quantity fields in reagent create/update"
```

---

## Phase 3: Sidebar Navigation + Team Toggle

### Task 3.1: Create Sidebar component

**Files:**
- Create: `apps/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Create the sidebar**

```tsx
// apps/web/src/components/Sidebar.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ScrollText,
  PackageCheck,
  MessageSquare,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  Menu,
  X,
} from "lucide-react";
import type { TeamSummary } from "@/lib/tauri";

export type SidebarPage =
  | "dashboard"
  | "batch-history"
  | "duplication-history"
  | "messages"
  | "settings";

interface SidebarProps {
  currentPage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  teams: TeamSummary[];
  currentTeamId: number | null;
  currentTeamName: string;
  onSwitchTeam: (teamId: number) => void;
  unreadMessageCount: number;
}

export function Sidebar({
  currentPage,
  onNavigate,
  teams,
  currentTeamId,
  currentTeamName,
  onSwitchTeam,
  unreadMessageCount,
}: SidebarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const navItems: { page: SidebarPage; icon: typeof LayoutDashboard; labelKey: string; badge?: number }[] = [
    { page: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
    { page: "batch-history", icon: ScrollText, labelKey: "nav.batchHistory" },
    { page: "duplication-history", icon: PackageCheck, labelKey: "nav.duplicationHistory" },
    { page: "messages", icon: MessageSquare, labelKey: "nav.messages", badge: unreadMessageCount },
    { page: "settings", icon: Settings, labelKey: "nav.settings" },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-e bg-card transition-all duration-200 ${
          expanded ? "w-64" : "w-16"
        }`}
      >
        {/* Team selector */}
        <div className="border-b p-2">
          <button
            onClick={() => {
              if (!expanded) setExpanded(true);
              else setTeamDropdownOpen(!teamDropdownOpen);
            }}
            className="w-full flex items-center gap-2 rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              {currentTeamName.charAt(0)}
            </div>
            {expanded && (
              <>
                <span className="font-semibold text-sm truncate flex-1 text-start">
                  {currentTeamName}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
          {expanded && teamDropdownOpen && (
            <div className="mt-1 bg-popover border rounded-lg shadow-md overflow-hidden">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    onSwitchTeam(team.id);
                    setTeamDropdownOpen(false);
                  }}
                  className={`w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    team.id === currentTeamId ? "bg-muted font-semibold" : ""
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ page, icon: Icon, labelKey, badge }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`w-full flex items-center gap-3 rounded-lg p-2 transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`}
              title={!expanded ? t(labelKey) : undefined}
            >
              <div className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {badge != null && badge > 0 && !expanded && (
                  <span className="absolute -top-1.5 -end-1.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-0.5">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              {expanded && (
                <>
                  <span className="text-sm truncate flex-1 text-start">{t(labelKey)}</span>
                  {badge != null && badge > 0 && (
                    <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold px-1">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Expand/collapse toggle */}
        <div className="border-t p-2">
          <button
            onClick={() => {
              setExpanded(!expanded);
              setTeamDropdownOpen(false);
            }}
            className="w-full flex items-center justify-center rounded-lg p-2 hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronRight className="h-4 w-4 rtl:rotate-180" /> : <ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar — replaced with hamburger in header (handled by App.tsx) */}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/Sidebar.tsx
git commit -m "feat: create Sidebar component with team toggle"
```

### Task 3.2: Add i18n keys for new navigation

**Files:**
- Modify: `apps/web/src/i18n/locales/he.json`
- Modify: `apps/web/src/i18n/locales/en.json`

- [ ] **Step 1: Add Hebrew translations**

Add to `nav` section in `he.json`:
```json
    "batchHistory": "היסטוריית אצוות",
    "duplicationHistory": "היסטוריית שכפולים"
```

Add new sections:
```json
  "batchHistory": {
    "title": "היסטוריית אצוות",
    "destructionDate": "תאריך השמדה",
    "reagentName": "שם ריאגנט",
    "supplier": "ספק",
    "lotNumber": "מספר אצווה",
    "expiryDate": "תאריך תפוגה",
    "quantityOriginal": "כמות מקורית",
    "quantityDestroyed": "כמות שהושמדה",
    "performedBy": "בוצע ע\"י",
    "destroyedOnly": "אצוות שהושמדו בלבד",
    "lastMonth": "חודש אחרון",
    "previousMonth": "חודש קודם",
    "last3Months": "3 חודשים",
    "lastHalfYear": "חצי שנה",
    "lastYear": "שנה אחרונה",
    "customRange": "טווח מותאם",
    "from": "מתאריך",
    "to": "עד תאריך",
    "noRecords": "אין רשומות"
  },
  "duplicationHistory": {
    "title": "היסטוריית שכפולים",
    "receivedDate": "תאריך קבלה",
    "reagentName": "שם ריאגנט",
    "supplier": "ספק",
    "lotNumber": "מספר אצווה",
    "expiryDate": "תאריך תפוגה",
    "quantity": "כמות",
    "performedBy": "בוצע ע\"י",
    "noRecords": "אין רשומות"
  },
  "destruction": {
    "title": "השמדה",
    "question": "המוצר פג תוקף. האם נשארו במלאי יחידות שיש להשמיד?",
    "unitsDestroyed": "כמות שהושמדה",
    "noneDestroyed": "לא הושמדו",
    "confirm": "אישור השמדה"
  },
  "newShipment": {
    "title": "משלוח חדש",
    "sameQuantity": "האם זו אותה כמות?",
    "lotNumber": "מספר אצווה",
    "expiryDate": "תאריך תפוגה",
    "quantity": "כמות"
  },
  "catalog": {
    "supplier": "ספק",
    "selectSupplier": "בחר ספק",
    "selectReagent": "בחר ריאגנט",
    "addSupplier": "הוסף ספק",
    "addReagent": "הוסף ריאגנט לקטלוג",
    "deleteSupplier": "מחק ספק",
    "deleteReagent": "מחק ריאגנט",
    "deleteSupplierConfirm": "מחיקת ספק תמחק גם את כל הריאגנטים שלו. להמשיך?",
    "manageCatalog": "ניהול קטלוג"
  },
  "import": {
    "title": "ייבוא לצוות אחר",
    "copyTo": "העתק ל-{{team}}",
    "confirmMessage": "להעתיק {{count}} ריאגנטים ל-{{team}}?",
    "success": "הועתקו {{count}} ריאגנטים בהצלחה"
  }
```

- [ ] **Step 2: Add English translations (same structure)**

Add equivalent keys in `en.json` with English text.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/i18n/locales/he.json apps/web/src/i18n/locales/en.json
git commit -m "feat: add i18n keys for sidebar, history, destruction, catalog"
```

### Task 3.3: Refactor App.tsx to use sidebar navigation

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Replace Page type and add sidebar**

Change the `Page` type from:
```typescript
type Page = "dashboard" | "archive" | "messages" | "settings";
```
to:
```typescript
type Page = "dashboard" | "batch-history" | "duplication-history" | "messages" | "settings";
```

- [ ] **Step 2: Import Sidebar and new pages**

Replace the Archive import with new page imports:
```typescript
import { Sidebar } from "@/components/Sidebar";
import type { SidebarPage } from "@/components/Sidebar";
import { BatchHistory } from "@/pages/BatchHistory";
import { DuplicationHistory } from "@/pages/DuplicationHistory";
```

- [ ] **Step 3: Add team state and team loading**

Add state for teams list:
```typescript
const [teams, setTeams] = useState<TeamSummary[]>([]);
const currentTeamName = teams.find((t) => t.id === user?.team_id)?.name ?? "";
```

Load teams on auth:
```typescript
useEffect(() => {
  if (!user?.team_id) return;
  getTeams().then((data) => setTeams(data.teams)).catch(console.error);
}, [user?.team_id]);
```

- [ ] **Step 4: Add team switch handler**

```typescript
const handleSwitchTeam = async (teamId: number) => {
  await switchTeam(teamId);
  window.localStorage.setItem("expiry-alert.preferredTeamId", String(teamId));
  await refresh();
};
```

- [ ] **Step 5: Replace header nav + bottom nav with Sidebar**

Replace the main layout structure. The authenticated view becomes:
```tsx
<div className="min-h-screen bg-background flex">
  <Sidebar
    currentPage={currentPage as SidebarPage}
    onNavigate={(page) => setCurrentPage(page)}
    teams={teams}
    currentTeamId={user?.team_id ?? null}
    currentTeamName={currentTeamName}
    onSwitchTeam={handleSwitchTeam}
    unreadMessageCount={unreadMessageCount}
  />
  <div className="flex-1 flex flex-col min-h-screen">
    {/* Simplified header — mobile only: hamburger + logo + user */}
    <header className="border-b bg-card sticky top-0 z-40 md:hidden">
      {/* Mobile header with hamburger for sidebar drawer */}
    </header>
    <main className="flex-1">
      {currentPage === "dashboard" ? (
        <Dashboard />
      ) : currentPage === "batch-history" ? (
        <BatchHistory />
      ) : currentPage === "duplication-history" ? (
        <DuplicationHistory />
      ) : currentPage === "messages" ? (
        <Messages currentUserId={user.id} isSystemAdmin={user.is_system_admin === true} />
      ) : (
        <Settings />
      )}
    </main>
  </div>
</div>
```

Remove the old bottom nav and the old desktop header nav buttons entirely.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "refactor: replace bottom tabs with sidebar navigation + team toggle"
```

---

## Phase 4: Catalog UI + Dashboard Enhancements

### Task 4.1: Add API client functions for new endpoints

**Files:**
- Modify: `apps/web/src/lib/tauri.ts`

- [ ] **Step 1: Add catalog, destruction, duplication, import functions**

Append to `tauri.ts`:

```typescript
// --- Suppliers ---
export type Supplier = { id: number; team: number; name: string; short_code?: string; is_active: boolean };

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await apiFetch<{ suppliers: Supplier[] }>("/api/suppliers");
  return res.suppliers ?? [];
}

export async function createSupplier(name: string, shortCode?: string): Promise<Supplier> {
  return apiFetch<Supplier>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify({ name, short_code: shortCode }),
  });
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiFetch(`/api/suppliers/${id}`, { method: "DELETE" });
}

// --- Reagent Catalog ---
export type ReagentCatalogItem = { id: number; team: number; name: string; catalog_number?: string; supplier_id: number; is_active: boolean };

export async function getReagentCatalog(supplierId?: number): Promise<ReagentCatalogItem[]> {
  const params = supplierId ? `?supplier_id=${supplierId}` : "";
  const res = await apiFetch<{ items: ReagentCatalogItem[] }>(`/api/reagent-catalog${params}`);
  return res.items ?? [];
}

export async function createReagentCatalogItem(name: string, supplierId: number, catalogNumber?: string): Promise<ReagentCatalogItem> {
  return apiFetch<ReagentCatalogItem>("/api/reagent-catalog", {
    method: "POST",
    body: JSON.stringify({ name, supplier_id: supplierId, catalog_number: catalogNumber }),
  });
}

export async function deleteReagentCatalogItem(id: number): Promise<void> {
  await apiFetch(`/api/reagent-catalog/${id}`, { method: "DELETE" });
}

// --- Destruction Log ---
export type DestructionLogEntry = {
  id: number; team: number; reagent_name: string; supplier_name?: string;
  lot_number?: string; expiry_date?: string; quantity_original?: number;
  quantity_destroyed: number; destroyed_by_name?: string; destruction_date: string;
};

export async function getDestructionLog(from?: string, to?: string): Promise<DestructionLogEntry[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch<{ log: DestructionLogEntry[] }>(`/api/destruction-log${qs}`);
  return res.log ?? [];
}

export async function destroyReagent(data: {
  reagent_id: number; reagent_name: string; supplier_name?: string;
  lot_number?: string; expiry_date?: string; quantity_original?: number;
  quantity_destroyed: number; notes?: string;
}): Promise<void> {
  await apiFetch("/api/destruction-log", { method: "POST", body: JSON.stringify(data) });
}

// --- Duplication Log ---
export type DuplicationLogEntry = {
  id: number; team: number; reagent_name: string; supplier_name?: string;
  lot_number?: string; expiry_date?: string; quantity?: number;
  received_by_name?: string; received_date: string;
};

export async function getDuplicationLog(from?: string, to?: string): Promise<DuplicationLogEntry[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch<{ log: DuplicationLogEntry[] }>(`/api/duplication-log${qs}`);
  return res.log ?? [];
}

// --- Import ---
export async function importReagentsToTeam(targetTeamId: number, reagentIds: number[]): Promise<{ copied: number }> {
  return apiFetch("/api/import/reagents", {
    method: "POST",
    body: JSON.stringify({ targetTeamId, reagentIds }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/tauri.ts
git commit -m "feat: add API client functions for suppliers, catalog, destruction, duplication, import"
```

### Task 4.2: Enhance BulkAddForm with supplier/reagent catalog selection

**Files:**
- Modify: `apps/web/src/components/BulkAddForm.tsx`

- [ ] **Step 1: Add supplier and catalog selection to each row**

The existing BulkAddForm has rows with (name, category, expiryDate, lotNumber). Replace the free-text `name` field with two dropdowns:

1. **Supplier dropdown** — populated from `getSuppliers()`
2. **Reagent dropdown** — filtered by selected supplier from `getReagentCatalog(supplierId)`
3. **Quantity input** — new field

When supplier changes, fetch reagents for that supplier. When reagent selected, auto-fill the name. Add quantity field.

Update the `ReagentFormData` to include `supplier_id`, `supplier_name`, and `quantity`.

- [ ] **Step 2: Update shared types**

In `packages/shared/src/types.ts`, add to `ReagentFormData`:
```typescript
  supplier_id?: number;
  supplier_name?: string;
  quantity?: number;
```

Add to `Reagent`:
```typescript
  supplier_id?: number | null;
  supplier_name?: string | null;
  quantity?: number | null;
  catalog_reagent_id?: number | null;
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/BulkAddForm.tsx packages/shared/src/types.ts
git commit -m "feat: add supplier/reagent catalog selection to BulkAddForm + quantity field"
```

### Task 4.3: Add supplier + quantity columns to ReagentTable

**Files:**
- Modify: `apps/web/src/components/ReagentTable.tsx`

- [ ] **Step 1: Add columns**

Add two new columns to the TanStack table definition:
- `supplier_name` — after `name` column
- `quantity` — after `lot_number` column

Table header labels use `t("catalog.supplier")` and `t("newShipment.quantity")`.

- [ ] **Step 2: Add to ReagentCard**

Modify `apps/web/src/components/ReagentCard.tsx` to show supplier name and quantity.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ReagentTable.tsx apps/web/src/components/ReagentCard.tsx
git commit -m "feat: add supplier and quantity columns to dashboard table/cards"
```

---

## Phase 5: Destruction Workflow + Batch History

### Task 5.1: Create DestructionDialog component

**Files:**
- Create: `apps/web/src/components/DestructionDialog.tsx`

- [ ] **Step 1: Build the dialog**

Dialog with:
- Title: `t("destruction.title")`
- Question text: `t("destruction.question")`
- Number input for quantity_destroyed (pre-filled with reagent's current quantity)
- "לא הושמדו" button → sets to 0 and submits
- "אישור השמדה" button → submits with entered quantity
- Calls `destroyReagent()` API, then callback to refresh dashboard

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/DestructionDialog.tsx
git commit -m "feat: create DestructionDialog component"
```

### Task 5.2: Replace archive actions with destruction in Dashboard

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace handleArchive with handleDestroy**

Replace `archiveReagent` calls with opening the DestructionDialog. Replace the Archive icon button with a treatment/disposal icon (e.g., `Flame` or `ShieldAlert` from lucide).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx
git commit -m "feat: replace archive with destruction workflow in Dashboard"
```

### Task 5.3: Create BatchHistory page

**Files:**
- Create: `apps/web/src/pages/BatchHistory.tsx`

- [ ] **Step 1: Build the page**

Full page with:
- Period filter bar: quick buttons (last month, previous month, 3 months, 6 months, year) + custom date range with calendar pickers
- Toggle: "אצוות שהושמדו בלבד" — filters to `quantity_destroyed > 0`
- Table with columns from REQ-09 (including "בוצע ע"י")
- Sortable columns
- Print button → `window.print()` with styled print header (logo, team name, user name, date, active period)
- Data from `getDestructionLog(from, to)`

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/BatchHistory.tsx
git commit -m "feat: create BatchHistory page with filters and print support"
```

---

## Phase 6: Enhanced Duplication + Duplication History

### Task 6.1: Enhance DuplicateReagentDialog as "New Shipment"

**Files:**
- Modify: `apps/web/src/components/DuplicateReagentDialog.tsx`

- [ ] **Step 1: Update the dialog**

- Title: `t("newShipment.title")` instead of current title
- Reagent name: **read-only** (displayed but not editable)
- Supplier: **read-only** (displayed)
- Lot number: **empty** (user must enter)
- Expiry date: **empty** (user must enter)
- Quantity: **pre-filled** from original, with green text below:
  ```tsx
  <p className="text-sm mt-1" style={{ color: "#2d6a4f" }}>
    <HelpCircle className="inline h-4 w-4 mr-1" />
    {t("newShipment.sameQuantity")}
  </p>
  ```

- [ ] **Step 2: Pass supplier_name and quantity in the API call**

When calling `duplicateReagent()`, also pass `supplier_name` and `quantity` in the body so the duplication log captures them.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DuplicateReagentDialog.tsx
git commit -m "feat: enhance duplication dialog as 'New Shipment' with quantity confirmation"
```

### Task 6.2: Create DuplicationHistory page

**Files:**
- Create: `apps/web/src/pages/DuplicationHistory.tsx`

- [ ] **Step 1: Build the page**

Same structure as BatchHistory but:
- Data from `getDuplicationLog(from, to)`
- Columns from REQ-10 (received_date, reagent_name, supplier, lot, expiry, quantity, performed_by)
- Same period filters and custom date range
- Same print support with header

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/DuplicationHistory.tsx
git commit -m "feat: create DuplicationHistory page"
```

---

## Phase 7: Import Between Teams + Alerts

### Task 7.1: Add import action to Dashboard

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add import button for selected reagents**

When reagents are selected and user has multiple teams, show an "Import to [team name]" button. On click:
- Show confirmation dialog: "להעתיק X ריאגנטים ל-[team name]?"
- Call `importReagentsToTeam(targetTeamId, selectedIds)`
- Show success toast

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx
git commit -m "feat: add import reagents to other team action"
```

### Task 7.2: Add team name to alerts

**Files:**
- Modify: `apps/web/src/components/ExpiryAlertSection.tsx`
- Modify: `apps/api/src/services/cron.ts` (push notification text)

- [ ] **Step 1: Show team name in alert items**

In ExpiryAlertSection, prepend the team name to each alert item header.

- [ ] **Step 2: Update push notification text**

In the cron service that sends push notifications, include the team name in the notification title:
```typescript
const title = `${teamName}: ${reagentName} — ${t("expired")}`;
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ExpiryAlertSection.tsx apps/api/src/services/cron.ts
git commit -m "feat: include team/hospital name in all alerts and notifications"
```

### Task 7.3: Add catalog management section to Settings page

**Files:**
- Modify: `apps/web/src/pages/Settings.tsx`

- [ ] **Step 1: Add "ניהול קטלוג" section**

Add a collapsible section to Settings with:
- **Supplier list**: shows all suppliers for current team with delete button each
- **Add supplier** form: name + optional short code → calls `createSupplier()`
- **Reagent list per supplier**: expandable, shows reagents per supplier with delete button each
- **Add reagent** form: name + optional catalog number + supplier dropdown → calls `createReagentCatalogItem()`
- Delete supplier shows confirmation: `t("catalog.deleteSupplierConfirm")`
- Delete cascades to reagents (handled by API)

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Settings.tsx
git commit -m "feat: add catalog management section to Settings page"
```

### Task 7.4: Print header component (shared by history pages)

**Files:**
- Create: `apps/web/src/components/PrintHeader.tsx`

- [ ] **Step 1: Create reusable print header**

```tsx
// apps/web/src/components/PrintHeader.tsx
import { useTranslation } from "react-i18next";

interface PrintHeaderProps {
  teamName: string;
  userName: string;
  filterLabel?: string;
}

export function PrintHeader({ teamName, userName, filterLabel }: PrintHeaderProps) {
  const { t } = useTranslation();
  const now = new Date().toLocaleString("he-IL");

  return (
    <div className="hidden print:block border-b pb-3 mb-4">
      <div className="flex items-center gap-3">
        <img src="/logo-icon-v2.png" alt="" className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">מערכת Expiry Alert</h1>
          <p className="text-sm text-muted-foreground">
            {teamName} &bull; {t("dashboard.printedAt", { at: now })} &bull; {userName}
          </p>
          {filterLabel && (
            <p className="text-xs text-muted-foreground">{filterLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/PrintHeader.tsx
git commit -m "feat: create reusable PrintHeader component for history pages"
```

---

## Final: Build + Deploy

### Task F.1: Build and test

- [ ] **Step 1: Build API**

```bash
cd /root/expiry-alert && npm run build --workspace=apps/api
```

- [ ] **Step 2: Build Web**

```bash
npm run build --workspace=apps/web
```

- [ ] **Step 3: Restart services**

```bash
cd /root/expiry-alert && docker compose up -d --build
```

- [ ] **Step 4: Verify**

Open `https://expiryalert.coriathost.cloud`:
- Sidebar appears collapsed
- Team toggle works
- Dashboard shows supplier + quantity columns
- New shipment dialog works
- Destruction dialog works
- Batch history + duplication history pages load
- Import between teams works
- Print works with team name in header

- [ ] **Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete Expiry Alert v2 multi-site upgrade"
```
