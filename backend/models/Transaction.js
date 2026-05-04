const mongoose = require('mongoose');
const Counter = require('./Counter');

const transactionSchema = new mongoose.Schema({
    transaction_id: { type: Number, unique: true },
    wallet_id: { type: Number, required: true, ref: 'PatientWallet' },
    amount: { type: Number, required: true },
    transaction_type: { type: String, enum: ['credit', 'debit'], required: true },
    description: { type: String, default: '' },
    transaction_date: { type: Date, default: Date.now }
});

transactionSchema.pre('save', async function (next) {
    if (this.isNew && !this.transaction_id) {
        this.transaction_id = await Counter.getNextId('transactions');
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
