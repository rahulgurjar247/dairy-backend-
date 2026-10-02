const mongoose = require('mongoose');

/**
 * Payment model — tracks cash transactions per customer in a dairy
 * Types:
 *   advance   → Dairy gives cash to customer (customer will return in milk)
 *   payment   → Dairy pays customer for their milk (settling dues)
 *   received  → Dairy received cash from customer (customer paid their dues)
 */
const PaymentSchema = new mongoose.Schema({
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
    dairyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dairy'
    },
    type: {
        type: String,
        enum: ['advance', 'payment', 'received', 'cattle_feed'],
        required: true
        // advance     = admin gave money to customer (debit customer's account)
        // cattle_feed = admin gave feed/chara/khal to customer (debit customer's account)
        // payment     = admin paid customer for milk collected (credit customer's account)
        // received    = customer paid back to admin (debit customer's account)
    },
    amount: {
        type: Number,
        required: true
    },
    note: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

PaymentSchema.index({ adminId: 1, date: -1 });
PaymentSchema.index({ customerId: 1, date: -1 });
PaymentSchema.index({ adminId: 1, customerId: 1, date: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
