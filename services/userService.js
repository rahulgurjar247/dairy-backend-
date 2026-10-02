const User = require('../models/User');
const Bic = require('../models/Bic');
const crypto = require('crypto');

class UserService {
    async generateBic(adminId) {
        let bicDoc = await Bic.findOne({ usedBy: adminId });
        if (bicDoc) {
            return bicDoc;
        }

        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        bicDoc = new Bic({ code, createdBy: 'superadmin', status: 'active' });
        await bicDoc.save();
        return bicDoc;
    }

    async getBic(adminId) {
        return await Bic.findOne({ usedBy: adminId });
    }

    async getPendingRequests(adminId) {
        const admin = await User.findById(adminId);
        const dairyId = admin?.dairyId || adminId;
        return await User.find({
            dairyId: dairyId,
            status: 'pending',
            role: 'customer'
        }, '-password');
    }

    async getNextFarmerCode(dairyId) {
        const last = await User.findOne({
            dairyId: dairyId,
            role: 'customer',
            farmerCode: { $ne: null, $gt: 0 }
        }).sort({ farmerCode: -1 }).select('farmerCode');
        return (last?.farmerCode || 0) + 1;
    }

    async approveCustomer(adminId, customerId) {
        const admin = await User.findById(adminId);
        const dairyId = admin?.dairyId || adminId;

        const customer = await User.findOne({ _id: customerId, dairyId: dairyId });
        if (!customer) throw new Error('Customer request not found');

        customer.status = 'approved';
        if (!customer.farmerCode) {
            customer.farmerCode = await this.getNextFarmerCode(dairyId);
        }
        await customer.save();
        return customer;
    }

    async getCustomers(adminId) {
        const admin = await User.findById(adminId);
        const dairyId = admin?.dairyId || adminId;

        // Auto-assign sequential farmerCode to existing customers who don't have one yet
        const unassigned = await User.find({
            dairyId: dairyId,
            status: 'approved',
            role: 'customer',
            $or: [{ farmerCode: null }, { farmerCode: { $exists: false } }]
        }).sort({ createdAt: 1 });

        if (unassigned.length > 0) {
            const maxCustomer = await User.findOne({
                dairyId: dairyId,
                role: 'customer',
                farmerCode: { $ne: null, $gt: 0 }
            }).sort({ farmerCode: -1 }).select('farmerCode');
            let nextCode = (maxCustomer?.farmerCode || 0) + 1;

            for (const cust of unassigned) {
                cust.farmerCode = nextCode++;
                await cust.save();
                console.log(`🏷️ Auto-assigned Farmer Code #${cust.farmerCode} to ${cust.name}`);
            }
        }

        return await User.find({
            dairyId: dairyId,
            status: 'approved',
            role: 'customer'
        }, '-password').sort({ farmerCode: 1, name: 1 });
    }
}

module.exports = new UserService();
