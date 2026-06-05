const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const settingsRoutes = require('./routes/settings');
const { authenticateToken } = require('./auth');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:4000', 'http://localhost:4001', 'http://localhost:5173', 'http://localhost:5174']
}));
app.use(express.json());

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/menu', authenticateToken, menuRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'API do sistema gastronômico está rodando' });
});

// Serve frontend estático em produção
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

function startServer(port, attemptsLeft = 5) {
  const server = app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Porta ${port} ocupada. Tentando porta ${port + 1}...`);
      server.close(() => {
        if (attemptsLeft > 0) {
          startServer(port + 1, attemptsLeft - 1);
        } else {
          console.error('Não foi possível iniciar o servidor: sem portas disponíveis.');
          process.exit(1);
        }
      });
    } else {
      console.error('Erro no servidor:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);
