const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    mobile: {
        type: String,
        trim: true,
        default: null,
        sparse: true   // allows multiple nulls in unique index
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'customer'],
        default: 'customer'
    },
    dairyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dairy',
        default: null
    },
    dairyName: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    // Customer rate settings (set by dairy admin)
    defaultShift: {
        type: String,
        enum: ['AM', 'PM', 'BOTH'],
        default: 'BOTH'
    },
    defaultMilkType: {
        type: String,
        enum: ['Cow', 'Buffalo', 'Mixed'],
        default: 'Mixed'
    },
    rateType: {
        type: String,
        enum: ['fat_rate', 'fixed_rate'],
        default: 'fat_rate'
    },
    ratePerFat: {
        type: Number,
        default: 7.5
    },
    fixedRate: {
        type: Number,
        default: 55
    },
    farmerCode: {
        type: Number,
        default: null
    }
}, { timestamps: true });

// Only enforce uniqueness on mobile if it is not null
UserSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { mobile: { $type: 'string' } } });
UserSchema.index({ dairyId: 1, role: 1, status: 1 });
UserSchema.index(
    { dairyId: 1, farmerCode: 1 },
    { unique: true, partialFilterExpression: { farmerCode: { $type: 'number' }, dairyId: { $exists: true, $ne: null } } }
);

module.exports = mongoose.model('User', UserSchema);
