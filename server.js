const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====================
// Base de datos (persistente)
// ====================
const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, 'inventory.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Mejor concurrencia y menos corrupción ante reinicios
  db.run("PRAGMA journal_mode=WAL;");

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insertar data de ejemplo solo si está vacío
  db.get('SELECT COUNT(*) AS c FROM products', [], (err, row) => {
    if (err) {
      console.error('Error checking seed:', err.message);
      return;
    }
    if ((row?.c || 0) === 0) {
      const sampleProducts = [
        ['Laptop Pro', 'Electronics', 15, 1299.99, 'High-performance laptop'],
        ['Wireless Mouse', 'Electronics', 45, 29.99, 'Ergonomic wireless mouse'],
        ['Office Chair', 'Furniture', 8, 199.99, 'Comfortable office chair'],
        ['Coffee Beans', 'Food', 120, 12.99, 'Premium coffee beans'],
        ['Notebook Set', 'Office Supplies', 200, 8.99, 'Pack of 3 notebooks']
      ];
      const stmt = db.prepare(
        'INSERT INTO products (name, category, quantity, price, description) VALUES (?, ?, ?, ?, ?)'
      );
      sampleProducts.forEach(product => stmt.run(product));
      stmt.finalize();
    }
  });
});

// ====================
// API Routes
// ====================
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

app.post('/api/products', (req, res) => {
  const { name, category, quantity, price, description } = req.body;

  if (!name || !category || quantity === undefined || price === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    'INSERT INTO products (name, category, quantity, price, description) VALUES (?, ?, ?, ?, ?)',
    [name, category, quantity, price, description],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Product created successfully' });
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, price, description } = req.body;

  db.run(
    'UPDATE products SET name = ?, category = ?, quantity = ?, price = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, category, quantity, price, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
      res.json({ message: 'Product updated successfully' });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  db.all(
    `
    SELECT 
      COUNT(*) as total_products,
      SUM(quantity) as total_items,
      COUNT(DISTINCT category) as categories,
      SUM(quantity * price) as total_value
    FROM products
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0]);
    }
  );
});

// Healthcheck
app.get('/health', (_req, res) => res.status(200).send('OK'));

// Server (bind 0.0.0.0 para AWS)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Cierre limpio
const shutdown = () => {
  console.log('Shutting down...');
  server.close(() => db.close(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
