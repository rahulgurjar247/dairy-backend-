const Transaction = require('../models/Transaction');

class TransactionService {
    async createTransaction(data) {
        const transaction = new Transaction(data);
        await transaction.save();
        return transaction;
    }

    async getTransactionsByAdmin(adminId) {
        return await Transaction.find({ adminId })
            .populate('customerId', 'name mobile')
            .sort({ date: -1 });
    }

    async getTransactionsByCustomer(customerId) {
        return await Transaction.find({ customerId })
            .populate('adminId', 'name mobile')
            .sort({ date: -1 });
    }
}

module.exports = new TransactionService();
