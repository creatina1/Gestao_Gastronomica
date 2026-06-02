const express = require('express');
const { getDb } = require('../db');

const router = express.Router();
const kitchenRoles = ['admin', 'gerente', 'cozinha'];

router.get('/', (req, res) => {
  if (!kitchenRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado ao estoque.' });
  }

  const db = getDb();
  db.all('SELECT * FROM inventory ORDER BY updated_at DESC', [], (err, rows) => {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar estoque.' });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  if (!kitchenRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas cozinha, gerentes ou administradores podem cadastrar itens de estoque.' });
  }

  const { name, quantity, unit, category, min_quantity } = req.body;
  if (!name || quantity === undefined || quantity === null) {
    return res.status(400).json({ message: 'Nome e quantidade são obrigatórios.' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO inventory (name, quantity, unit, category, min_quantity) VALUES (?, ?, ?, ?, ?)',
    [name, Number(quantity), unit || 'un', category || 'Ingredientes', Number(min_quantity) || 0],
    function (err) {
      db.close();
      if (err) {
        return res.status(500).json({ message: 'Erro ao cadastrar item de estoque.' });
      }
      res.json({ id: this.lastID, name, quantity: Number(quantity), unit: unit || 'un', category: category || 'Ingredientes', min_quantity: Number(min_quantity) || 0 });
    }
  );
});

router.put('/:id', (req, res) => {
  if (!kitchenRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas cozinha, gerentes ou administradores podem editar estoque.' });
  }

  const { id } = req.params;
  const { name, quantity, unit, category, min_quantity } = req.body;
  if (!name || quantity === undefined || quantity === null) {
    return res.status(400).json({ message: 'Nome e quantidade são obrigatórios.' });
  }

  const db = getDb();
  db.run(
    'UPDATE inventory SET name = ?, quantity = ?, unit = ?, category = ?, min_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, Number(quantity), unit || 'un', category || 'Ingredientes', Number(min_quantity) || 0, id],
    function (err) {
      db.close();
      if (err) {
        return res.status(500).json({ message: 'Erro ao atualizar item de estoque.' });
      }
      res.json({ id: Number(id), name, quantity: Number(quantity), unit: unit || 'un', category: category || 'Ingredientes', min_quantity: Number(min_quantity) || 0 });
    }
  );
});

router.delete('/:id', (req, res) => {
  if (!kitchenRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas cozinha, gerentes ou administradores podem excluir estoque.' });
  }

  const { id } = req.params;
  const db = getDb();
  db.run('DELETE FROM inventory WHERE id = ?', [id], function (err) {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao excluir item do estoque.' });
    }
    res.json({ message: 'Item de estoque removido com sucesso.' });
  });
});

module.exports = router;
