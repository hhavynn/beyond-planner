export const schemaStatements = [
  "PRAGMA foreign_keys = ON;",
  `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS festival (
      id TEXT PRIMARY KEY NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      edition_label TEXT NOT NULL,
      timezone TEXT NOT NULL,
      city TEXT,
      state TEXT,
      content_version INTEGER NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS festival_days (
      id TEXT PRIMARY KEY NOT NULL,
      festival_id TEXT NOT NULL,
      label TEXT NOT NULL,
      date_local TEXT,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (festival_id) REFERENCES festival(id)
    );`,
  `CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY NOT NULL,
      festival_id TEXT NOT NULL,
      day_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      area_kind TEXT,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (festival_id) REFERENCES festival(id)
    );`,
  `CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY NOT NULL,
      slug TEXT,
      name TEXT NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY NOT NULL,
      festival_id TEXT NOT NULL,
      day_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (festival_id) REFERENCES festival(id),
      FOREIGN KEY (day_id) REFERENCES festival_days(id),
      FOREIGN KEY (stage_id) REFERENCES stages(id),
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    );`,
  `CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      set_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, set_id)
    );`,
  `CREATE TABLE IF NOT EXISTS itinerary_items (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      set_id TEXT,
      group_id TEXT,
      starts_at TEXT,
      ends_at TEXT,
      location_label TEXT,
      notes TEXT,
      status TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS reminder_settings (
      id TEXT PRIMARY KEY NOT NULL,
      itinerary_item_id TEXT NOT NULL UNIQUE,
      minutes_before INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_scheduled_at TEXT,
      scheduled_notification_id TEXT,
      scheduled_for TEXT,
      FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items(id)
    );`,
  `CREATE TABLE IF NOT EXISTS logistics_checklist_items (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS groups_cache (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      invite_code TEXT,
      owner_user_id TEXT,
      last_synced_at TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS group_memberships_cache (
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      last_synced_at TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS meetup_items_cache (
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      location_label TEXT,
      starts_at TEXT,
      ends_at TEXT,
      notes TEXT,
      last_synced_at TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  `CREATE INDEX IF NOT EXISTS idx_itinerary_items_user_active_start
    ON itinerary_items(user_id, deleted_at, starts_at);`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_user_active
    ON favorites(user_id, deleted_at);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_set_plan
    ON itinerary_items(user_id, set_id)
    WHERE kind = 'set' AND deleted_at IS NULL AND set_id IS NOT NULL;`,
];
