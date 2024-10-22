// src/storeTransactions.js

const db = require('../db/database');

async function storeTransactions(transactions) {
  for (const tx of transactions) {
    const signature = tx.signature;
    const slot = tx.slot;
    const blockTime = tx.blocktime ? new Date(tx.blocktime * 1000) : null;
    const success = tx.errors.length === 0;
    const error = tx.errors.length > 0 ? JSON.stringify(tx.errors) : null;
    const rawTransaction = tx;

    try {
      await db.query(
        `INSERT INTO transactions (signature, slot, block_time, success, error, raw_transaction)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (signature) DO NOTHING`,
        [signature, slot, blockTime, success, error, rawTransaction]
      );
      console.log(`Stored transaction ${signature}`);
    } catch (err) {
      console.error(`Error storing transaction ${signature}:`, err);
    }
  }
}

module.exports = { storeTransactions };
