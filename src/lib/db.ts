import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dairy.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS Members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    joined_date TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS Milk_Collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    shift TEXT NOT NULL,
    member_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    fat_percentage REAL NOT NULL,
    rate REAL NOT NULL,
    total_amount REAL NOT NULL,
    FOREIGN KEY (member_id) REFERENCES Members(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS Debit_Entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    member_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (member_id) REFERENCES Members(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS Product_Requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    requested_at TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES Members(id) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_members_name ON Members(name);
  CREATE INDEX IF NOT EXISTS idx_members_code ON Members(member_code);
  CREATE INDEX IF NOT EXISTS idx_collection_date ON Milk_Collection(date);
  CREATE INDEX IF NOT EXISTS idx_collection_member_date ON Milk_Collection(member_id, date);
  CREATE INDEX IF NOT EXISTS idx_debit_member_date ON Debit_Entries(member_id, date);
  CREATE INDEX IF NOT EXISTS idx_request_status_date ON Product_Requests(status, requested_at);
`);

ensureColumn('Product_Requests', 'response_note', 'TEXT');
ensureColumn('Product_Requests', 'processed_at', 'TEXT');

export default db;

function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    } catch (error) {
      if (
        !(
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string' &&
          error.message.includes(`duplicate column name: ${columnName}`)
        )
      ) {
        throw error;
      }
    }
  }
}
