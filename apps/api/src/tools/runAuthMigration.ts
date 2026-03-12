import { Pool, type PoolClient } from "pg";
import { config } from "../config.js";

type CollectionMeta = {
  collection: string;
  icon?: string | null;
  note?: string | null;
  displayTemplate?: string | null;
  hidden?: boolean;
  singleton?: boolean;
  sort?: number | null;
  group?: string | null;
  collapse?: string;
  color?: string | null;
};

type FieldMeta = {
  collection: string;
  field: string;
  special?: string | null;
  interface?: string | null;
  options?: unknown;
  display?: string | null;
  displayOptions?: unknown;
  readonly?: boolean;
  hidden?: boolean;
  sort?: number | null;
  width?: string | null;
  translations?: unknown;
  note?: string | null;
  conditions?: unknown;
  required?: boolean;
  group?: string | null;
  validation?: unknown;
  validationMessage?: string | null;
  searchable?: boolean;
};

type RelationMeta = {
  manyCollection: string;
  manyField: string;
  oneCollection?: string | null;
  oneField?: string | null;
  oneCollectionField?: string | null;
  oneAllowedCollections?: string | null;
  junctionField?: string | null;
  sortField?: string | null;
  oneDeselectAction?: string;
};

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function publicTable(table: string) {
  return `${quoteIdent("public")}.${quoteIdent(table)}`;
}

async function tableExists(client: PoolClient, schema: string, table: string) {
  const result = await client.query<{ oid: string | null }>(
    "select to_regclass($1) as oid",
    [`${schema}.${table}`],
  );
  return Boolean(result.rows[0]?.oid);
}

async function sequenceExists(client: PoolClient, schema: string, sequence: string) {
  const result = await client.query<{ oid: string | null }>(
    "select to_regclass($1) as oid",
    [`${schema}.${sequence}`],
  );
  return Boolean(result.rows[0]?.oid);
}

async function collectionMetaExists(client: PoolClient, collection: string) {
  const result = await client.query(
    "select 1 from directus_collections where collection = $1 limit 1",
    [collection],
  );
  return (result.rowCount ?? 0) > 0;
}

async function ensureIndex(
  client: PoolClient,
  indexName: string,
  sql: string,
) {
  const result = await client.query<{ oid: string | null }>(
    "select to_regclass($1) as oid",
    [`public.${indexName}`],
  );
  if (!result.rows[0]?.oid) {
    await client.query(sql);
  }
}

async function hasForeignKey(
  client: PoolClient,
  table: string,
  column: string,
  foreignTable: string,
) {
  const result = await client.query(
    `
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on tc.constraint_name = ccu.constraint_name
       and tc.table_schema = ccu.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = 'public'
        and tc.table_name = $1
        and kcu.column_name = $2
        and ccu.table_schema = 'public'
        and ccu.table_name = $3
      limit 1
    `,
    [table, column, foreignTable],
  );
  return (result.rowCount ?? 0) > 0;
}

async function ensureForeignKey(
  client: PoolClient,
  input: {
    table: string;
    column: string;
    foreignTable: string;
    foreignColumn?: string;
    constraintName: string;
    onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  },
) {
  if (await hasForeignKey(client, input.table, input.column, input.foreignTable)) {
    return;
  }

  await client.query(
    `alter table ${publicTable(input.table)}
       add constraint ${quoteIdent(input.constraintName)}
       foreign key (${quoteIdent(input.column)})
       references ${publicTable(input.foreignTable)}(${quoteIdent(input.foreignColumn ?? "id")})
       on delete ${input.onDelete ?? "NO ACTION"}`,
  );
}

async function ensureCollectionMeta(client: PoolClient, meta: CollectionMeta) {
  const values = [
    meta.collection,
    meta.icon ?? null,
    meta.note ?? null,
    meta.displayTemplate ?? null,
    meta.hidden ?? false,
    meta.singleton ?? false,
    meta.sort ?? null,
    meta.group ?? null,
    meta.collapse ?? "open",
    meta.color ?? null,
  ];

  const updated = await client.query(
    `
      update directus_collections
         set icon = $2,
             note = $3,
             display_template = $4,
             hidden = $5,
             singleton = $6,
             sort = $7,
             "group" = $8,
             collapse = $9,
             color = $10
       where collection = $1
    `,
    values,
  );

  if (updated.rowCount === 0) {
    await client.query(
      `
        insert into directus_collections (
          collection,
          icon,
          note,
          display_template,
          hidden,
          singleton,
          sort,
          "group",
          collapse,
          color
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      values,
    );
  }
}

async function ensureFieldMeta(client: PoolClient, meta: FieldMeta) {
  const values = [
    meta.collection,
    meta.field,
    meta.special ?? null,
    meta.interface ?? null,
    meta.options == null ? null : JSON.stringify(meta.options),
    meta.display ?? null,
    meta.displayOptions == null ? null : JSON.stringify(meta.displayOptions),
    meta.readonly ?? false,
    meta.hidden ?? false,
    meta.sort ?? null,
    meta.width ?? "full",
    meta.translations == null ? null : JSON.stringify(meta.translations),
    meta.note ?? null,
    meta.conditions == null ? null : JSON.stringify(meta.conditions),
    meta.required ?? false,
    meta.group ?? null,
    meta.validation == null ? null : JSON.stringify(meta.validation),
    meta.validationMessage ?? null,
    meta.searchable ?? true,
  ];

  const updated = await client.query(
    `
      update directus_fields
         set special = $3,
             interface = $4,
             options = $5::json,
             display = $6,
             display_options = $7::json,
             readonly = $8,
             hidden = $9,
             sort = $10,
             width = $11,
             translations = $12::json,
             note = $13,
             conditions = $14::json,
             required = $15,
             "group" = $16,
             validation = $17::json,
             validation_message = $18,
             searchable = $19
       where collection = $1
         and field = $2
    `,
    values,
  );

  if (updated.rowCount === 0) {
    await client.query(
      `
        insert into directus_fields (
          collection,
          field,
          special,
          interface,
          options,
          display,
          display_options,
          readonly,
          hidden,
          sort,
          width,
          translations,
          note,
          conditions,
          required,
          "group",
          validation,
          validation_message,
          searchable
        ) values (
          $1,$2,$3,$4,$5::json,$6,$7::json,$8,$9,$10,$11,$12::json,$13,$14::json,$15,$16,$17::json,$18,$19
        )
      `,
      values,
    );
  }
}

async function ensureRelationMeta(client: PoolClient, meta: RelationMeta) {
  const values = [
    meta.manyCollection,
    meta.manyField,
    meta.oneCollection ?? null,
    meta.oneField ?? null,
    meta.oneCollectionField ?? null,
    meta.oneAllowedCollections ?? null,
    meta.junctionField ?? null,
    meta.sortField ?? null,
    meta.oneDeselectAction ?? "nullify",
  ];

  const updated = await client.query(
    `
      update directus_relations
         set one_collection = $3,
             one_field = $4,
             one_collection_field = $5,
             one_allowed_collections = $6,
             junction_field = $7,
             sort_field = $8,
             one_deselect_action = $9
       where many_collection = $1
         and many_field = $2
    `,
    values,
  );

  if (updated.rowCount === 0) {
    await client.query(
      `
        insert into directus_relations (
          many_collection,
          many_field,
          one_collection,
          one_field,
          one_collection_field,
          one_allowed_collections,
          junction_field,
          sort_field,
          one_deselect_action
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      values,
    );
  }
}

async function renameUsersTable(client: PoolClient) {
  const publicUsersExists = await tableExists(client, "public", "app_users");
  const renamedUsersExist = await tableExists(client, "public", "expiryalert_users");

  if (publicUsersExists && !renamedUsersExist) {
    await client.query("alter table public.app_users rename to expiryalert_users");
  }

  if (await sequenceExists(client, "public", "app_users_id_seq")) {
    await client.query("alter sequence public.app_users_id_seq rename to expiryalert_users_id_seq");
  }

  if (await sequenceExists(client, "public", "expiryalert_users_id_seq")) {
    await client.query(
      `
        alter table public.expiryalert_users
        alter column id set default nextval('public.expiryalert_users_id_seq'::regclass)
      `,
    );
  }
}

async function backfillLegacyUsers(client: PoolClient) {
  await client.query(
    `
      update public.expiryalert_users
         set password_hash = password
       where coalesce(password_hash, '') = ''
         and coalesce(password, '') ~ '^\\$2[aby]\\$'
    `,
  );

  await client.query(
    `
      update public.expiryalert_users
         set display_name = coalesce(
               nullif(display_name, ''),
               nullif(trim(concat_ws(' ', first_name, last_name)), ''),
               nullif(name, ''),
               email
             ),
             name = coalesce(
               nullif(name, ''),
               nullif(display_name, ''),
               nullif(trim(concat_ws(' ', first_name, last_name)), ''),
               email
             ),
             role = coalesce(nullif(role, ''), 'USER'),
             "isActive" = coalesce("isActive", true),
             "createdAt" = coalesce("createdAt", now()),
             "updatedAt" = coalesce("updatedAt", now())
    `,
  );
}

async function normalizeExistingTeams(client: PoolClient) {
  await client.query(
    `
      update public.teams
         set approved = true,
             approved_at = coalesce(approved_at, now())
       where approved is distinct from true
    `,
  );

  await client.query(
    `
      update public.memberships
         set status = 'active'
       where status is null
    `,
  );
}

async function ensureSupportTables(client: PoolClient) {
  await client.query(
    `
      create table if not exists public.expiryalert_join_requests (
        id serial primary key,
        team integer not null,
        requester integer not null,
        reviewer integer,
        requester_message text,
        status varchar(32) not null default 'pending',
        reviewed_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `,
  );

  await client.query(
    `
      create table if not exists public.expiryalert_admin_events (
        id serial primary key,
        event_type varchar(64) not null,
        message text not null,
        "user" integer,
        team integer,
        metadata jsonb,
        created_at timestamptz not null default now()
      )
    `,
  );

  await client.query(
    `
      create table if not exists public.expiryalert_messages (
        id serial primary key,
        scope varchar(32) not null,
        team integer,
        sender integer not null,
        title varchar(120),
        body text not null,
        created_at timestamptz not null default now()
      )
    `,
  );

  await client.query(
    `
      create table if not exists public.expiryalert_message_recipients (
        id serial primary key,
        message integer not null,
        "user" integer not null,
        read_at timestamptz,
        created_at timestamptz not null default now()
      )
    `,
  );

  await client.query(
    `
      create table if not exists public.expiryalert_message_reagents (
        id serial primary key,
        message integer not null,
        reagent integer,
        reagent_name text not null,
        reagent_expiry_date varchar(64),
        reagent_lot_number text,
        reagent_category varchar(64),
        created_at timestamptz not null default now()
      )
    `,
  );

  await ensureIndex(
    client,
    "expiryalert_join_requests_team_status_idx",
    "create index expiryalert_join_requests_team_status_idx on public.expiryalert_join_requests (team, status, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_join_requests_requester_status_idx",
    "create index expiryalert_join_requests_requester_status_idx on public.expiryalert_join_requests (requester, status, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_join_requests_pending_uniq",
    "create unique index expiryalert_join_requests_pending_uniq on public.expiryalert_join_requests (team, requester) where status = 'pending'",
  );
  await ensureIndex(
    client,
    "expiryalert_admin_events_team_created_idx",
    "create index expiryalert_admin_events_team_created_idx on public.expiryalert_admin_events (team, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_admin_events_user_created_idx",
    "create index expiryalert_admin_events_user_created_idx on public.expiryalert_admin_events (\"user\", created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_messages_team_created_idx",
    "create index expiryalert_messages_team_created_idx on public.expiryalert_messages (team, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_messages_scope_created_idx",
    "create index expiryalert_messages_scope_created_idx on public.expiryalert_messages (scope, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_messages_sender_created_idx",
    "create index expiryalert_messages_sender_created_idx on public.expiryalert_messages (sender, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_message_recipients_user_read_created_idx",
    "create index expiryalert_message_recipients_user_read_created_idx on public.expiryalert_message_recipients (\"user\", read_at, created_at desc)",
  );
  await ensureIndex(
    client,
    "expiryalert_message_recipients_message_idx",
    "create index expiryalert_message_recipients_message_idx on public.expiryalert_message_recipients (message)",
  );
  await ensureIndex(
    client,
    "expiryalert_message_recipients_message_user_uniq",
    "create unique index expiryalert_message_recipients_message_user_uniq on public.expiryalert_message_recipients (message, \"user\")",
  );
  await ensureIndex(
    client,
    "expiryalert_message_reagents_message_idx",
    "create index expiryalert_message_reagents_message_idx on public.expiryalert_message_reagents (message)",
  );
  await ensureIndex(
    client,
    "expiryalert_message_reagents_reagent_idx",
    "create index expiryalert_message_reagents_reagent_idx on public.expiryalert_message_reagents (reagent)",
  );
}

async function ensureForeignKeys(client: PoolClient) {
  await ensureForeignKey(client, {
    table: "teams",
    column: "owner",
    foreignTable: "expiryalert_users",
    constraintName: "teams_owner_expiryalert_users_fk",
    onDelete: "SET NULL",
  });
  await ensureForeignKey(client, {
    table: "memberships",
    column: "user",
    foreignTable: "expiryalert_users",
    constraintName: "memberships_user_expiryalert_users_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "memberships",
    column: "team",
    foreignTable: "teams",
    constraintName: "memberships_team_teams_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "invites",
    column: "team",
    foreignTable: "teams",
    constraintName: "invites_team_teams_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "notification_log",
    column: "user",
    foreignTable: "expiryalert_users",
    constraintName: "notification_log_user_expiryalert_users_fk",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_join_requests",
    column: "team",
    foreignTable: "teams",
    constraintName: "expiryalert_join_requests_team_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_join_requests",
    column: "requester",
    foreignTable: "expiryalert_users",
    constraintName: "expiryalert_join_requests_requester_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_join_requests",
    column: "reviewer",
    foreignTable: "expiryalert_users",
    constraintName: "expiryalert_join_requests_reviewer_fk",
    onDelete: "SET NULL",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_admin_events",
    column: "user",
    foreignTable: "expiryalert_users",
    constraintName: "expiryalert_admin_events_user_fk",
    onDelete: "SET NULL",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_admin_events",
    column: "team",
    foreignTable: "teams",
    constraintName: "expiryalert_admin_events_team_fk",
    onDelete: "SET NULL",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_messages",
    column: "team",
    foreignTable: "teams",
    constraintName: "expiryalert_messages_team_fk",
    onDelete: "SET NULL",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_messages",
    column: "sender",
    foreignTable: "expiryalert_users",
    constraintName: "expiryalert_messages_sender_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_message_recipients",
    column: "message",
    foreignTable: "expiryalert_messages",
    constraintName: "expiryalert_message_recipients_message_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_message_recipients",
    column: "user",
    foreignTable: "expiryalert_users",
    constraintName: "expiryalert_message_recipients_user_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_message_reagents",
    column: "message",
    foreignTable: "expiryalert_messages",
    constraintName: "expiryalert_message_reagents_message_fk",
    onDelete: "CASCADE",
  });
  await ensureForeignKey(client, {
    table: "expiryalert_message_reagents",
    column: "reagent",
    foreignTable: "reagents",
    constraintName: "expiryalert_message_reagents_reagent_fk",
    onDelete: "SET NULL",
  });
}

async function updateCollectionReferences(
  client: PoolClient,
  fromCollection: string,
  toCollection: string,
) {
  if (await collectionMetaExists(client, fromCollection)) {
    const hasTarget = await collectionMetaExists(client, toCollection);
    if (!hasTarget) {
      await client.query(
        "update directus_collections set collection = $2 where collection = $1",
        [fromCollection, toCollection],
      );
    } else {
      await client.query(
        "delete from directus_collections where collection = $1",
        [fromCollection],
      );
    }
  }

  const collectionTables = [
    "directus_activity",
    "directus_comments",
    "directus_notifications",
    "directus_permissions",
    "directus_presets",
    "directus_revisions",
    "directus_shares",
    "directus_versions",
  ];

  for (const table of collectionTables) {
    await client.query(
      `update ${quoteIdent(table)} set collection = $2 where collection = $1`,
      [fromCollection, toCollection],
    );
  }

  await client.query(
    "update directus_fields set collection = $2 where collection = $1",
    [fromCollection, toCollection],
  );
  await client.query(
    "update directus_relations set many_collection = $2 where many_collection = $1",
    [fromCollection, toCollection],
  );
  await client.query(
    "update directus_relations set one_collection = $2 where one_collection = $1",
    [fromCollection, toCollection],
  );
}

async function ensureDirectusCollections(client: PoolClient) {
  await ensureCollectionMeta(client, {
    collection: "coriathost_users",
    icon: "hub",
    note: "Top-level Coriathost user-management folder.",
    hidden: false,
    sort: 10,
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_admin",
    icon: "admin_panel_settings",
    note: "Expiry Alert authentication and team administration.",
    hidden: false,
    sort: 20,
    group: "coriathost_users",
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_users",
    icon: "badge",
    note: "Expiry Alert application users.",
    displayTemplate: "{{display_name}}",
    hidden: false,
    sort: 1,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "teams",
    icon: "groups",
    note: "Expiry Alert teams and owners.",
    displayTemplate: "{{name}}",
    hidden: false,
    sort: 2,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "memberships",
    icon: "group",
    note: "Memberships linking users to teams.",
    displayTemplate: "{{role}}",
    hidden: false,
    sort: 3,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_join_requests",
    icon: "mail",
    note: "Pending and reviewed requests to join existing teams.",
    displayTemplate: "{{status}}",
    hidden: false,
    sort: 4,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_admin_events",
    icon: "history",
    note: "Audit-style registration and team-access events.",
    displayTemplate: "{{event_type}}",
    hidden: false,
    sort: 5,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_messages",
    icon: "forum",
    note: "Team, private, and system-wide user messages.",
    displayTemplate: "{{scope}}",
    hidden: false,
    sort: 6,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_message_recipients",
    icon: "mark_email_read",
    note: "Per-user delivery and read state for messages.",
    displayTemplate: "{{user}}",
    hidden: false,
    sort: 7,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "expiryalert_message_reagents",
    icon: "science",
    note: "Attached reagent snapshots for messages.",
    displayTemplate: "{{reagent_name}}",
    hidden: false,
    sort: 8,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "invites",
    icon: "mail_outline",
    note: "Pending email invites for team access.",
    displayTemplate: "{{email}}",
    hidden: false,
    sort: 6,
    group: "expiryalert_admin",
  });
  await ensureCollectionMeta(client, {
    collection: "app_users",
    icon: "database",
    note: "Inventory schema table kept hidden to avoid auth collisions.",
    hidden: true,
  });
}

async function ensureDirectusFields(client: PoolClient) {
  const userFields: FieldMeta[] = [
    { collection: "expiryalert_users", field: "id", interface: "numeric", sort: 1 },
    { collection: "expiryalert_users", field: "email", sort: 2 },
    { collection: "expiryalert_users", field: "display_name", sort: 3 },
    { collection: "expiryalert_users", field: "first_name", sort: 4 },
    { collection: "expiryalert_users", field: "last_name", sort: 5 },
    { collection: "expiryalert_users", field: "phone", sort: 6 },
    { collection: "expiryalert_users", field: "google_id", sort: 7 },
    { collection: "expiryalert_users", field: "avatar_url", sort: 8 },
    { collection: "expiryalert_users", field: "last_login", interface: "datetime", sort: 9 },
    { collection: "expiryalert_users", field: "password_hash", hidden: true, sort: 10 },
    { collection: "expiryalert_users", field: "password", hidden: true, sort: 11 },
    { collection: "expiryalert_users", field: "role", sort: 12 },
    { collection: "expiryalert_users", field: "isActive", interface: "boolean", sort: 13 },
    { collection: "expiryalert_users", field: "createdAt", interface: "datetime", sort: 14 },
    { collection: "expiryalert_users", field: "updatedAt", interface: "datetime", sort: 15 },
    { collection: "expiryalert_users", field: "memberships", special: "o2m", interface: "list-o2m", readonly: true, sort: 30 },
    { collection: "expiryalert_users", field: "owned_teams", special: "o2m", interface: "list-o2m", readonly: true, sort: 31 },
    { collection: "expiryalert_users", field: "join_requests", special: "o2m", interface: "list-o2m", readonly: true, sort: 32 },
    { collection: "expiryalert_users", field: "reviewed_join_requests", special: "o2m", interface: "list-o2m", readonly: true, sort: 33 },
    { collection: "expiryalert_users", field: "admin_events", special: "o2m", interface: "list-o2m", readonly: true, sort: 34 },
    { collection: "expiryalert_users", field: "sent_messages", special: "o2m", interface: "list-o2m", readonly: true, sort: 35 },
    { collection: "expiryalert_users", field: "message_receipts", special: "o2m", interface: "list-o2m", readonly: true, sort: 36 },
  ];

  const teamFields: FieldMeta[] = [
    { collection: "teams", field: "id", interface: "numeric", sort: 1 },
    { collection: "teams", field: "name", sort: 2 },
    { collection: "teams", field: "owner", special: "m2o", interface: "select-dropdown-m2o", sort: 3 },
    { collection: "teams", field: "approved", interface: "boolean", sort: 4 },
    { collection: "teams", field: "approved_at", interface: "datetime", sort: 5 },
    { collection: "teams", field: "access_password_hash", hidden: true, sort: 6 },
    { collection: "teams", field: "password_reset_token", hidden: true, sort: 7 },
    { collection: "teams", field: "password_reset_expires_at", interface: "datetime", hidden: true, sort: 8 },
    { collection: "teams", field: "approval_token", hidden: true, sort: 9 },
    { collection: "teams", field: "memberships", special: "o2m", interface: "list-o2m", readonly: true, sort: 20 },
    { collection: "teams", field: "join_requests", special: "o2m", interface: "list-o2m", readonly: true, sort: 21 },
    { collection: "teams", field: "admin_events", special: "o2m", interface: "list-o2m", readonly: true, sort: 22 },
    { collection: "teams", field: "messages", special: "o2m", interface: "list-o2m", readonly: true, sort: 23 },
  ];

  const membershipFields: FieldMeta[] = [
    { collection: "memberships", field: "id", interface: "numeric", sort: 1 },
    { collection: "memberships", field: "user", special: "m2o", interface: "select-dropdown-m2o", sort: 2 },
    { collection: "memberships", field: "team", special: "m2o", interface: "select-dropdown-m2o", sort: 3 },
    { collection: "memberships", field: "role", sort: 4 },
    { collection: "memberships", field: "email_alerts_enabled", interface: "boolean", sort: 5 },
    {
      collection: "memberships",
      field: "status",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Active", value: "active" },
          { text: "Suspended", value: "suspended" },
        ],
      },
      sort: 6,
    },
  ];

  const inviteFields: FieldMeta[] = [
    { collection: "invites", field: "id", interface: "numeric", sort: 1 },
    { collection: "invites", field: "team", special: "m2o", interface: "select-dropdown-m2o", sort: 2 },
    { collection: "invites", field: "email", sort: 3 },
    { collection: "invites", field: "role", sort: 4 },
    {
      collection: "invites",
      field: "status",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Pending", value: "pending" },
          { text: "Accepted", value: "accepted" },
          { text: "Expired", value: "expired" },
        ],
      },
      sort: 5,
    },
    { collection: "invites", field: "code", hidden: true, sort: 6 },
    { collection: "invites", field: "expires_at", interface: "datetime", sort: 7 },
  ];

  const joinRequestFields: FieldMeta[] = [
    { collection: "expiryalert_join_requests", field: "id", interface: "numeric", sort: 1 },
    { collection: "expiryalert_join_requests", field: "team", special: "m2o", interface: "select-dropdown-m2o", sort: 2 },
    { collection: "expiryalert_join_requests", field: "requester", special: "m2o", interface: "select-dropdown-m2o", sort: 3 },
    { collection: "expiryalert_join_requests", field: "reviewer", special: "m2o", interface: "select-dropdown-m2o", sort: 4 },
    { collection: "expiryalert_join_requests", field: "requester_message", interface: "input-multiline", sort: 5 },
    {
      collection: "expiryalert_join_requests",
      field: "status",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Pending", value: "pending" },
          { text: "Approved", value: "approved" },
          { text: "Rejected", value: "rejected" },
        ],
      },
      sort: 6,
    },
    { collection: "expiryalert_join_requests", field: "reviewed_at", interface: "datetime", sort: 7 },
    { collection: "expiryalert_join_requests", field: "created_at", interface: "datetime", sort: 8 },
    { collection: "expiryalert_join_requests", field: "updated_at", interface: "datetime", sort: 9 },
  ];

  const adminEventFields: FieldMeta[] = [
    { collection: "expiryalert_admin_events", field: "id", interface: "numeric", sort: 1 },
    { collection: "expiryalert_admin_events", field: "event_type", sort: 2 },
    { collection: "expiryalert_admin_events", field: "message", interface: "input-multiline", sort: 3 },
    { collection: "expiryalert_admin_events", field: "user", special: "m2o", interface: "select-dropdown-m2o", sort: 4 },
    { collection: "expiryalert_admin_events", field: "team", special: "m2o", interface: "select-dropdown-m2o", sort: 5 },
    { collection: "expiryalert_admin_events", field: "metadata", interface: "input-code", options: { language: "json" }, sort: 6 },
    { collection: "expiryalert_admin_events", field: "created_at", interface: "datetime", sort: 7 },
  ];

  const messageFields: FieldMeta[] = [
    { collection: "expiryalert_messages", field: "id", interface: "numeric", sort: 1 },
    {
      collection: "expiryalert_messages",
      field: "scope",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Private", value: "private" },
          { text: "Team", value: "team" },
          { text: "System", value: "system" },
        ],
      },
      sort: 2,
    },
    { collection: "expiryalert_messages", field: "team", special: "m2o", interface: "select-dropdown-m2o", sort: 3 },
    { collection: "expiryalert_messages", field: "sender", special: "m2o", interface: "select-dropdown-m2o", sort: 4 },
    { collection: "expiryalert_messages", field: "title", sort: 5 },
    { collection: "expiryalert_messages", field: "body", interface: "input-multiline", sort: 6 },
    { collection: "expiryalert_messages", field: "created_at", interface: "datetime", sort: 7 },
    { collection: "expiryalert_messages", field: "recipients", special: "o2m", interface: "list-o2m", readonly: true, sort: 20 },
    { collection: "expiryalert_messages", field: "reagent_attachments", special: "o2m", interface: "list-o2m", readonly: true, sort: 21 },
  ];

  const messageRecipientFields: FieldMeta[] = [
    { collection: "expiryalert_message_recipients", field: "id", interface: "numeric", sort: 1 },
    { collection: "expiryalert_message_recipients", field: "message", special: "m2o", interface: "select-dropdown-m2o", sort: 2 },
    { collection: "expiryalert_message_recipients", field: "user", special: "m2o", interface: "select-dropdown-m2o", sort: 3 },
    { collection: "expiryalert_message_recipients", field: "read_at", interface: "datetime", sort: 4 },
    { collection: "expiryalert_message_recipients", field: "created_at", interface: "datetime", sort: 5 },
  ];

  const messageReagentFields: FieldMeta[] = [
    { collection: "expiryalert_message_reagents", field: "id", interface: "numeric", sort: 1 },
    { collection: "expiryalert_message_reagents", field: "message", special: "m2o", interface: "select-dropdown-m2o", sort: 2 },
    { collection: "expiryalert_message_reagents", field: "reagent", special: "m2o", interface: "select-dropdown-m2o", sort: 3 },
    { collection: "expiryalert_message_reagents", field: "reagent_name", sort: 4 },
    { collection: "expiryalert_message_reagents", field: "reagent_expiry_date", sort: 5 },
    { collection: "expiryalert_message_reagents", field: "reagent_lot_number", sort: 6 },
    { collection: "expiryalert_message_reagents", field: "reagent_category", sort: 7 },
    { collection: "expiryalert_message_reagents", field: "created_at", interface: "datetime", sort: 8 },
  ];

  const notificationLogFields: FieldMeta[] = [
    {
      collection: "notification_log",
      field: "alert_type",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Expiry Day", value: "0day" },
          { text: "Sunday/Wednesday 5-Day Summary", value: "5day_summary" },
          { text: "7 Days", value: "7day" },
          { text: "2 Days", value: "2day" },
          { text: "1 Day", value: "1day" },
          { text: "Expired", value: "expired" },
        ],
      },
    },
  ];

  for (const field of [
    ...userFields,
    ...teamFields,
    ...membershipFields,
    ...inviteFields,
    ...joinRequestFields,
    ...adminEventFields,
    ...messageFields,
    ...messageRecipientFields,
    ...messageReagentFields,
    ...notificationLogFields,
  ]) {
    await ensureFieldMeta(client, field);
  }
}

async function ensureDirectusRelations(client: PoolClient) {
  const relations: RelationMeta[] = [
    { manyCollection: "teams", manyField: "owner", oneCollection: "expiryalert_users", oneField: "owned_teams" },
    { manyCollection: "memberships", manyField: "user", oneCollection: "expiryalert_users", oneField: "memberships" },
    { manyCollection: "memberships", manyField: "team", oneCollection: "teams", oneField: "memberships" },
    { manyCollection: "invites", manyField: "team", oneCollection: "teams" },
    { manyCollection: "notification_log", manyField: "user", oneCollection: "expiryalert_users" },
    { manyCollection: "notification_log", manyField: "team", oneCollection: "teams" },
    { manyCollection: "expiryalert_join_requests", manyField: "team", oneCollection: "teams", oneField: "join_requests" },
    { manyCollection: "expiryalert_join_requests", manyField: "requester", oneCollection: "expiryalert_users", oneField: "join_requests" },
    { manyCollection: "expiryalert_join_requests", manyField: "reviewer", oneCollection: "expiryalert_users", oneField: "reviewed_join_requests" },
    { manyCollection: "expiryalert_admin_events", manyField: "user", oneCollection: "expiryalert_users", oneField: "admin_events" },
    { manyCollection: "expiryalert_admin_events", manyField: "team", oneCollection: "teams", oneField: "admin_events" },
    { manyCollection: "expiryalert_messages", manyField: "team", oneCollection: "teams", oneField: "messages" },
    { manyCollection: "expiryalert_messages", manyField: "sender", oneCollection: "expiryalert_users", oneField: "sent_messages" },
    { manyCollection: "expiryalert_message_recipients", manyField: "message", oneCollection: "expiryalert_messages", oneField: "recipients" },
    { manyCollection: "expiryalert_message_recipients", manyField: "user", oneCollection: "expiryalert_users", oneField: "message_receipts" },
    { manyCollection: "expiryalert_message_reagents", manyField: "message", oneCollection: "expiryalert_messages", oneField: "reagent_attachments" },
    { manyCollection: "expiryalert_message_reagents", manyField: "reagent", oneCollection: "reagents" },
  ];

  for (const relation of relations) {
    await ensureRelationMeta(client, relation);
  }
}

async function updateDirectusPresets(client: PoolClient) {
  const layoutQuery = {
    tabular: {
      page: 1,
      fields: [
        "id",
        "email",
        "display_name",
        "first_name",
        "last_name",
        "phone",
        "role",
        "isActive",
        "last_login",
        "updatedAt",
      ],
    },
  };

  await client.query(
    `
      update directus_presets
         set layout = 'tabular',
             layout_query = $2::json,
             layout_options = $3::json
       where collection = $1
    `,
    [
      "expiryalert_users",
      JSON.stringify(layoutQuery),
      JSON.stringify({ tabular: { spacing: "cozy" } }),
    ],
  );
}

async function logSummary(client: PoolClient) {
  const users = await client.query<{ count: string }>(
    "select count(*) from public.expiryalert_users",
  );
  const teams = await client.query<{ count: string }>(
    "select count(*) from public.teams",
  );
  const memberships = await client.query<{ count: string }>(
    "select count(*) from public.memberships",
  );
  const joinRequests = await client.query<{ count: string }>(
    "select count(*) from public.expiryalert_join_requests",
  );
  const messages = await client.query<{ count: string }>(
    "select count(*) from public.expiryalert_messages",
  );

  console.log("Auth migration complete");
  console.log(
    JSON.stringify(
      {
        users: Number(users.rows[0]?.count ?? 0),
        teams: Number(teams.rows[0]?.count ?? 0),
        memberships: Number(memberships.rows[0]?.count ?? 0),
        joinRequests: Number(joinRequests.rows[0]?.count ?? 0),
        messages: Number(messages.rows[0]?.count ?? 0),
      },
      null,
      2,
    ),
  );
}

async function run() {
  if (!config.sessionDbUrl) {
    throw new Error("SESSION_DB_URL is required for auth migration");
  }

  const pool = new Pool({
    connectionString: config.sessionDbUrl,
  });

  const client = await pool.connect();
  try {
    await client.query("begin");
    await renameUsersTable(client);

    const usersReady = await tableExists(client, "public", "expiryalert_users");
    if (!usersReady) {
      throw new Error("public.expiryalert_users does not exist after rename step");
    }

    await ensureSupportTables(client);
    await backfillLegacyUsers(client);
    await normalizeExistingTeams(client);
    await ensureForeignKeys(client);
    await updateCollectionReferences(client, "app_users", "expiryalert_users");
    await ensureDirectusCollections(client);
    await ensureDirectusFields(client);
    await ensureDirectusRelations(client);
    await updateDirectusPresets(client);
    await client.query("commit");
    await logSummary(client);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Auth migration failed");
  console.error(error);
  process.exitCode = 1;
});
