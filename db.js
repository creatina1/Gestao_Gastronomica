const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDirectory = path.join(__dirname, 'data');
const databasePath = path.join(dataDirectory, 'app.db');

function initDb() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory);
  }

  const db = new sqlite3.Database(databasePath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS manager_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'gerente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.all('PRAGMA table_info(manager_permissions)', [], (err, rows) => {
      if (!err) {
        const hasRoleColumn = rows.some((row) => row.name === 'role');
        if (!hasRoleColumn) {
          db.run('ALTER TABLE manager_permissions ADD COLUMN role TEXT NOT NULL DEFAULT "gerente"');
        }
      }
    });

    db.run(
      'INSERT OR IGNORE INTO manager_permissions (email, role) VALUES (?, ?)',
      ['joaopaulobarbosafernandesmonte@gmail.com', 'admin']
    );

    db.run(
      'UPDATE manager_permissions SET role = ? WHERE email = ?',
      ['admin', 'joaopaulobarbosafernandesmonte@gmail.com']
    );

    db.run(
      'UPDATE users SET role = CASE WHEN email = ? THEN "admin" ELSE "user" END',
      ['joaopaulobarbosafernandesmonte@gmail.com']
    );

    db.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        available INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        table_number TEXT,
        status TEXT NOT NULL DEFAULT 'Pendente',
        total REAL NOT NULL,
        items TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'un',
        category TEXT,
        min_quantity REAL NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  db.close();
}

function getDb() {
  return new sqlite3.Database(databasePath);
}

module.exports = { initDb, getDb };
