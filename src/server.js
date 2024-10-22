require('dotenv').config();
const express = require('express');
const { pool } = require('../db/database');
const app = express();
const PORT = 3000;

app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trades ORDER BY timestamp DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.status(500).send('Error fetching trades data');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
