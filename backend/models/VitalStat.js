const mongoose = require('mongoose');
const Counter = require('./Counter');

const vitalStatSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    heart_rate: { type: Number, default: null },
    blood_pressure: { type: String, default: null },
    oxygen_level: { type: Number, default: null },
    temperature: { type: Number, default: null },
    sugar_level: { type: Number, default: null },
    record_date: { type: Date, default: Date.now }
});

vitalStatSchema.pre('save', async function (next) {
    if (this.isNew && !this.id) {
        this.id = await Counter.getNextId('vital_stats');
    }
    next();
});

module.exports = mongoose.model('VitalStat', vitalStatSchema);
