const DailyEntry = require('../models/DailyEntry');

class DailyEntryService {
    async createEntry(data) {
        // Auto calculate amount
        let totalAmount = data.totalAmount;
        if (!totalAmount) {
            totalAmount = parseFloat((data.liters * data.rate).toFixed(2));
        }

        const entry = new DailyEntry({ ...data, totalAmount });
        await entry.save();
        return entry.populate('customerId', 'name mobile farmerCode');
    }

    async getEntriesByAdmin(adminId, filterDate) {
        const query = { adminId };
        if (filterDate) {
            const parts = filterDate.split('-').map(Number);
            const start = parts.length === 3
                ? new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)
                : new Date(filterDate);
            const end = parts.length === 3
                ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
                : new Date(filterDate);
            query.date = { $gte: start, $lte: end };
        }
        return DailyEntry.find(query)
            .populate('customerId', 'name mobile farmerCode defaultShift rateType ratePerFat fixedRate')
            .sort({ date: -1 });
    }

    async getEntriesByCustomer(customerId, startDate, endDate) {
        const query = { customerId };
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        return DailyEntry.find(query)
            .populate('adminId', 'name mobile')
            .sort({ date: -1 });
    }

    async getEntryStats(adminId, filterDate) {
        const query = { adminId };
        if (filterDate) {
            const parts = filterDate.split('-').map(Number);
            const start = parts.length === 3
                ? new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)
                : new Date(filterDate);
            const end = parts.length === 3
                ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
                : new Date(filterDate);
            query.date = { $gte: start, $lte: end };
        }
        const entries = await DailyEntry.find(query);
        
        const amBuy = entries.filter(e => e.shift === 'AM' && e.transactionType === 'buy');
        const pmBuy = entries.filter(e => e.shift === 'PM' && e.transactionType === 'buy');
        const amSell = entries.filter(e => e.shift === 'AM' && e.transactionType === 'sell');
        const pmSell = entries.filter(e => e.shift === 'PM' && e.transactionType === 'sell');

        const sumLiters = arr => arr.reduce((s, e) => s + e.liters, 0);
        const sumAmount = arr => arr.reduce((s, e) => s + e.totalAmount, 0);

        return {
            totalEntries: entries.length,
            am: {
                buy: { liters: sumLiters(amBuy), amount: sumAmount(amBuy), count: amBuy.length },
                sell: { liters: sumLiters(amSell), amount: sumAmount(amSell), count: amSell.length }
            },
            pm: {
                buy: { liters: sumLiters(pmBuy), amount: sumAmount(pmBuy), count: pmBuy.length },
                sell: { liters: sumLiters(pmSell), amount: sumAmount(pmSell), count: pmSell.length }
            },
            totalBuyLiters: sumLiters([...amBuy, ...pmBuy]),
            totalSellLiters: sumLiters([...amSell, ...pmSell]),
            totalBuyAmount: sumAmount([...amBuy, ...pmBuy]),
            totalSellAmount: sumAmount([...amSell, ...pmSell])
        };
    }

    async getCustomerLedger(customerId, adminId) {
        const entries = await DailyEntry.find({ customerId, adminId }).sort({ date: -1 });
        const buyAmount = entries.filter(e => e.transactionType === 'buy').reduce((s, e) => s + e.totalAmount, 0);
        const sellAmount = entries.filter(e => e.transactionType === 'sell').reduce((s, e) => s + e.totalAmount, 0);
        return { entries, buyAmount, sellAmount, netBalance: sellAmount - buyAmount };
    }
}

module.exports = new DailyEntryService();
