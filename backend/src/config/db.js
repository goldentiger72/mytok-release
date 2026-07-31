import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, '../../mytok.db');

const db = new Database(DB_PATH);

// WAL 모드 활성화 (동시 읽기/쓰기 성능 향상)
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

// 테이블 DDL 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id   TEXT    UNIQUE,
    email       TEXT    UNIQUE NOT NULL,
    display_name TEXT   NOT NULL,
    avatar_url  TEXT,
    is_owner    INTEGER NOT NULL DEFAULT 0,
    is_bot      INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL CHECK(type IN ('direct','group','self')),
    name        TEXT,
    category_id TEXT    REFERENCES categories(id) ON DELETE SET NULL,
    created_by  INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id   INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (room_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id        INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id      INTEGER NOT NULL REFERENCES users(id),
    content        TEXT    NOT NULL,
    has_attachment INTEGER NOT NULL DEFAULT 0,
    sent_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room_sent ON messages(room_id, sent_at DESC);

  CREATE TABLE IF NOT EXISTS message_reads (
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (message_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id    INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    original_name TEXT    NOT NULL,
    stored_name   TEXT    NOT NULL,
    mime_type     TEXT    NOT NULL,
    size_bytes    INTEGER NOT NULL,
    storage_path  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS bots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    token_hash  TEXT    NOT NULL UNIQUE,
    ai_type     TEXT    NOT NULL CHECK(ai_type IN ('hermes','claude','claude-code','openclaw')),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bots_token_hash ON bots(token_hash);
  CREATE INDEX IF NOT EXISTS idx_bots_room_id    ON bots(room_id);

  -- ── Phase 5 Intelligence Layer 신규 테이블 ──

  CREATE TABLE IF NOT EXISTS threads (
    id                TEXT PRIMARY KEY,
    room_id           INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    parent_message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    created_by        INTEGER NOT NULL REFERENCES users(id),
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_threads_room ON threads(room_id);

  CREATE TABLE IF NOT EXISTS thread_messages (
    id         TEXT PRIMARY KEY,
    thread_id  TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    is_bot     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON thread_messages(thread_id);

  CREATE TABLE IF NOT EXISTS obsidian_links (
    message_id INTEGER PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    note_path  TEXT NOT NULL,
    note_title TEXT NOT NULL,
    linked_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS wiki_entities (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL CHECK(type IN ('entity', 'procedure', 'decision', 'agent-memory')),
    title      TEXT NOT NULL UNIQUE,
    content    TEXT NOT NULL,
    tags       TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS wiki_relations (
    from_id       INTEGER NOT NULL REFERENCES wiki_entities(id) ON DELETE CASCADE,
    to_id         INTEGER NOT NULL REFERENCES wiki_entities(id) ON DELETE CASCADE,
    relation_type TEXT DEFAULT 'related',
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (from_id, to_id)
  );

  CREATE TABLE IF NOT EXISTS ontology_nodes (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL CHECK(type IN ('Person', 'Project', 'Concept', 'Decision', 'Task', 'Event')),
    label      TEXT NOT NULL,
    properties_json TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS ontology_edges (
    from_node  TEXT NOT NULL REFERENCES ontology_nodes(id) ON DELETE CASCADE,
    to_node    TEXT NOT NULL REFERENCES ontology_nodes(id) ON DELETE CASCADE,
    relation   TEXT NOT NULL,
    weight     REAL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (from_node, to_node, relation)
  );

  CREATE INDEX IF NOT EXISTS idx_ontology_edges_from ON ontology_edges(from_node);
  CREATE INDEX IF NOT EXISTS idx_ontology_edges_to   ON ontology_edges(to_node);

  CREATE TABLE IF NOT EXISTS agent_tasks (
    id                TEXT PRIMARY KEY,
    from_agent        TEXT NOT NULL,
    to_agent          TEXT NOT NULL,
    room_id           INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    parent_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    payload_json      TEXT,
    status            TEXT NOT NULL CHECK(status IN ('pending', 'running', 'done', 'failed', 'timeout')),
    result_json       TEXT,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    completed_at      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

  -- LLM Wiki FTS5 전문 검색 테이블 및 트리거
  CREATE VIRTUAL TABLE IF NOT EXISTS wiki_entities_fts USING fts5(
    title,
    content,
    tags,
    content='wiki_entities',
    content_rowid='id'
  );
`);

// 마이그레이션: 기존 rooms 테이블에 category_id 추가 (없을 경우에만)
try {
  db.exec('ALTER TABLE rooms ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL');
} catch (_) {}

// FTS5 동기화 트리거 생성
try {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS wiki_entities_ai AFTER INSERT ON wiki_entities BEGIN
      INSERT INTO wiki_entities_fts(rowid, title, content, tags) VALUES (new.id, new.title, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS wiki_entities_ad AFTER DELETE ON wiki_entities BEGIN
      INSERT INTO wiki_entities_fts(wiki_entities_fts, rowid, title, content, tags) VALUES('delete', old.id, old.title, old.content, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS wiki_entities_au AFTER UPDATE ON wiki_entities BEGIN
      INSERT INTO wiki_entities_fts(wiki_entities_fts, rowid, title, content, tags) VALUES('delete', old.id, old.title, old.content, old.tags);
      INSERT INTO wiki_entities_fts(rowid, title, content, tags) VALUES (new.id, new.title, new.content, new.tags);
    END;
  `);
} catch (e) {
  console.error('[DB] Wiki FTS5 트리거 생성 실패:', e.message);
}

// 마이그레이션: 기존 사용자 테이블에 is_bot 컬럼 추가 (없을 경우에만)
try {
  db.exec('ALTER TABLE users ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0');
} catch (_) { /* 이미 존재하면 무시 */ }

// 마이그레이션: bots.ai_type CHECK 제약에 openclaw 추가
// SQLite는 CHECK 제약을 직접 변경할 수 없으므로 테이블 재생성 방식 사용
try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='bots'").get();
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'openclaw'")) {
    db.exec(`
      BEGIN;
      CREATE TABLE bots_new (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL,
        room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        token_hash  TEXT    NOT NULL UNIQUE,
        ai_type     TEXT    NOT NULL CHECK(ai_type IN ('hermes','claude','claude-code','openclaw')),
        is_active   INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
      INSERT INTO bots_new SELECT id, name, room_id, token_hash, ai_type, is_active, created_at FROM bots;
      DROP TABLE bots;
      ALTER TABLE bots_new RENAME TO bots;
      CREATE INDEX IF NOT EXISTS idx_bots_token_hash ON bots(token_hash);
      CREATE INDEX IF NOT EXISTS idx_bots_room_id    ON bots(room_id);
      COMMIT;
    `);
    console.log('[DB] bots.ai_type CHECK 제약 마이그레이션 완료 (openclaw 추가)');
  }
} catch (e) {
  console.error('[DB] bots 마이그레이션 실패:', e.message);
}

// ── thread_messages 첨부파일 컬럼 마이그레이션 (007-thread-attachments) ──
try {
  const cols = db.prepare("PRAGMA table_info(thread_messages)").all().map(c => c.name);
  if (!cols.includes('attachment_url')) {
    db.exec(`
      ALTER TABLE thread_messages ADD COLUMN attachment_url TEXT;
      ALTER TABLE thread_messages ADD COLUMN attachment_mime TEXT;
      ALTER TABLE thread_messages ADD COLUMN attachment_size INTEGER;
      ALTER TABLE thread_messages ADD COLUMN attachment_original_name TEXT;
    `);
    console.log('[DB] thread_messages 첨부파일 컬럼 마이그레이션 완료');
  }
} catch (e) {
  console.error('[DB] thread_messages 마이그레이션 실패:', e.message);
}
// ── categories parent_id 컬럼 마이그레이션 (008-category-tree) ──
try {
  const cols = db.prepare("PRAGMA table_info(categories)").all().map(c => c.name);
  if (!cols.includes('parent_id')) {
    db.exec(`ALTER TABLE categories ADD COLUMN parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL`);
    console.log('[DB] categories parent_id 컬럼 마이그레이션 완료');
  }
} catch (e) {
  console.error('[DB] categories 마이그레이션 실패:', e.message);
}

// 봇 사용자 시드 (서버 시작 시 없으면 자동 생성)
db.prepare(`
  INSERT OR IGNORE INTO users (google_id, email, display_name, avatar_url, is_bot)
  VALUES (NULL, 'bot@mytok.local', 'MyTok 봇', NULL, 1)
`).run();

// DB 파일 권한 설정 (Unix/macOS only)
if (process.platform !== 'win32') {
  try {
    fs.chmodSync(DB_PATH, 0o600);
  } catch (_) { /* 파일이 아직 없으면 무시 */ }
}

export default db;
