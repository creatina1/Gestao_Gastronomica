const express = require('express');
const { getDb } = require('../db');

const router = express.Router();
const orderRoles = ['admin', 'gerente', 'atendimento'];
const kitchenRoles = ['admin', 'gerente', 'cozinha'];

router.get('/', (req, res) => {
  if (!orderRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado aos pedidos.' });
  }

  const db = getDb();
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar pedidos.' });
    }
    res.json(rows.map((row) => ({ ...row, items: JSON.parse(row.items) })));
  });
});

router.get('/kitchen', (req, res) => {
  if (!kitchenRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado ao telão da cozinha.' });
  }

  const db = getDb();
  db.all('SELECT * FROM orders WHERE status != ? ORDER BY created_at DESC', ['Concluído'], (err, rows) => {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar pedidos da cozinha.' });
    }
    res.json(rows.map((row) => ({ ...row, items: JSON.parse(row.items) })));
  });
});

router.post('/', (req, res) => {
  if (!orderRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas atendimento, gerentes ou administradores podem criar pedidos.' });
  }

  const { customer_name, table_number, items, total, status } = req.body;
  if (!customer_name || !items || !Array.isArray(items) || items.length === 0 || !total) {
    return res.status(400).json({ message: 'Dados do pedido incompletos.' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO orders (customer_name, table_number, items, total, status) VALUES (?, ?, ?, ?, ?)',
    [customer_name, table_number || '', JSON.stringify(items), Number(total), status || 'Pendente'],
    function (err) {
      db.close();
      if (err) {
        return res.status(500).json({ message: 'Erro ao criar pedido.' });
      }
      res.json({ id: this.lastID, customer_name, table_number, items, total: Number(total), status: status || 'Pendente' });
    }
  );
});

router.put('/:id', (req, res) => {
  if (!orderRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Apenas atendimento, gerentes ou administradores podem atualizar pedidos.' });
  }

  const { id } = req.params;
  const { status } = req.body;
  const db = getDb();

  db.run('UPDATE orders SET status = ? WHERE id = ?', [status || 'Concluído', id], function (err) {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao atualizar pedido.' });
    }
    res.json({ id: Number(id), status: status || 'Concluído' });
  });
});

module.exports = router;
