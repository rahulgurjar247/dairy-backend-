const Dairy = require('../models/Dairy');
const Bic = require('../models/Bic');
const User = require('../models/User');

class DairyController {
    // Dairy Owner sets up a new dairy using a Super Admin BIC license code
    async setupDairy(req, res) {
        try {
            const { name, bicCode, address, phone } = req.body;
            const userId = req.user.id;

            if (!name || !bicCode) {
                return res.status(400).json({ msg: 'Dairy name and BIC code are required' });
            }

            const cleanBic = bicCode.trim().toUpperCase();

            // 1. Verify BIC license code
            const bicDoc = await Bic.findOne({ code: cleanBic });
            if (!bicDoc) {
                return res.status(400).json({ msg: 'Invalid BIC Code. Please get a valid license code from Super Admin.' });
            }
            if (bicDoc.status !== 'active') {
                return res.status(400).json({ msg: 'This BIC Code has already been used or expired.' });
            }

            // 2. Generate unique 6-digit mathematical/numeric Dairy ID (e.g. 582910)
            let dairyCode;
            let isUnique = false;
            while (!isUnique) {
                dairyCode = Math.floor(100000 + Math.random() * 900000).toString();
                const existing = await Dairy.findOne({ dairyCode });
                if (!existing) isUnique = true;
            }

            // 3. Create Dairy record
            const dairy = new Dairy({
                name: name.trim(),
                dairyCode,
                ownerId: userId,
                bicCode: cleanBic,
                address: address ? address.trim() : '',
                phone: phone ? phone.trim() : ''
            });
            await dairy.save();

            // 4. Mark BIC as used
            bicDoc.status = 'used';
            bicDoc.usedBy = userId;
            bicDoc.usedAt = new Date();
            bicDoc.dairyId = dairy._id;
            bicDoc.dairyName = dairy.name;
            await bicDoc.save();

            // 5. Update User with admin role and dairyId
            const user = await User.findById(userId);
            user.role = 'admin';
            user.dairyId = dairy._id;
            user.dairyName = dairy.name;
            user.status = 'approved';
            await user.save();

            res.status(201).json({
                msg: 'Dairy created and activated successfully! 🎉',
                dairy,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    mobile: user.mobile,
                    dairyId: dairy._id,
                    dairyName: dairy.name,
                    status: 'approved'
                }
            });
        } catch (err) {
            console.error('Setup Dairy Error:', err);
            res.status(500).json({ msg: 'Server error while setting up dairy' });
        }
    }

    // Customer searches for dairies by 6-digit ID, Name, Village/Address, or Owner Mobile
    async searchDairies(req, res) {
        try {
            const { query } = req.query;
            let filter = {};

            if (query && query.trim()) {
                const q = query.trim();
                const regex = new RegExp(q, 'i');

                // Find users matching mobile or name to search by owner as well
                const matchingOwners = await User.find({
                    $or: [{ name: regex }, { mobile: regex }]
                }).select('_id');
                const ownerIds = matchingOwners.map(o => o._id);

                filter = {
                    $or: [
                        { dairyCode: regex },
                        { name: regex },
                        { address: regex },
                        { phone: regex },
                        { ownerId: { $in: ownerIds } }
                    ]
                };
            }

            const dairies = await Dairy.find(filter)
                .populate('ownerId', 'name mobile')
                .sort({ createdAt: -1 })
                .limit(30);

            res.json(dairies);
        } catch (err) {
            console.error('Search Dairies Error:', err);
            res.status(500).json({ msg: 'Server error while searching dairies' });
        }
    }

    // Customer selects a dairy from search results and sends a join request
    async requestJoin(req, res) {
        try {
            const { dairyId, dairyCode } = req.body;
            const userId = req.user.id;

            let dairy = null;
            if (dairyId) {
                dairy = await Dairy.findById(dairyId);
            } else if (dairyCode) {
                dairy = await Dairy.findOne({ dairyCode: dairyCode.trim() });
            }

            if (!dairy) {
                return res.status(404).json({ msg: 'Dairy not found. Please check Dairy ID or Name.' });
            }

            const user = await User.findById(userId);
            user.dairyId = dairy._id;
            user.dairyName = dairy.name;
            user.role = 'customer';
            user.status = 'pending'; // Requires dairy owner approval
            await user.save();

            res.json({
                msg: `Join request sent to "${dairy.name}"! Owner will approve you shortly.`,
                dairy,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    mobile: user.mobile,
                    dairyId: dairy._id,
                    dairyName: dairy.name,
                    status: 'pending'
                }
            });
        } catch (err) {
            console.error('Request Join Error:', err);
            res.status(500).json({ msg: 'Server error while sending join request' });
        }
    }

    // Get current user's dairy details
    async getMyDairy(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user || !user.dairyId) {
                return res.status(404).json({ msg: 'No dairy linked to this user' });
            }

            const dairy = await Dairy.findById(user.dairyId).populate('ownerId', 'name mobile');
            res.json(dairy);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // Super Admin: Generate BIC License Codes
    async superAdminGenerateBic(req, res) {
        try {
            const { count = 1 } = req.body;
            const crypto = require('crypto');
            const generatedCodes = [];

            for (let i = 0; i < Math.min(count, 20); i++) {
                const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
                const code = `BIC-${codeSuffix}`;
                const bic = new Bic({
                    code,
                    createdBy: 'superadmin',
                    status: 'active'
                });
                await bic.save();
                generatedCodes.push(bic);
            }

            res.status(201).json({
                msg: `Generated ${generatedCodes.length} BIC license code(s)`,
                bics: generatedCodes
            });
        } catch (err) {
            console.error('Generate BIC Error:', err);
            res.status(500).json({ msg: 'Server error' });
        }
    }

    // Super Admin: List all BICs and their usage status
    async superAdminGetBics(req, res) {
        try {
            const bics = await Bic.find().sort({ createdAt: -1 });
            res.json(bics);
        } catch (err) {
            res.status(500).json({ msg: 'Server error' });
        }
    }
}

module.exports = new DairyController();
