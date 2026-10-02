const mongoose = require('mongoose');

const BicSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    createdBy: {
        type: String,
        default: 'superadmin'
    },
    status: {
        type: String,
        enum: ['active', 'used', 'expired'],
        default: 'active'
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    usedAt: {
        type: Date,
        default: null
    },
    dairyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dairy',
        default: null
    },
    dairyName: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Bic', BicSchema);
