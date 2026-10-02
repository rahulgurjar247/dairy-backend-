const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    const time = new Date().toLocaleTimeString('en-IN');
    console.log(`\n📡 [${time}] ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        if (safeBody.password) safeBody.password = '******';
        console.log(`   📦 Body:`, JSON.stringify(safeBody));
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/entries', require('./routes/dailyEntry'));
app.use('/api/users', require('./routes/user'));
app.use('/api/dairy', require('./routes/dairy'));
app.use('/api/khata', require('./routes/khata'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Dairy Backend running on port ${PORT}`));
