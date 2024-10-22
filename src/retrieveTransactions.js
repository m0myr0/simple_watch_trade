// src/retrieveTransactions.js

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const { log } = require('../utils/logger');
const { parseTransaction } = require('./parseTransaction'); // Import the parseTransaction function

const rpcUrl = process.env.RPC_URL;
const connection = new Connection(rpcUrl, 'confirmed');
const solscanApiKey = process.env.SOLSCAN_API_KEY;

async function retrieveTransactions() {
  const targetWallets = process.env.TARGET_WALLETS.split(',').map((address) => address.trim());
  const transactionLimit = 1; // Fetch only the latest transaction

  for (const walletAddress of targetWallets) {
    const publicKey = new PublicKey(walletAddress);
    log(`Fetching the latest transaction for wallet: ${walletAddress}`);

    // Fetch signatures
    let signatures;
    try {
      signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: transactionLimit,
      });
      if (signatures.length === 0) {
        log(`No transactions found for wallet ${walletAddress}`);
        continue;
      }
      const signature = signatures[0].signature;
      log(`Found signature for wallet ${walletAddress}: ${signature}`);
      
      // Fetch transaction details using Solana connection
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (transaction) {
        log(`Transaction details for signature ${signature}:\n${JSON.stringify(transaction, null, 2)}`);

        // Parse the transaction
        const parsedData = parseTransaction(transaction);
        log(`Parsed transaction data for signature ${signature}:\n${JSON.stringify(parsedData, null, 2)}`);

        // Use Solscan API for additional details if required
        const solscanData = await fetchTransactionFromSolscan(signature);
        if (solscanData) {
          log(`Additional Solscan transaction data for signature ${signature}:\n${JSON.stringify(solscanData, null, 2)}`);
        }
      } else {
        log(`Transaction not found for signature: ${signature}`);
      }
    } catch (error) {
      log(`Error fetching data for wallet ${walletAddress}: ${error.message}`);
    }
  }
}

// Fetch transaction details using Solscan API
// Fetch transaction details using Solscan API
async function fetchTransactionFromSolscan(signature) {
  const solscanUrl = `https://pro-api.solscan.io/v2/transaction/${signature}`;

  try {
    const response = await axios.get(solscanUrl, {
      headers: {
        Authorization: `Bearer ${solscanApiKey}`,
      },
    });

    if (response.status === 200) {
      return response.data;
    } else {
      log(`Solscan API returned non-200 status: ${response.status} - ${response.statusText}`);
      return null;
    }
  } catch (error) {
    log(`Error fetching transaction details from Solscan: ${error.message}`);
    if (error.response) {
      log(`Solscan API response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}
module.exports = { retrieveTransactions };
