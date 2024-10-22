// src/parseTransaction.js

// Import necessary modules
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

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
      }

      // Identify transaction type and relevant token information
      if (programName === "Token Program" && instruction.data) {
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

      return {
        mint: postBalance.mint,
        owner: postBalance.owner,
        amountChange: parseFloat(postBalance.uiTokenAmount.amount) - parseFloat(preBalance.uiTokenAmount.amount),
        decimals: postBalance.uiTokenAmount.decimals,
      };
    });
  }

  return parsedData;
}

module.exports = {
  parseTransaction,
};
