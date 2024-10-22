require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logToFile = require('../logger'); // Assuming logger is at the root level.

const walletPublicKey = process.env.WALLET_PUBLIC_KEY;
const rpcUrl = process.env.RPC_URL;
const transactionLimit = process.env.TRANSACTION_LIMIT;

async function fetchTransactions(walletPublicKey, limit) {
  try {
    const requestData = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [walletPublicKey, { limit: limit }]
    };

    const response = await axios.post(rpcUrl, requestData);
    if (response.data && response.data.result) {
      return response.data.result;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    const errorMsg = `Error fetching transactions: ${error.message}`;
    logToFile('logs/errors.log', errorMsg);
    console.error(errorMsg);
    return [];
  }
}

async function watchWallet(walletPublicKey) {
  console.log(`Watching wallet: ${walletPublicKey}`);
  logToFile('logs/app.log', `Watching wallet: ${walletPublicKey}`);

  const transactions = await fetchTransactions(walletPublicKey, transactionLimit);

  if (transactions.length > 0) {
    const transactionsFilePath = path.join(__dirname, '../../transactions.json');
    fs.writeFileSync(transactionsFilePath, JSON.stringify(transactions, null, 2));
    logToFile('logs/app.log', `Fetched ${transactions.length} transactions successfully.`);
    console.log(`Fetched ${transactions.length} transactions successfully.`);
  } else {
    const noTxMsg = 'No transactions fetched. Please check the RPC endpoint or wallet address.';
    logToFile('logs/app.log', noTxMsg);
    console.log(noTxMsg);
  }
}

module.exports = watchWallet;
