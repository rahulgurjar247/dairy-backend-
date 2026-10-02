const express = require('express');
const router = express.Router();
const khataController = require('../controllers/khataController');
const auth = require('../middleware/auth');

router.use(auth);

// Admin: get all customer balances overview
router.get('/all', khataController.getAllBalances);

// Customer: get own khata
router.get('/my', khataController.getMyKhata);

// Admin: 10-day / monthly cycle bill sheet
router.get('/cycle-bill', khataController.getCycleBill);

// Admin: get specific customer's full khata
router.get('/:customerId', khataController.getCustomerKhata);

// Admin: add advance / payment / received cash
router.post('/payment', khataController.addPayment);

// Admin: add a customer directly (mobile optional)
router.post('/add-customer', khataController.addCustomerDirectly);

module.exports = router;
