const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');

router.use(auth);

// @route   POST /api/transactions
// @desc    Admin records cash given/received
router.post('/', transactionController.createTransaction);

// @route   GET /api/transactions/admin
router.get('/admin', transactionController.getAdminTransactions);

// @route   GET /api/transactions/customer
router.get('/customer', transactionController.getCustomerTransactions);

module.exports = router;
