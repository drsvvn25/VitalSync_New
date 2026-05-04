const mongoose = require('mongoose');
const Counter = require('./Counter');

const patientWalletSchema = new mongoose.Schema({
    wallet_id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, unique: true, ref: 'Patient' },
    balance: { type: Number, default: 0 }
});

patientWalletSchema.pre('save', async function (next) {
    if (this.isNew && !this.wallet_id) {
        this.wallet_id = await Counter.getNextId('patient_wallets');
    }
    next();
});

module.exports = mongoose.model('PatientWallet', patientWalletSchema);
