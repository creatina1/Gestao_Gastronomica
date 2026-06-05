const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Qualquer usuário autenticado pode ler as configurações públicas
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ message: 'Erro ao buscar configurações.' });
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  });
});

// Só admin pode alterar
router.put('/', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas o administrador pode alterar configurações.' });
  }
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ message: 'Chave e valor são obrigatórios.' });
  }
  const db = getDb();
  db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ message: 'Erro ao salvar configuração.' });
      res.json({ key, value });
    }
  );
});

module.exports = router;
