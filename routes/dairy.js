const express = require('express');
const router = express.Router();
const dairyController = require('../controllers/dairyController');
const auth = require('../middleware/auth');

// Public route to generate initial BIC codes / check bics
router.post('/superadmin/generate-bic', dairyController.superAdminGenerateBic);
router.get('/superadmin/bics', dairyController.superAdminGetBics);

// All routes below require login
router.use(auth);

// Search dairies (Customer searches by 6-digit ID, name, village, mobile)
router.get('/search', dairyController.searchDairies);

// Customer sends join request to selected dairy (by dairyId or 6-digit dairyCode)
router.post('/request-join', dairyController.requestJoin);

// Setup new dairy (Dairy Owner using BIC code)
router.post('/setup', dairyController.setupDairy);

// Get current user's active dairy
router.get('/my-dairy', dairyController.getMyDairy);

module.exports = router;
