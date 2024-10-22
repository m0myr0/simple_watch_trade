// src/retrieveTransactionsHelius.js

require('dotenv').config();
const axios = require('axios');
const { log } = require('../utils/logger');

async function retrieveTransactionsHelius() {
  const targetWallets = process.env.TARGET_WALLETS.split(',').map((address) => address.trim());
  const transactionLimit = parseInt(process.env.TRANSACTION_LIMIT, 10) || 10;
  const apiKey = process.env.HELIUS_API_KEY;
  const allTransactions = [];

  for (const walletAddress of targetWallets) {
    log(`Fetching transactions for wallet: ${walletAddress}`);

    // Prepare the request URL
    const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${apiKey}`;

    // Prepare request parameters
    const params = {
      limit: transactionLimit,
      before: '', // Use for pagination if needed
    };

    try {
      const response = await axios.get(url, { params });
      const transactions = response.data;

      log(`Fetched ${transactions.length} transactions for wallet ${walletAddress}`);

      // Log each transaction
      transactions.forEach((transaction) => {
        const signature = transaction.signature;
        log(`Transaction details for signature ${signature}:\n${JSON.stringify(transaction, null, 2)}`);
        allTransactions.push(transaction);
      });
    } catch (error) {
      log(`Error fetching transactions for wallet ${walletAddress}: ${error.response ? error.response.data : error.message}`);
    }
  }

  return allTransactions;
}

module.exports = { retrieveTransactionsHelius };
