import { Database } from 'bun:sqlite';
import session from 'express-session';

/**
 * bun:sqlite 기반 express-session 스토어
 * connect-sqlite3 대체. 세션 데이터를 SQLite에 영구 저장한다.
 */
class BunSqliteStore extends session.Store {
  constructor(options = {}) {
    super();
    const filename = options.filename || 'sessions.db';
    this.db = new Database(filename);
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid     TEXT PRIMARY KEY,
        sess    TEXT NOT NULL,
        expired INTEGER NOT NULL
      )
    `);

    // 만료 세션 정리 (기본 15분 간격)
    const cleanupInterval = options.cleanupInterval || 15 * 60 * 1000;
    this._cleanup = setInterval(() => {
      try {
        this.db.prepare('DELETE FROM sessions WHERE expired < ?').run(Date.now());
      } catch (_) {}
    }, cleanupInterval);
  }

  get(sid, cb) {
    try {
      const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?').get(sid, Date.now());
      if (!row) return cb(null, null);
      cb(null, JSON.parse(row.sess));
    } catch (e) {
      cb(e);
    }
  }

  set(sid, sess, cb) {
    try {
      const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
      const expired = Date.now() + maxAge;
      this.db.prepare(
        'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)'
      ).run(sid, JSON.stringify(sess), expired);
      cb && cb(null);
    } catch (e) {
      cb && cb(e);
    }
  }

  destroy(sid, cb) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      cb && cb(null);
    } catch (e) {
      cb && cb(e);
    }
  }

  touch(sid, sess, cb) {
    try {
      const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
      const expired = Date.now() + maxAge;
      this.db.prepare('UPDATE sessions SET expired = ? WHERE sid = ?').run(expired, sid);
      cb && cb(null);
    } catch (e) {
      cb && cb(e);
    }
  }

  close() {
    clearInterval(this._cleanup);
    this.db.close();
  }
}

export default BunSqliteStore;
