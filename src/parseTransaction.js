// src/parseTransaction.js
// Base58 Decoder Implementation from BitcoinJS
function base58Decode(transaction) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const ALPHABET_MAP = {};
  for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }
  const BASE = 58;

  if (input.length === 0) return Buffer.alloc(0);

  let bytes = [0];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (!(c in ALPHABET_MAP)) {
      throw new Error(`Invalid character found: ${c}`);
    }
    let carry = ALPHABET_MAP[c];
    for (let j = 0; j < bytes.length; ++j) {
      carry += bytes[j] * BASE;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Deal with leading zeros
  for (let k = 0; k < input.length && input[k] === '1'; k++) {
    bytes.push(0);
  }

  return Buffer.from(bytes.reverse());
}

// Import necessary modules
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// Function to parse a transaction
function parseTransaction(transaction) {
  if (!transaction) return null;

  const parsedData = {
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    fee: transaction.meta?.fee || 0,
    transactionType: "Unknown",  // Placeholder, will update below
    tokens: [],
    amount: 0,
  };

  // Account keys are needed for instruction parsing
  const accountKeys = transaction.transaction?.message?.accountKeys || [];

  if (transaction.transaction?.message?.instructions) {
    transaction.transaction.message.instructions.forEach((instruction) => {
      const programId = accountKeys[instruction.programIdIndex];
      let programName = "Unknown Program";

      // Determine program name by known program IDs
      if (programId === "11111111111111111111111111111111") {
        programName = "System Program";
      } else if (programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
        programName = "Token Program";
      } else if (programId === "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") {
        programName = "Associated Token Program";
      }
      // Add specific program names here...

      // Identify transaction type and relevant token information
      if (programName === "Token Program" && instruction.data) {
        // Here you can add decoding logic for instruction.data if you have ABI information
        // Placeholder: Just assuming if it's a Token Program, it's a transfer
        parsedData.transactionType = "Transfer";

        // Extract token mint and amount info
        instruction.accounts.forEach((accountIndex) => {
          const key = accountKeys[accountIndex];
          parsedData.tokens.push(key);
        });
      } else if (programName === "Unknown Program" && instruction.data) {
        // Placeholder for custom swap/buy/sell detection logic
        if (instruction.data.includes("swap")) {
          parsedData.transactionType = "Swap";
        } else if (instruction.data.includes("buy")) {
          parsedData.transactionType = "Buy";
        } else if (instruction.data.includes("sell")) {
          parsedData.transactionType = "Sell";
        }
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


// Helper function to parse individual instructions
function parseInstruction(instruction, message) {
  const programIdIndex = instruction.programIdIndex;
  const programId = message?.accountKeys?.[programIdIndex]?.toString() || 'Unknown';
  const parsedInstruction = {
    programId,
    program: identifyProgram(programId),
    accounts: instruction.accounts?.map((accIndex) => message?.accountKeys?.[accIndex]?.toString() || 'Unknown') || [],
  };

  // Attempt to parse known instruction types
  if (parsedInstruction.program === 'System Program') {
    parsedInstruction.parsed = parseSystemInstruction(instruction, message);
  } else if (parsedInstruction.program === 'Token Program') {
    parsedInstruction.parsed = parseTokenInstruction(instruction, message);
  } else {
    parsedInstruction.parsed = { type: 'Unknown Instruction Type' };
  }

  return parsedInstruction;
}

// Function to identify known programs
function identifyProgram(programId) {
  const knownPrograms = {
    '11111111111111111111111111111111': 'System Program',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
    // Add other program IDs and names here
  };

  return knownPrograms[programId] || 'Unknown Program';
}

// Function to parse System Program instructions
function parseSystemInstruction(instruction, message) {
  const data = instruction.data;

  // Decode the base64-encoded data
  const dataBuffer = Buffer.from(data, 'base64');

  // Check if dataBuffer has at least 1 byte
  if (dataBuffer.length < 1) {
    return { type: 'Invalid Instruction Data' };
  }

  // System instructions can be identified by the first byte
  const instructionType = dataBuffer.readUInt8(0);

  if (instructionType === 2) {
    // Transfer instruction
    const [fromAccountIndex, toAccountIndex] = instruction.accounts;
    const fromAccount = message?.accountKeys?.[fromAccountIndex]?.toString() || 'Unknown';
    const toAccount = message?.accountKeys?.[toAccountIndex]?.toString() || 'Unknown';

    // Ensure dataBuffer has enough bytes for amount
    if (dataBuffer.length >= 9) {
      // The amount is stored in the data buffer starting from byte 1
      const amount = dataBuffer.readBigUInt64LE(1);

      return {
        type: 'Transfer',
        from: fromAccount,
        to: toAccount,
        amount: amount.toString(),
      };
    } else {
      return { type: 'Transfer', error: 'Insufficient data for amount' };
    }
  }

  return { type: 'Unknown System Instruction' };
}

// Function to parse Token Program instructions
function parseTokenInstruction(instruction, message) {
  const data = instruction.data;

  // Decode the base64-encoded data
  const dataBuffer = Buffer.from(data, 'base64');

  // Check if dataBuffer has at least 1 byte
  if (dataBuffer.length < 1) {
    return { type: 'Invalid Instruction Data' };
  }

  // Use the instruction layout from @solana/spl-token
  const instructionType = dataBuffer.readUInt8(0);

  const tokenInstructionTypes = {
    3: 'Transfer', // Transfer instruction
    // Add other instruction types as needed
  };

  const parsed = {
    type: tokenInstructionTypes[instructionType] || 'Unknown',
  };

  if (parsed.type === 'Transfer') {
    const [sourceIndex, destinationIndex, ownerIndex] = instruction.accounts;
    const source = message?.accountKeys?.[sourceIndex]?.toString() || 'Unknown';
    const destination = message?.accountKeys?.[destinationIndex]?.toString() || 'Unknown';
    const owner = message?.accountKeys?.[ownerIndex]?.toString() || 'Unknown';

    // Ensure dataBuffer has enough bytes for amount
    if (dataBuffer.length >= 9) {
      // Amount is bytes 1 to 8
      const amount = dataBuffer.slice(1, 9).readBigUInt64LE(0);

      parsed.source = source;
      parsed.destination = destination;
      parsed.owner = owner;
      parsed.amount = amount.toString();
    } else {
      parsed.error = 'Insufficient data for amount';
    }
  }

  return parsed;
}

module.exports = {
  parseTransaction,
};
