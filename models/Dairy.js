const mongoose = require('mongoose');

const DairySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    dairyCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bicCode: {
        type: String,
        required: true,
        uppercase: true
    },
    address: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Dairy', DairySchema);
