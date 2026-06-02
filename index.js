const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const { authenticateToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/menu', authenticateToken, menuRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'API do sistema gastronômico está rodando' });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
