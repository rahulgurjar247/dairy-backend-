const transactionService = require('../services/transactionService');

class TransactionController {
    async createTransaction(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Only admins can record payments' });
            }

            const data = {
                ...req.body,
                adminId: req.user.id
            };

            const transaction = await transactionService.createTransaction(data);
            res.status(201).json(transaction);
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getAdminTransactions(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            
            const transactions = await transactionService.getTransactionsByAdmin(req.user.id);
            res.json(transactions);
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getCustomerTransactions(req, res) {
        try {
            if (req.user.role !== 'customer') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }

            const transactions = await transactionService.getTransactionsByCustomer(req.user.id);
            res.json(transactions);
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'Server error' });
        }
    }
}

module.exports = new TransactionController();
