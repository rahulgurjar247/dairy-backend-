const khataService = require('../services/khataService');
const userService = require('../services/userService');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

class KhataController {
    // GET /api/khata/:customerId  — full khata for one customer
    async getCustomerKhata(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
            const data = await khataService.getCustomerKhata(req.params.customerId, req.user.id);
            res.json(data);
        } catch (err) {
            console.error('getCustomerKhata error:', err);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // GET /api/khata/my  — customer's own khata
    async getMyKhata(req, res) {
        try {
            // Find which admin this customer belongs to
            const me = await User.findById(req.user.id);
            // Find an admin of this dairy
            const admin = await User.findOne({ dairyId: me.dairyId, role: 'admin' });
            if (!admin) return res.status(404).json({ msg: 'Dairy admin not found' });
            const data = await khataService.getCustomerKhata(req.user.id, admin._id);
            res.json(data);
        } catch (err) {
            console.error('getMyKhata error:', err);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // GET /api/khata/all  — all customer balances for admin
    async getAllBalances(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
            const data = await khataService.getAllCustomerBalances(req.user.id);
            res.json(data);
        } catch (err) {
            console.error('getAllBalances error:', err);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // POST /api/khata/payment  — add advance/payment/received
    async addPayment(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
            const { customerId, type, amount, note } = req.body;
            if (!customerId || !type || !amount) {
                return res.status(400).json({ msg: 'customerId, type, and amount are required' });
            }
            const payment = await khataService.addPayment(req.user.id, customerId, type, parseFloat(amount), note);
            res.status(201).json(payment);
        } catch (err) {
            console.error('addPayment error:', err);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // POST /api/khata/add-customer  — Admin adds a customer directly (no mobile needed)
    async addCustomerDirectly(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
            const { name, mobile, defaultShift, defaultMilkType, rateType, ratePerFat, fixedRate, farmerCode } = req.body;
            if (!name) return res.status(400).json({ msg: 'Customer name is required' });

            const admin = await User.findById(req.user.id);
            if (!admin.dairyId) return res.status(400).json({ msg: 'No active dairy found for this admin' });

            let assignedCode = farmerCode ? parseInt(farmerCode, 10) : null;
            if (assignedCode && !isNaN(assignedCode) && assignedCode > 0) {
                const dup = await User.findOne({ dairyId: admin.dairyId, farmerCode: assignedCode });
                if (dup) {
                    return res.status(400).json({ msg: `Farmer Code #${assignedCode} is already assigned to ${dup.name}` });
                }
            } else {
                assignedCode = await userService.getNextFarmerCode(admin.dairyId);
            }

            // Generate a dummy password (customer can't login without mobile)
            const salt = await bcrypt.genSalt(10);
            const hashedPw = await bcrypt.hash('dairy@' + Date.now(), salt);

            const customer = new User({
                name: name.trim(),
                mobile: mobile?.trim() || null,
                password: hashedPw,
                role: 'customer',
                dairyId: admin.dairyId,
                dairyName: admin.dairyName,
                status: 'approved',
                defaultShift: defaultShift || 'BOTH',
                defaultMilkType: defaultMilkType || 'Mixed',
                rateType: rateType || 'fat_rate',
                ratePerFat: parseFloat(ratePerFat) || 7.5,
                fixedRate: parseFloat(fixedRate) || 55,
                farmerCode: assignedCode
            });

            await customer.save();
            console.log(`✅ Admin added customer: #${customer.farmerCode} ${customer.name} (${customer.mobile || 'no mobile'})`);
            res.status(201).json({
                msg: 'Customer added',
                customer: {
                    _id: customer._id,
                    name: customer.name,
                    mobile: customer.mobile,
                    farmerCode: customer.farmerCode
                }
            });
        } catch (err) {
            console.error('addCustomerDirectly error:', err);
            if (err.code === 11000) return res.status(400).json({ msg: 'Mobile number or Farmer Code already exists' });
            res.status(500).json({ msg: 'Server error' });
        }
    }
    // GET /api/khata/cycle-bill?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
    async getCycleBill(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({ msg: 'startDate and endDate are required (YYYY-MM-DD)' });
            }
            const data = await khataService.getCycleBill(req.user.id, startDate, endDate);
            res.json(data);
        } catch (err) {
            console.error('getCycleBill error:', err);
            res.status(500).json({ msg: 'Server error generating cycle bill' });
        }
    }
}

module.exports = new KhataController();
