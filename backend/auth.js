const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gastronomia-secreta-2026';

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: '8h',
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não encontrado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }

    req.user = user;
    next();
  });
}

module.exports = { generateToken, authenticateToken, JWT_SECRET };
