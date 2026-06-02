const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { generateToken, authenticateToken } = require('../auth');

const router = express.Router();
const managerEmail = 'joaopaulobarbosafernandesmonte@gmail.com';
const normalizedManagerEmail = managerEmail.trim().toLowerCase();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);
  const db = getDb();

  db.get('SELECT role FROM manager_permissions WHERE email = ?', [normalizedEmail], (err, row) => {
    if (err) {
      db.close();
      return res.status(500).json({ message: 'Erro ao verificar permissões.' });
    }

    const role = normalizedEmail === normalizedManagerEmail ? 'admin' : row?.role || 'user';

    db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, normalizedEmail, hashedPassword, role],
      function (insertErr) {
        if (insertErr) {
          if (insertErr.message.includes('UNIQUE')) {
            db.close();
            return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
          }
          db.close();
          return res.status(500).json({ message: 'Erro ao criar usuário.' });
        }

        const user = {
          id: this.lastID,
          name,
          email: normalizedEmail,
          role,
        };
        const token = generateToken(user);
        res.json({ user, token });
      }
    );
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail], async (err, user) => {
    if (err) {
      db.close();
      return res.status(500).json({ message: 'Erro ao buscar usuário.' });
    }
    if (!user) {
      db.close();
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      db.close();
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    const token = generateToken(user);
    db.close();
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  });
});

router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.get('/manager-permissions', authenticateToken, (req, res) => {
  const currentEmail = req.user.email?.trim().toLowerCase();
  if (currentEmail !== normalizedManagerEmail) {
    return res.status(403).json({ message: 'Apenas o gerente principal pode acessar esta lista.' });
  }

  const db = getDb();
  db.all('SELECT email, role FROM manager_permissions ORDER BY email', [], (err, rows) => {
    db.close();
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar permissões de gerente.' });
    }
    res.json(rows);
  });
});

router.post('/manager-permissions', authenticateToken, (req, res) => {
  const currentEmail = req.user.email?.trim().toLowerCase();
  if (currentEmail !== normalizedManagerEmail) {
    return res.status(403).json({ message: 'Apenas o gerente principal pode conceder acesso.' });
  }

  let { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ message: 'E-mail e papel são obrigatórios.' });
  }
  email = email.trim().toLowerCase();
  if (email === normalizedManagerEmail) {
    return res.status(400).json({ message: 'O gerente principal já possui acesso completo.' });
  }

  const allowedRoles = ['gerente', 'atendimento', 'cozinha'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Papel inválido. Use gerente, atendimento ou cozinha.' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO manager_permissions (email, role) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role',
    [email, role],
    function (err) {
      if (err) {
        db.close();
        return res.status(500).json({ message: 'Erro ao conceder acesso.' });
      }

      db.run('UPDATE users SET role = ? WHERE email = ?', [role, email], (updateErr) => {
        db.close();
        if (updateErr) {
          return res.status(500).json({ message: 'Erro ao atualizar usuário existente.' });
        }
        res.json({ message: `Acesso de ${role} liberado para ${email}.` });
      });
    }
  );
});

router.delete('/manager-permissions', authenticateToken, (req, res) => {
  const currentEmail = req.user.email?.trim().toLowerCase();
  if (currentEmail !== normalizedManagerEmail) {
    return res.status(403).json({ message: 'Apenas o gerente principal pode revogar acesso.' });
  }

let { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'E-mail é obrigatório.' });
    }
    email = email.trim().toLowerCase();
    if (email === normalizedManagerEmail) {
    return res.status(400).json({ message: 'O gerente principal não pode ser revogado.' });
  }

  const db = getDb();
  db.run('DELETE FROM manager_permissions WHERE email = ?', [email], function (err) {
    if (err) {
      db.close();
      return res.status(500).json({ message: 'Erro ao revogar acesso de gerente.' });
    }

    db.run('UPDATE users SET role = ? WHERE email = ?', ['user', email], (updateErr) => {
      db.close();
      if (updateErr) {
        return res.status(500).json({ message: 'Erro ao atualizar usuário existente.' });
      }
      res.json({ message: `Acesso de gerente removido de ${email}.` });
    });
  });
});

module.exports = router;
