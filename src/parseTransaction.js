// src/parseTransaction.js

// Import necessary modules
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const EXCHANGE_PROGRAM_IDS = [
  "9xQeWvG816bUx9EPjHpxgXB1k1SgEKnyL7m7VFSqkWfN", // Serum DEX v3
  "RVKd61ztZW9wL38L723QfD9xq4keqv5NjvQh5Rrkvh",   // Raydium Liquidity Pool
  // Add other relevant exchange program IDs
];
const fs = require('fs');
const path = require('path');
const parsedLogPath = path.join(__dirname, '../logs/parsed.log');

function logParsedData(parsedData) {
  const logEntry = `[${new Date().toISOString()}] Parsed Data: ${JSON.stringify(parsedData, null, 2)}\n`;
  fs.appendFile(parsedLogPath, logEntry, (err) => {
    if (err) {
      console.error('Error logging parsed data:', err);
    }
  });
}

// Function to parse a transaction
function parseTransaction(transaction) {
  if (!transaction) return null;

  const parsedData = {
    transactionId: transaction.transaction.signatures[0],  // Include the transaction ID
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    fee: transaction.meta?.fee || 0,
    transactionType: "Unknown",  // Placeholder, will update below
    tokens: [],
    pairs: [],
  };

  // Account keys are needed for instruction parsing
  const accountKeys = transaction.transaction?.message?.accountKeys || [];

  if (transaction.transaction?.message?.instructions) {
    transaction.transaction.message.instructions.forEach((instruction) => {
      const programId = accountKeys[instruction.programIdIndex];
      let programName = "Unknown Program";

      // Determine program name by known program IDs
      if (programId.equals(TOKEN_PROGRAM_ID)) {
        programName = "Token Program";
      } else if (programId.toString() === "11111111111111111111111111111111") {
        programName = "System Program";
      } else if (EXCHANGE_PROGRAM_IDS.includes(programId.toString())) {
        programName = "Exchange Program";
        parsedData.transactionType = "Trade";
      }

      // Identify transaction type and relevant token information
      if (programName === "Token Program" && instruction.data) {
        // This indicates an SPL token transfer
        parsedData.transactionType = "Transfer";

        // Extract token mint and amount info from token balances
        instruction.accounts.forEach((accountIndex) => {
          const key = accountKeys[accountIndex].toString();
          parsedData.tokens.push(key);
        });
      }
    });
  }

  // Extract token balances to understand amounts transferred
  if (transaction.meta?.postTokenBalances && transaction.meta?.preTokenBalances) {
    parsedData.tokens = transaction.meta.postTokenBalances.map((tokenBalance, idx) => {
      const preBalance = transaction.meta.preTokenBalances[idx];
      const postBalance = tokenBalance;

      const amountChange = parseFloat(postBalance.uiTokenAmount.amount) - parseFloat(preBalance.uiTokenAmount.amount);
      const tokenInfo = {
        mint: postBalance.mint,
        owner: postBalance.owner,
        amountChange,
        decimals: postBalance.uiTokenAmount.decimals,
        normalizedAmount: amountChange / Math.pow(10, postBalance.uiTokenAmount.decimals),
      };

      // Determine whether the token is bought or sold
      if (amountChange > 0) {
        tokenInfo.action = "Buy";
      } else if (amountChange < 0) {
        tokenInfo.action = "Sell";
      } else {
        tokenInfo.action = "No Change";
      }

      return tokenInfo;
    });

    // Pair buy and sell actions
    const buys = parsedData.tokens.filter(token => token.action === 'Buy');
    const sells = parsedData.tokens.filter(token => token.action === 'Sell');

    while (buys.length > 0 && sells.length > 0) {
      const buy = buys.shift();
      const sell = sells.shift();

      parsedData.pairs.push({
        buy,
        sell,
      });
    }
  }

  // Log parsed data after parsing
  logParsedData(parsedData);

  return parsedData;
}

module.exports = {
  parseTransaction,
};
