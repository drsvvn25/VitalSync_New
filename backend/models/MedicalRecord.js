const mongoose = require('mongoose');
const Counter = require('./Counter');

const medicalRecordSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    doctor_id: { type: Number, required: true, ref: 'Doctor' },
    diagnosis: { type: String, required: true },
    prescription: { type: String, default: null },
    notes: { type: String, default: null },
    date: { type: Date, default: Date.now }
});

medicalRecordSchema.pre('save', async function (next) {
    if (this.isNew && !this.id) {
        this.id = await Counter.getNextId('medical_records');
    }
    next();
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
