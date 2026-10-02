const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
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
    amount: {
        type: Number,
        required: true
    },
    transactionType: {
        type: String,
        enum: ['paid_to_customer', 'received_from_customer'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    remarks: {
        type: String, // e.g. "Advance payment for Diwali", "Monthly clearance"
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
