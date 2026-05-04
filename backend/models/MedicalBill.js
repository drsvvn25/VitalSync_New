const mongoose = require('mongoose');
const Counter = require('./Counter');

const medicalBillSchema = new mongoose.Schema({
    bill_id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    record_id: { type: Number, default: null, ref: 'MedicalRecord' },
    consultation_fee: { type: Number, default: 0 },
    medicines_cost: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    bill_date: { type: Date, default: Date.now }
});

medicalBillSchema.pre('save', async function (next) {
    if (this.isNew && !this.bill_id) {
        this.bill_id = await Counter.getNextId('medical_bills');
    }
    next();
});

module.exports = mongoose.model('MedicalBill', medicalBillSchema);
