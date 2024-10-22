// src/main.js

require('dotenv').config();
const { retrieveTransactions } = require('./retrieveTransactions');

(async () => {
  try {
    // Fetch and log the latest transactions
    await retrieveTransactions();

    console.log('Latest transaction retrieval and logging complete.');
    process.exit(0);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
})();
