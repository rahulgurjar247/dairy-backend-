const userService = require('../services/userService');
const User = require('../models/User');

class UserController {
    async generateBic(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Only admins can generate a BIC' });
            }
            const bic = await userService.generateBic(req.user.id);
            res.json(bic);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async getBic(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const bic = await userService.getBic(req.user.id);
            res.json(bic);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async requestJoin(req, res) {
        res.status(410).json({ msg: 'Use /api/dairy/request-join instead' });
    }

    async getRequests(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const requests = await userService.getPendingRequests(req.user.id);
            res.json(requests);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    async approve(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const { customerId } = req.body;
            const customer = await userService.approveCustomer(req.user.id, customerId);
            res.json({ msg: 'Customer approved', customer });
        } catch (err) {
            res.status(400).json({ msg: err.message });
        }
    }

    async getMyCustomers(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const customers = await userService.getCustomers(req.user.id);
            res.json(customers);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // Admin updates a customer's details (name, mobile) & default settings (shift, milk type, rate)
    async updateCustomerSettings(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ msg: 'Unauthorized' });
            }
            const { customerId, name, mobile, defaultShift, defaultMilkType, rateType, ratePerFat, fixedRate, farmerCode } = req.body;
            
            const admin = await User.findById(req.user.id);
            const customer = await User.findOne({ _id: customerId, dairyId: admin.dairyId });
            if (!customer) return res.status(404).json({ msg: 'Customer not found in your dairy' });

            if (name && name.trim()) {
                customer.name = name.trim();
            }

            if (mobile !== undefined) {
                const cleanMobile = mobile ? mobile.trim() : null;
                if (cleanMobile) {
                    const existing = await User.findOne({ mobile: cleanMobile, _id: { $ne: customerId } });
                    if (existing) {
                        return res.status(400).json({ msg: 'This mobile number is already registered to another user' });
                    }
                }
                customer.mobile = cleanMobile;
            }

            if (farmerCode !== undefined && farmerCode !== null && farmerCode !== '') {
                const codeNum = parseInt(farmerCode, 10);
                if (!isNaN(codeNum) && codeNum > 0) {
                    const existingCode = await User.findOne({
                        dairyId: admin.dairyId,
                        farmerCode: codeNum,
                        _id: { $ne: customerId }
                    });
                    if (existingCode) {
                        return res.status(400).json({ msg: `Farmer Code #${codeNum} is already assigned to ${existingCode.name}` });
                    }
                    customer.farmerCode = codeNum;
                }
            }

            if (defaultShift) customer.defaultShift = defaultShift;
            if (defaultMilkType) customer.defaultMilkType = defaultMilkType;
            if (rateType) customer.rateType = rateType;
            if (ratePerFat !== undefined && !isNaN(Number(ratePerFat))) customer.ratePerFat = Number(ratePerFat);
            if (fixedRate !== undefined && !isNaN(Number(fixedRate))) customer.fixedRate = Number(fixedRate);
            await customer.save();

            console.log(`✅ Customer updated: #${customer.farmerCode || '?'} ${customer.name} | Mobile: ${customer.mobile || 'None'} | Shift: ${customer.defaultShift} | Rate: ${customer.rateType}`);
            res.json({ msg: 'Customer details updated successfully', customer });
        } catch (err) {
            console.error('updateCustomerSettings error:', err);
            if (err.code === 11000) {
                return res.status(400).json({ msg: 'Duplicate value detected. Mobile number or Farmer Code already exists.' });
            }
            res.status(500).json({ msg: 'Server error' });
        }
    }
}

module.exports = new UserController();
