const express = require('express');
const router = express.Router();
const dailyEntryController = require('../controllers/dailyEntryController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', dailyEntryController.createEntry);
router.get('/admin', dailyEntryController.getAdminEntries);
router.get('/stats', dailyEntryController.getStats);
router.get('/customer', dailyEntryController.getCustomerEntries);
router.get('/ledger/:customerId', dailyEntryController.getCustomerLedger);

module.exports = router;
