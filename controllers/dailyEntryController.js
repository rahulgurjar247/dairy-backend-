const dailyEntryService = require('../services/dailyEntryService');
const User = require('../models/User');

class DailyEntryController {
    async createEntry(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Only dairy admins can create entries' });
            }
            const admin = await User.findById(req.user.id);
            const entryData = {
                ...req.body,
                adminId: req.user.id,
                dairyId: admin.dairyId
            };
            console.log(`📝 New entry: Customer ${req.body.customerId} | ${req.body.transactionType?.toUpperCase()} | ${req.body.liters}L | ₹${req.body.rate}/L`);
            const entry = await dailyEntryService.createEntry(entryData);
            res.status(201).json(entry);
        } catch (err) {
            console.error('createEntry error:', err.message);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getAdminEntries(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const date = req.query.date;
            const entries = await dailyEntryService.getEntriesByAdmin(req.user.id, date);
            res.json(entries);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getStats(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const defaultToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const date = req.query.date || defaultToday;
            const stats = await dailyEntryService.getEntryStats(req.user.id, date);
            res.json(stats);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getCustomerEntries(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const entries = await dailyEntryService.getEntriesByCustomer(req.user.id, startDate, endDate);
            res.json(entries);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getCustomerLedger(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const { customerId } = req.params;
            const ledger = await dailyEntryService.getCustomerLedger(customerId, req.user.id);
            res.json(ledger);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }
}

module.exports = new DailyEntryController();
