// src/parseTransaction.js
// Base58 Decoder Implementation from BitcoinJS

function base58Decode(input) {
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
  const parsedData = {};
  const { transaction: tx, meta } = transaction;

  // Extract basic information
  parsedData.slot = transaction.slot;
  parsedData.blockTime = transaction.blockTime;
  parsedData.fee = meta.fee;

  // Extract token balances (pre and post)
  parsedData.preTokenBalances = meta.preTokenBalances || [];
  parsedData.postTokenBalances = meta.postTokenBalances || [];

  // Extract logs (useful for debugging)
  parsedData.logMessages = meta.logMessages || [];

  // Extract and parse instructions
  const instructions = tx.message.instructions;
  parsedData.instructions = [];

  for (const instruction of instructions) {
    const parsedInstruction = parseInstruction(instruction, tx.message);
    parsedData.instructions.push(parsedInstruction);
  }

  return parsedData;
}

// Helper function to parse individual instructions
function parseInstruction(instruction, message) {
  const programId = instruction.programId.toString();
  const parsedInstruction = {
    programId,
    program: identifyProgram(programId),
    accounts: instruction.accounts.map((accIndex) => message.accountKeys[accIndex].toString()),
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
    const fromAccount = message.accountKeys[fromAccountIndex].toString();
    const toAccount = message.accountKeys[toAccountIndex].toString();

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
    const source = message.accountKeys[sourceIndex].toString();
    const destination = message.accountKeys[destinationIndex].toString();
    const owner = message.accountKeys[ownerIndex].toString();

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
