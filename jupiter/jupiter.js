const axios = require('axios');

class Jupiter {
  async getSwapDetails(transaction) {
    try {
      const response = await axios.get(`${process.env.JUPITER_API_URL}/quote`, {
        params: {
          inputMint: transaction.tokenMint,
          outputMint: 'So11111111111111111111111111111111111111112', // Example output mint
          amount: transaction.amount,
          slippage: 0.5,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Jupiter swap details:', error);
      return null;
    }
  }
}

module.exports = Jupiter;
