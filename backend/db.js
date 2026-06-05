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

  const closeDb = () => {
    db.close((closeErr) => {
      if (closeErr) {
        console.error('Erro ao fechar o banco de dados:', closeErr);
      }
    });
  };

  const completeSetup = () => {
    // Seed nome do restaurante e número de mesas
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('restaurant_name', 'Churrascaria Sangue na Brasa')`, () => {});
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('table_count', '15')`, () => {});

    // Migração: adicionar image_url se não existir
    db.all('PRAGMA table_info(menu_items)', [], (err, cols) => {
      if (!err && cols && !cols.some((c) => c.name === 'image_url')) {
        db.run('ALTER TABLE menu_items ADD COLUMN image_url TEXT', () => {});
      }
    });

    // Seed itens de exemplo (só insere se o cardápio estiver vazio)
    db.get('SELECT COUNT(*) as count FROM menu_items', [], (err, row) => {
      if (!err && row.count === 0) {
        const items = [
          ['Picanha na Brasa', 'Picanha maturada grelhada no carvão, acompanha vinagrete e farofa', 89.90, 'Prato principal', 1],
          ['Costela Assada', 'Costela bovina assada lentamente por 12h, desfiada na hora', 75.00, 'Prato principal', 1],
          ['Frango à Parmegiana', 'Filé de frango empanado com molho de tomate e queijo gratinado', 52.00, 'Prato principal', 1],
          ['Linguiça Artesanal', 'Linguiça toscana grelhada com pimentões e cebola', 38.50, 'Porção', 1],
          ['Carne de Sol com Macaxeira', 'Carne de sol grelhada com macaxeira cozida e manteiga', 64.00, 'Prato principal', 1],
          ['Fraldinha Grelhada', 'Fraldinha temperada na brasa com alho e ervas', 72.00, 'Prato principal', 1],
          ['Salada Caesar', 'Alface romana, croutons, parmesão e molho caesar', 28.00, 'Salada', 1],
          ['Salada Mista', 'Mix de folhas, tomate cereja, pepino e cenoura ralada', 22.00, 'Salada', 1],
          ['Pão de Alho', 'Pão francês com manteiga de alho e ervas, gratinado', 18.00, 'Entrada', 1],
          ['Caldo de Mocotó', 'Caldo tradicional de mocotó com temperos da casa', 25.00, 'Entrada', 1],
          ['Pudim de Leite', 'Pudim cremoso de leite condensado com calda de caramelo', 16.00, 'Sobremesa', 1],
          ['Petit Gateau', 'Bolinho de chocolate quente com sorvete de creme', 24.00, 'Sobremesa', 1],
          ['Mousse de Maracujá', 'Mousse aerado de maracujá com calda de frutas', 18.00, 'Sobremesa', 1],
          ['Cerveja Artesanal 600ml', 'Cerveja artesanal tipo Lager gelada', 22.00, 'Bebida alcoólica', 1],
          ['Caipirinha de Limão', 'Caipirinha com cachaça premium, limão e açúcar', 19.00, 'Bebida alcoólica', 1],
          ['Caipiroska de Morango', 'Caipiroska com vodka, morango fresco e limão', 21.00, 'Bebida alcoólica', 1],
          ['Vinho Tinto Taça', 'Taça de vinho tinto seco importado', 28.00, 'Bebida alcoólica', 1],
          ['Suco de Laranja Natural', 'Suco de laranja espremido na hora, 500ml', 14.00, 'Bebida não alcoólica', 1],
          ['Suco de Maracujá', 'Suco cremoso de maracujá com leite, 400ml', 13.00, 'Bebida não alcoólica', 1],
          ['Refrigerante Lata', 'Coca-Cola, Guaraná Antarctica ou Sprite, 350ml', 8.00, 'Bebida não alcoólica', 1],
          ['Água Mineral 500ml', 'Água mineral com ou sem gás', 5.00, 'Bebida não alcoólica', 1],
          ['Combo Churrasco Família', 'Picanha + Costela + Linguiça + 4 acompanhamentos', 189.00, 'Prato executivo', 1],
          ['Combo Executivo', 'Frango ou fraldinha + salada + sobremesa + bebida', 59.00, 'Prato executivo', 1],
        ];
        const stmt = db.prepare(
          'INSERT INTO menu_items (name, description, price, category, available) VALUES (?, ?, ?, ?, ?)'
        );
        items.forEach((item) => stmt.run(item));
        stmt.finalize();
      }
    });

    db.run(
      'INSERT OR IGNORE INTO manager_permissions (email, role) VALUES (?, ?)',
      ['joaopaulobarbosafernandesmonte@gmail.com', 'admin'],
      (insertErr) => {
        if (insertErr) {
          console.error('Erro ao inserir permissão inicial:', insertErr);
          return closeDb();
        }

        db.run(
          'UPDATE manager_permissions SET role = ? WHERE email = ?',
          ['admin', 'joaopaulobarbosafernandesmonte@gmail.com'],
          (updateManagerErr) => {
            if (updateManagerErr) {
              console.error('Erro ao atualizar permissão inicial:', updateManagerErr);
              return closeDb();
            }

            db.run(
              'UPDATE users SET role = CASE WHEN email = ? THEN "admin" ELSE "user" END',
              ['joaopaulobarbosafernandesmonte@gmail.com'],
              (updateUsersErr) => {
                if (updateUsersErr) {
                  console.error('Erro ao atualizar papel do usuário inicial:', updateUsersErr);
                }
                closeDb();
              }
            );
          }
        );
      }
    );
  };

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

    db.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        available INTEGER NOT NULL DEFAULT 1,
        image_url TEXT,
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
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
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

    db.all('PRAGMA table_info(manager_permissions)', [], (err, rows) => {
      if (!err) {
        const hasRoleColumn = rows.some((row) => row.name === 'role');
        if (!hasRoleColumn) {
          db.run('ALTER TABLE manager_permissions ADD COLUMN role TEXT NOT NULL DEFAULT "gerente"', (alterErr) => {
            if (alterErr) {
              console.error('Erro ao adicionar coluna role:', alterErr);
              return closeDb();
            }
            completeSetup();
          });
        } else {
          completeSetup();
        }
      } else {
        completeSetup();
      }
    });
  });
}

function getDb() {
  return new sqlite3.Database(databasePath);
}

module.exports = { initDb, getDb };
