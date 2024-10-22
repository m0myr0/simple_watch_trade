const fs = require('fs');

function parseTransactions() {
    try {
        // Read the transactions.json file
        const transactionsData = fs.readFileSync('transactions.json', 'utf-8');
        const transactions = JSON.parse(transactionsData);

        const parsedTransactions = transactions.map(tx => ({
            signature: tx.signature,
            blockTime: tx.blockTime,
            status: tx.confirmationStatus,
        }));

        // Write parsed transactions to parsed_transactions.json
        fs.writeFileSync('parsed_transactions.json', JSON.stringify(parsedTransactions, null, 2));
        console.log("Parsed transactions logged to parsed_transactions.json");
    } catch (error) {
        console.error("Error parsing transactions:", error.message);
    }
}

module.exports = { parseTransactions };