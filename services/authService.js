const User = require('../models/User');
const Dairy = require('../models/Dairy');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    async register(name, mobile, password, role) {
        const cleanMobile = (mobile || '').trim();
        console.log(`\n📝 [REGISTER ATTEMPT] Name: "${name}", Mobile: "${cleanMobile}", Role: "${role}"`);

        let existingUser = await User.findOne({ mobile: cleanMobile });
        if (existingUser) {
            console.log(`⚠️ [REGISTER FAILED] User already exists with mobile: ${cleanMobile}`);
            throw new Error('User already exists');
        }

        const user = new User({
            name: (name || '').trim(),
            mobile: cleanMobile,
            password,
            role: role || 'customer',
            dairyId: null,
            dairyName: ''
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        console.log(`✅ [REGISTER SUCCESS] User registered ID: ${user._id}, Name: ${user.name}`);
        return this.generateToken(user);
    }

    async login(identifier, password) {
        const cleanId = (identifier || '').trim();
        console.log(`\n🔑 [LOGIN ATTEMPT] Looking for identifier: "${cleanId}"`);

        // Search by mobile (exact or regex) OR by name (case-insensitive)
        let user = await User.findOne({
            $or: [
                { mobile: cleanId },
                { mobile: new RegExp(`^${cleanId}$`, 'i') },
                { name: new RegExp(`^${cleanId}$`, 'i') }
            ]
        });

        // If still not found, check if cleanId matches the phone of any Dairy owned by a user
        if (!user) {
            const dairy = await Dairy.findOne({ phone: cleanId });
            if (dairy && dairy.ownerId) {
                user = await User.findById(dairy.ownerId);
                if (user) {
                    console.log(`🔍 [LOOKUP VIA DAIRY PHONE] Found owner: ${user.name} via Dairy "${dairy.name}"`);
                }
            }
        }

        if (!user) {
            console.log(`❌ [LOGIN FAILED] No user found matching: "${cleanId}"`);
            // Print available users in DB for debugging
            const allUsers = await User.find().select('name mobile').limit(5);
            console.log(`   Existing users in DB:`, allUsers.map(u => `${u.name} (Mobile: ${u.mobile})`).join(' | '));
            throw new Error('Invalid Credentials');
        }

        console.log(`👤 [USER FOUND] Name: "${user.name}", Mobile: "${user.mobile}", Role: "${user.role}"`);

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ [LOGIN FAILED] Password mismatch for user: "${user.name}" ("${user.mobile}")`);
            throw new Error('Invalid Credentials');
        }

        console.log(`✅ [LOGIN SUCCESS] Password verified! User: "${user.name}", Dairy: "${user.dairyName || 'None'}"`);
        return this.generateToken(user);
    }

    generateToken(user) {
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                dairyId: user.dairyId || null
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                mobile: user.mobile,
                dairyId: user.dairyId || null,
                dairyName: user.dairyName || '',
                status: user.status || 'approved'
            }
        };
    }
}

module.exports = new AuthService();
