/**
 * Seed supplier and reagent catalog data for Expiry Alert v2.
 *
 * Populates ea_suppliers and ea_reagent_catalog for a given team.
 * Idempotent: skips if team already has suppliers seeded.
 *
 * Usage:
 *   TEAM_ID=<id> \
 *   DIRECTUS_URL=http://localhost:8055 \
 *   DIRECTUS_STATIC_TOKEN=<token> \
 *   npx tsx scripts/seed-catalog.ts
 *
 * Or without TEAM_ID to seed ALL teams automatically.
 */

import {
  createDirectus,
  rest,
  staticToken,
  readItems,
  createItems,
} from "@directus/sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DIRECTUS_URL = (
  process.env.DIRECTUS_URL || "http://localhost:8055"
).replace(/\/+$/, "");
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

if (!TOKEN) {
  console.error(
    "ERROR: DIRECTUS_STATIC_TOKEN env var is required.\n" +
      "Usage: DIRECTUS_STATIC_TOKEN=xxx npx tsx scripts/seed-catalog.ts",
  );
  process.exit(1);
}

// Minimal schema typing for SDK
interface Schema {
  teams: { id: number; name: string }[];
  ea_suppliers: {
    id: number;
    team: number;
    name: string;
    short_code: string;
    is_active: boolean;
  }[];
  ea_reagent_catalog: {
    id: number;
    team: number;
    name: string;
    catalog_number: string;
    supplier_id: number;
    is_active: boolean;
  }[];
}

const client = createDirectus<Schema>(DIRECTUS_URL)
  .with(rest())
  .with(staticToken(TOKEN));

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

interface SupplierSeed {
  name: string;
  short_code: string;
}

interface ReagentSeed {
  name: string;
  catalog_number: string;
  supplier_short_code: string; // maps to supplier by short_code
}

const SUPPLIERS: SupplierSeed[] = [
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

const REAGENTS: ReagentSeed[] = [
  // --- BIORAD (24) ---
  { name: "Anti IgG", catalog_number: "1140003097", supplier_short_code: "BIOR" },
  { name: "Liss/Coombs", catalog_number: "1140003089", supplier_short_code: "BIOR" },
  { name: "ABO/D+Reverse Group", catalog_number: "1554010110", supplier_short_code: "BIOR" },
  { name: "ABD-Confirmation", catalog_number: "1554052602", supplier_short_code: "BIOR" },
  { name: "DC screening I", catalog_number: "1140003143", supplier_short_code: "BIOR" },
  { name: "DC screening II", catalog_number: "1140003135", supplier_short_code: "BIOR" },
  { name: "ID Anti-IgG1/IgG3", catalog_number: "1000182013", supplier_short_code: "BIOR" },
  { name: "Anti Fya Serum", catalog_number: "1000197100", supplier_short_code: "BIOR" },
  { name: "DIACELL I-II-III (3x10ML)", catalog_number: "1140003127", supplier_short_code: "BIOR" },
  { name: "DIACELL ABO (A1-B)", catalog_number: "1140003070", supplier_short_code: "BIOR" },
  { name: "DIAPANEL (11x4ML)", catalog_number: "1140003100", supplier_short_code: "BIOR" },
  { name: "DIAPANEL P (11x4ML)", catalog_number: "1140003119", supplier_short_code: "BIOR" },
  { name: "Diluent II for IH-1000", catalog_number: "1000072429", supplier_short_code: "BIOR" },
  { name: "Diluent II 500 ml", catalog_number: "1140003402", supplier_short_code: "BIOR" },
  { name: "DECON 90", catalog_number: "1554057124", supplier_short_code: "BIOR" },
  { name: "DTT 0.2M", catalog_number: "slcl4021", supplier_short_code: "BIOR" },
  { name: "EQAS SHIPMENT A", catalog_number: "1000201433", supplier_short_code: "BIOR" },
  { name: "EQAS SHIPMENT B", catalog_number: "1000201434", supplier_short_code: "BIOR" },
  { name: "EQAS SHIPMENT C", catalog_number: "1000201435", supplier_short_code: "BIOR" },
  { name: "IH-QC 1 (4x6ML)", catalog_number: "1000147018", supplier_short_code: "BIOR" },
  { name: "IH-QC 2 (4x6ML)", catalog_number: "1000147019", supplier_short_code: "BIOR" },
  { name: "PIPETTE RED, 1U", catalog_number: "1000192522", supplier_short_code: "BIOR" },
  { name: "PIPETTE BLACK, 1U", catalog_number: "1000192521", supplier_short_code: "BIOR" },
  { name: "TIPS", catalog_number: "1140003410", supplier_short_code: "BIOR" },

  // --- ELDAN (25) ---
  { name: "Anti-A", catalog_number: "1000006261", supplier_short_code: "ELDA" },
  { name: "Anti-B", catalog_number: "1000006262", supplier_short_code: "ELDA" },
  { name: "Anti-D", catalog_number: "1000006265", supplier_short_code: "ELDA" },
  { name: "Anti-IgG Green", catalog_number: "1000006260", supplier_short_code: "ELDA" },
  { name: "Anti-A1", catalog_number: "1140005464", supplier_short_code: "ELDA" },
  { name: "Anti-C", catalog_number: "1140005324", supplier_short_code: "ELDA" },
  { name: "Anti-c", catalog_number: "1140005340", supplier_short_code: "ELDA" },
  { name: "Anti-E", catalog_number: "1140005499", supplier_short_code: "ELDA" },
  { name: "Anti-e", catalog_number: "1140005359", supplier_short_code: "ELDA" },
  { name: "Anti-K", catalog_number: "1140005375", supplier_short_code: "ELDA" },
  { name: "Anti-k", catalog_number: "1140005600", supplier_short_code: "ELDA" },
  { name: "Anti-M", catalog_number: "1140005383", supplier_short_code: "ELDA" },
  { name: "Anti-N", catalog_number: "1140005391", supplier_short_code: "ELDA" },
  { name: "Anti-P1", catalog_number: "1140005367", supplier_short_code: "ELDA" },
  { name: "Anti-Fya", catalog_number: "1140005634", supplier_short_code: "ELDA" },
  { name: "Anti-Fyb", catalog_number: "1000161746", supplier_short_code: "ELDA" },
  { name: "Anti-Jkb", catalog_number: "1140005669", supplier_short_code: "ELDA" },
  { name: "Ficin", catalog_number: "1122016883", supplier_short_code: "ELDA" },
  { name: "Elu-kit II", catalog_number: "1140005677", supplier_short_code: "ELDA" },
  { name: "CORQC TEST SYSTEM", catalog_number: "1554068495", supplier_short_code: "ELDA" },
  { name: "CHECKCELLS", catalog_number: "1140005189", supplier_short_code: "ELDA" },
  { name: "PANOCELL 10", catalog_number: "1000025956", supplier_short_code: "ELDA" },
  { name: "PANOSCREEN I,II&III", catalog_number: "1140005200", supplier_short_code: "ELDA" },
  { name: "REFERENCELLS A1,B", catalog_number: "1000026149", supplier_short_code: "ELDA" },
  { name: "REFERENCELLS A2", catalog_number: "1000026060", supplier_short_code: "ELDA" },

  // --- ALMOG (3) ---
  { name: "Anti-s", catalog_number: "1000105940", supplier_short_code: "ALMO" },
  { name: "Anti-S", catalog_number: "1000105941", supplier_short_code: "ALMO" },
  { name: "Anti-Jka", catalog_number: "1000105939", supplier_short_code: "ALMO" },

  // --- DANIEL_BIOTECH (2) ---
  { name: "Anti-K Danyel", catalog_number: "1000044842", supplier_short_code: "DANI" },
  { name: "Anti-Jkb Danyel", catalog_number: "1000044844", supplier_short_code: "DANI" },

  // --- DYN (1) ---
  { name: "NaOH", catalog_number: "1000209019", supplier_short_code: "DYN" },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function seedTeam(teamId: number, teamName: string): Promise<void> {
  console.log(`\n--- Seeding team ${teamId} ("${teamName}") ---`);

  // Idempotency check: if this team already has suppliers, skip
  const existingSuppliers = await client.request(
    readItems("ea_suppliers", {
      filter: { team: { _eq: teamId } },
      limit: 1,
    }),
  );

  if (existingSuppliers.length > 0) {
    console.log(
      `  [SKIP] Team ${teamId} already has ${existingSuppliers.length}+ suppliers. Skipping.`,
    );
    return;
  }

  // 1. Create suppliers
  console.log(`  Creating ${SUPPLIERS.length} suppliers...`);
  const supplierPayloads = SUPPLIERS.map((s) => ({
    team: teamId,
    name: s.name,
    short_code: s.short_code,
    is_active: true,
  }));

  const createdSuppliers = await client.request(
    createItems("ea_suppliers", supplierPayloads),
  );

  // Build short_code -> id map
  const supplierMap = new Map<string, number>();
  for (const s of createdSuppliers) {
    supplierMap.set(s.short_code, s.id);
  }
  console.log(`  [OK] ${createdSuppliers.length} suppliers created.`);

  // 2. Create reagent catalog entries
  console.log(`  Creating ${REAGENTS.length} reagent catalog entries...`);
  const reagentPayloads = REAGENTS.map((r) => {
    const supplierId = supplierMap.get(r.supplier_short_code);
    if (!supplierId) {
      throw new Error(
        `Supplier "${r.supplier_short_code}" not found in map for reagent "${r.name}"`,
      );
    }
    return {
      team: teamId,
      name: r.name,
      catalog_number: r.catalog_number,
      supplier_id: supplierId,
      is_active: true,
    };
  });

  const createdReagents = await client.request(
    createItems("ea_reagent_catalog", reagentPayloads),
  );
  console.log(`  [OK] ${createdReagents.length} reagent catalog entries created.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Expiry Alert v2 — Seed Supplier & Reagent Catalog ===");
  console.log(`Target: ${DIRECTUS_URL}\n`);

  const teamIdEnv = process.env.TEAM_ID;

  if (teamIdEnv) {
    // Seed a specific team
    const teamId = parseInt(teamIdEnv, 10);
    if (isNaN(teamId)) {
      console.error(`ERROR: TEAM_ID="${teamIdEnv}" is not a valid number.`);
      process.exit(1);
    }

    // Verify team exists
    const teams = await client.request(
      readItems("teams", {
        filter: { id: { _eq: teamId } },
        fields: ["id", "name"],
        limit: 1,
      }),
    );
    if (teams.length === 0) {
      console.error(`ERROR: Team ${teamId} not found.`);
      process.exit(1);
    }

    await seedTeam(teamId, teams[0].name);
  } else {
    // Seed all teams
    console.log("No TEAM_ID specified — seeding ALL teams.\n");

    const teams = await client.request(
      readItems("teams", {
        fields: ["id", "name"],
        sort: ["id"],
      }),
    );

    if (teams.length === 0) {
      console.error("ERROR: No teams found in Directus.");
      process.exit(1);
    }

    console.log(`Found ${teams.length} team(s): ${teams.map((t) => `${t.id} ("${t.name}")`).join(", ")}`);

    for (const team of teams) {
      await seedTeam(team.id, team.name);
    }
  }

  console.log("\n=== Seed complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
