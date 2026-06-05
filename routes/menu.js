const express = require('express');
const { getDb } = require('../db');

const router = express.Router();
const adminRoles = ['admin', 'gerente'];
const menuRoles = ['admin', 'gerente', 'atendimento', 'user'];

router.get('/', (req, res) => {
  if (!menuRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado ao cardápio.' });
  }

  const query = ['admin', 'gerente'].includes(req.user.role)
    ? 'SELECT * FROM menu_items ORDER BY created_at DESC'
    : 'SELECT * FROM menu_items WHERE available = 1 ORDER BY created_at DESC';

  const db = getDb();
  db.all(query, [], (err, rows) => {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar itens do cardápio.' });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas administradores ou gerentes podem criar itens.' });
  }

  const { name, description, price, category, available, image_url } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Nome e preço são obrigatórios.' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO menu_items (name, description, price, category, available, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || '', Number(price), category || 'Principal', available ? 1 : 0, image_url || null],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ message: 'Erro ao criar item.' });
      res.json({ id: this.lastID, name, description, price: Number(price), category, available: available ? 1 : 0, image_url: image_url || null });
    }
  );
});

router.put('/:id', (req, res) => {
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas administradores ou gerentes podem editar itens.' });
  }

  const { id } = req.params;
  const { name, description, price, category, available, image_url } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Nome e preço são obrigatórios.' });
  }

  const db = getDb();
  db.run(
    'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, available = ?, image_url = ? WHERE id = ?',
    [name, description || '', Number(price), category || 'Principal', available ? 1 : 0, image_url || null, id],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ message: 'Erro ao atualizar item.' });
      res.json({ id: Number(id), name, description, price: Number(price), category, available: available ? 1 : 0, image_url: image_url || null });
    }
  );
});

router.delete('/:id', (req, res) => {
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas administradores ou gerentes podem excluir itens.' });
  }

  const { id } = req.params;
  const db = getDb();
  db.run('DELETE FROM menu_items WHERE id = ?', [id], function (err) {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao excluir item.' });
    }
    res.json({ message: 'Item removido com sucesso.' });
  });
});

module.exports = router;
