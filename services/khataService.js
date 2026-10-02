const Payment = require('../models/Payment');
const DailyEntry = require('../models/DailyEntry');
const User = require('../models/User');

class KhataService {

    /**
     * Get full khata for one customer
     * Returns milk entries + payment entries merged and sorted by date
     * Also returns summary: total milk earned/owed, total paid, balance
     */
    async getCustomerKhata(customerId, adminId) {
        const [milkEntries, payments] = await Promise.all([
            DailyEntry.find({ customerId, adminId }).sort({ date: -1 }),
            Payment.find({ customerId, adminId }).sort({ date: -1 })
        ]);

        // Calculate totals
        const buyLiters = milkEntries.filter(e => e.transactionType === 'buy').reduce((s, e) => s + e.liters, 0);
        const sellLiters = milkEntries.filter(e => e.transactionType === 'sell').reduce((s, e) => s + e.liters, 0);
        const buyAmount = milkEntries.filter(e => e.transactionType === 'buy').reduce((s, e) => s + e.totalAmount, 0);   // dairy owes customer
        const sellAmount = milkEntries.filter(e => e.transactionType === 'sell').reduce((s, e) => s + e.totalAmount, 0); // customer owes dairy

        // advance = dairy gave money already  → reduces what dairy owes customer
        // cattle_feed = dairy gave feed/khal   → reduces what dairy owes customer
        // payment = dairy paid for milk       → reduces what dairy owes customer
        // received = customer paid dairy      → reduces what customer owes dairy
        const advanceTotal = payments.filter(p => p.type === 'advance').reduce((s, p) => s + p.amount, 0);
        const feedTotal = payments.filter(p => p.type === 'cattle_feed').reduce((s, p) => s + p.amount, 0);
        const paymentTotal = payments.filter(p => p.type === 'payment').reduce((s, p) => s + p.amount, 0);
        const receivedTotal = payments.filter(p => p.type === 'received').reduce((s, p) => s + p.amount, 0);

        // Net balance from dairy's perspective:
        // Positive = dairy needs to pay customer
        // Negative = customer needs to pay dairy
        const netBalance = (buyAmount - advanceTotal - feedTotal - paymentTotal) - (sellAmount - receivedTotal);

        // Merge all entries for timeline view
        const timeline = [
            ...milkEntries.map(e => ({
                _id: e._id,
                kind: 'milk',
                date: e.date,
                shift: e.shift,
                milkType: e.milkType,
                transactionType: e.transactionType,
                liters: e.liters,
                fat: e.fat,
                rate: e.rate,
                amount: e.totalAmount,
                note: '',
                createdAt: e.createdAt
            })),
            ...payments.map(p => ({
                _id: p._id,
                kind: 'payment',
                date: p.date,
                type: p.type,
                amount: p.amount,
                note: p.note,
                createdAt: p.createdAt
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            summary: {
                buyLiters: parseFloat(buyLiters.toFixed(2)),
                sellLiters: parseFloat(sellLiters.toFixed(2)),
                buyAmount: parseFloat(buyAmount.toFixed(2)),
                sellAmount: parseFloat(sellAmount.toFixed(2)),
                advanceTotal: parseFloat(advanceTotal.toFixed(2)),
                feedTotal: parseFloat(feedTotal.toFixed(2)),
                paymentTotal: parseFloat(paymentTotal.toFixed(2)),
                receivedTotal: parseFloat(receivedTotal.toFixed(2)),
                netBalance: parseFloat(netBalance.toFixed(2))
            },
            timeline
        };
    }

    async addPayment(adminId, customerId, type, amount, note) {
        const admin = await User.findById(adminId);
        const payment = new Payment({
            adminId,
            customerId,
            dairyId: admin?.dairyId,
            type,
            amount: parseFloat(amount),
            note: note || ''
        });
        await payment.save();
        console.log(`💰 Payment recorded: ${type} ₹${amount} for customer ${customerId}`);
        return payment;
    }

    /**
     * Get summary across ALL customers for the admin
     */
    async getAllCustomerBalances(adminId) {
        const admin = await User.findById(adminId);
        const customers = await User.find({ dairyId: admin?.dairyId, role: 'customer', status: 'approved' }, '-password');

        const results = await Promise.all(customers.map(async (c) => {
            const { summary } = await this.getCustomerKhata(c._id, adminId);
            return {
                customer: { _id: c._id, name: c.name, mobile: c.mobile, farmerCode: c.farmerCode },
                summary
            };
        }));

        return results;
    }

    /**
     * Parse local YYYY-MM-DD range cleanly without UTC shift
     */
    parseRange(startDate, endDate) {
        const sParts = (startDate || '').split('-').map(Number);
        const start = sParts.length === 3
            ? new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0)
            : new Date(startDate);

        const eParts = (endDate || '').split('-').map(Number);
        const end = eParts.length === 3
            ? new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999)
            : new Date(endDate);

        return { start, end };
    }

    /**
     * 10-Day / Monthly Billing Cycle Sheet
     * Generates exact payouts, milk totals, deductions (advance + cattle feed) for a period
     */
    async getCycleBill(adminId, startDate, endDate) {
        const { start, end } = this.parseRange(startDate, endDate);
        const admin = await User.findById(adminId).populate('dairyId');
        const customers = await User.find({ dairyId: admin?.dairyId?._id || admin?.dairyId, role: 'customer', status: 'approved' }, '-password');

        // Fetch all milk entries and payments in this date window
        const [entries, payments] = await Promise.all([
            DailyEntry.find({
                adminId,
                date: { $gte: start, $lte: end }
            }).sort({ date: 1 }),
            Payment.find({
                adminId,
                date: { $gte: start, $lte: end }
            }).sort({ date: 1 })
        ]);

        // Process per customer
        const customerBills = customers.map(c => {
            const cid = c._id.toString();
            const cEntries = entries.filter(e => e.customerId.toString() === cid && e.transactionType === 'buy');
            const cPayments = payments.filter(p => p.customerId.toString() === cid);

            const totalLiters = cEntries.reduce((s, e) => s + e.liters, 0);
            const amLiters = cEntries.filter(e => e.shift === 'AM').reduce((s, e) => s + e.liters, 0);
            const pmLiters = cEntries.filter(e => e.shift === 'PM').reduce((s, e) => s + e.liters, 0);
            const grossAmount = cEntries.reduce((s, e) => s + e.totalAmount, 0);

            // Weighted average FAT
            const totalFatPoints = cEntries.reduce((s, e) => s + ((e.fat || 0) * e.liters), 0);
            const avgFat = totalLiters > 0 ? (totalFatPoints / totalLiters) : 0;

            const advanceTotal = cPayments.filter(p => p.type === 'advance').reduce((s, p) => s + p.amount, 0);
            const feedTotal = cPayments.filter(p => p.type === 'cattle_feed').reduce((s, p) => s + p.amount, 0);
            const paidTotal = cPayments.filter(p => p.type === 'payment').reduce((s, p) => s + p.amount, 0);
            const totalDeductions = advanceTotal + feedTotal;

            // Net payable for this period = Gross Milk Value - Deductions - Payments already paid
            const netPayable = grossAmount - totalDeductions - paidTotal;

            let status = 'PENDING';
            if (grossAmount <= 0 && totalDeductions <= 0) {
                status = 'NO_ACTIVITY';
            } else if (netPayable <= 0 && (paidTotal > 0 || grossAmount > 0)) {
                status = 'PAID';
            } else if (paidTotal > 0 && netPayable > 0) {
                status = 'PARTIAL';
            }

            return {
                customer: {
                    _id: c._id,
                    name: c.name,
                    mobile: c.mobile,
                    farmerCode: c.farmerCode,
                    rateType: c.rateType,
                    ratePerFat: c.ratePerFat,
                    fixedRate: c.fixedRate,
                    defaultMilkType: c.defaultMilkType
                },
                period: { startDate, endDate },
                totalLiters: parseFloat(totalLiters.toFixed(2)),
                amLiters: parseFloat(amLiters.toFixed(2)),
                pmLiters: parseFloat(pmLiters.toFixed(2)),
                entriesCount: cEntries.length,
                avgFat: parseFloat(avgFat.toFixed(2)),
                grossAmount: parseFloat(grossAmount.toFixed(2)),
                advanceTotal: parseFloat(advanceTotal.toFixed(2)),
                feedTotal: parseFloat(feedTotal.toFixed(2)),
                totalDeductions: parseFloat(totalDeductions.toFixed(2)),
                paidTotal: parseFloat(paidTotal.toFixed(2)),
                netPayable: parseFloat(netPayable.toFixed(2)),
                status,
                dailyBreakdown: cEntries.map(e => ({
                    _id: e._id,
                    date: e.date,
                    shift: e.shift,
                    milkType: e.milkType,
                    liters: e.liters,
                    fat: e.fat,
                    rate: e.rate,
                    amount: e.totalAmount
                })),
                paymentsList: cPayments.map(p => ({
                    _id: p._id,
                    date: p.date,
                    type: p.type,
                    amount: p.amount,
                    note: p.note
                }))
            };
        });

        // Filter out customers who had neither milk nor payments in this cycle
        const activeBills = customerBills.filter(b => b.status !== 'NO_ACTIVITY');

        // Grand totals across all farmers in this cycle
        const grandTotal = {
            totalMilkLiters: parseFloat(activeBills.reduce((s, b) => s + b.totalLiters, 0).toFixed(2)),
            totalGrossAmount: parseFloat(activeBills.reduce((s, b) => s + b.grossAmount, 0).toFixed(2)),
            totalAdvance: parseFloat(activeBills.reduce((s, b) => s + b.advanceTotal, 0).toFixed(2)),
            totalFeed: parseFloat(activeBills.reduce((s, b) => s + b.feedTotal, 0).toFixed(2)),
            totalDeductions: parseFloat(activeBills.reduce((s, b) => s + b.totalDeductions, 0).toFixed(2)),
            totalPaid: parseFloat(activeBills.reduce((s, b) => s + b.paidTotal, 0).toFixed(2)),
            totalNetPayable: parseFloat(activeBills.reduce((s, b) => s + b.netPayable, 0).toFixed(2)),
            farmersCount: activeBills.length,
            paidFarmersCount: activeBills.filter(b => b.status === 'PAID').length,
            pendingFarmersCount: activeBills.filter(b => b.status === 'PENDING' || b.status === 'PARTIAL').length
        };

        return {
            period: { startDate, endDate },
            dairy: {
                name: admin?.dairyId?.name || 'Dairy',
                code: admin?.dairyId?.dairyCode || '---'
            },
            grandTotal,
            bills: activeBills
        };
    }
}

module.exports = new KhataService();
