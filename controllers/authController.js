const authService = require('../services/authService');

class AuthController {
    async register(req, res) {
        try {
            const { name, mobile, password, role } = req.body;
            const result = await authService.register(name, mobile, password, role);
            res.status(201).json(result);
        } catch (err) {
            console.error('⚠️ [REGISTER ERROR]', err.message);
            if (err.message === 'User already exists') {
                return res.status(400).json({ msg: 'Yeh mobile number pehle se registered hai.' });
            }
            res.status(500).json({ msg: 'Server error during registration' });
        }
    }

    async login(req, res) {
        try {
            const { mobile, password } = req.body;
            console.log(`\n📬 [POST /api/auth/login] Received mobile/identifier: "${mobile}"`);
            const result = await authService.login(mobile, password);
            res.json(result);
        } catch (err) {
            console.error(`⚠️ [LOGIN CONTROLLER ERROR]:`, err.message);
            if (err.message === 'Invalid Credentials') {
                return res.status(400).json({ msg: 'Mobile number ya Password galat hai.' });
            }
            res.status(500).json({ msg: 'Server error during login' });
        }
    }
}

module.exports = new AuthController();
