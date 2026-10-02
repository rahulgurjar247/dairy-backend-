const mongoose = require('mongoose');

const DailyEntrySchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shift: {
        type: String,
        enum: ['AM', 'PM'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    milkType: {
        type: String,
        enum: ['Cow', 'Buffalo', 'Mixed'],
        default: 'Mixed'
    },
    liters: {
        type: Number,
        required: true
    },
    fat: {
        type: Number,
        default: 0
    },
    snf: {
        type: Number,
        default: 0
    },
    rate: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    transactionType: {
        type: String,
        enum: ['buy', 'sell'],
        required: true // 'buy' means dairy buys from farmer, 'sell' means dairy sells to customer
    }
}, { timestamps: true });

// High-performance compound indexes for daily stats and monthly billing
DailyEntrySchema.index({ adminId: 1, date: -1 });
DailyEntrySchema.index({ customerId: 1, date: -1 });
DailyEntrySchema.index({ adminId: 1, customerId: 1, date: -1 });

module.exports = mongoose.model('DailyEntry', DailyEntrySchema);
