const mongoose = require('mongoose');
const Counter = require('./Counter');

const bloodRequestSchema = new mongoose.Schema({
    request_id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    blood_group: { type: String, required: true },
    urgency_level: { type: String, default: 'normal' },
    units_needed: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
    request_date: { type: Date, default: Date.now }
});

bloodRequestSchema.pre('save', async function (next) {
    if (this.isNew && !this.request_id) {
        this.request_id = await Counter.getNextId('blood_requests');
    }
    next();
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
