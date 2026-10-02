const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.use(auth);

// Admin gets pending customer join requests
router.get('/requests', userController.getRequests);

// Admin approves a customer
router.post('/approve', userController.approve);

// Admin gets list of approved customers
router.get('/customers', userController.getMyCustomers);

// Admin sets one-time customer defaults (shift, milk type, rate)
router.post('/customer-settings', userController.updateCustomerSettings);

module.exports = router;
