// src/retrieveTransactions.js

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const { log } = require('../utils/logger');
const { parseTransaction } = require('./parseTransaction'); // Import the parseTransaction function

const rpcUrl = process.env.RPC_URL;
const connection = new Connection(rpcUrl, 'confirmed');

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
      log(`Found signature for wallet ${walletAddress}: ${signatures[0].signature}`);
    } catch (error) {
      log(`Error fetching signatures for wallet ${walletAddress}: ${error}`);
      continue;
    }

    // Fetch transaction details
    const signatureInfo = signatures[0];
    const signature = signatureInfo.signature;
    log(`Fetching transaction details for signature: ${signature}`);

    try {
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (transaction) {
        // Log the transaction details to app.log
        log(`Transaction details for signature ${signature}:\n${JSON.stringify(transaction, null, 2)}`);

        // Parse the transaction
        const parsedData = parseTransaction(transaction);

        // Log the parsed data
        log(`Parsed transaction data for signature ${signature}:\n${JSON.stringify(parsedData, null, 2)}`);
      } else {
        log(`Transaction not found for signature: ${signature}`);
      }
    } catch (error) {
      log(`Error fetching transaction ${signature}: ${error}`);
    }
  }
}

module.exports = { retrieveTransactions };
