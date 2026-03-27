import sqlite3 from 'sqlite3';
import config from '../config/index.js';

const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Campaigns table
    db.run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY,
        creator TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        goal TEXT NOT NULL,
        deadline INTEGER NOT NULL,
        raised_amount TEXT DEFAULT '0',
        state INTEGER DEFAULT 0,
        milestone_count INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Milestones table
    db.run(`
      CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        milestone_index INTEGER NOT NULL,
        description TEXT NOT NULL,
        amount TEXT NOT NULL,
        state INTEGER DEFAULT 0,
        yes_votes INTEGER DEFAULT 0,
        no_votes INTEGER DEFAULT 0,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        UNIQUE(campaign_id, milestone_index)
      )
    `);

    // Contributions table
    db.run(`
      CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        contributor TEXT NOT NULL,
        amount TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tx_hash TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      )
    `);

    // Events table (for tracking indexed events)
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_name TEXT NOT NULL,
        campaign_id INTEGER,
        block_number INTEGER NOT NULL,
        tx_hash TEXT NOT NULL,
        data TEXT,
        timestamp INTEGER NOT NULL,
        UNIQUE(tx_hash, event_name)
      )
    `);

    // Sync status table
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_synced_block INTEGER DEFAULT 0,
        last_synced_at INTEGER
      )
    `);

    // Initialize sync status if not exists
    db.run(`INSERT OR IGNORE INTO sync_status (id, last_synced_block) VALUES (1, 0)`);

    // Create indexes for better query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaigns_state ON campaigns(state)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON contributions(campaign_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_contributions_contributor ON contributions(contributor)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_campaign ON events(campaign_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number)`);
  });
}

export function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export default db;
