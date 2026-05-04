const mongoose = require('mongoose');
const Counter = require('./Counter');

const patientSchema = new mongoose.Schema({
    patient_id: { type: Number, unique: true },
    user_id: { type: Number, required: true, ref: 'User' },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    blood_group: { type: String, default: null },
    address: { type: String, default: null }
});

patientSchema.pre('save', async function (next) {
    if (this.isNew && !this.patient_id) {
        this.patient_id = await Counter.getNextId('patients');
    }
    next();
});

module.exports = mongoose.model('Patient', patientSchema);
