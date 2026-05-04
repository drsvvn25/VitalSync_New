const mongoose = require('mongoose');
const Counter = require('./Counter');

const medicationScheduleSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    doctor_id: { type: Number, required: true, ref: 'Doctor' },
    record_id: { type: Number, required: true, ref: 'MedicalRecord' },
    medicine_name: { type: String, required: true },
    frequency_hours: { type: Number, required: true },
    duration_days: { type: Number, required: true },
    last_reminder_sent: { type: Date, default: null },
    start_date: { type: Date, default: Date.now },
    is_active: { type: Number, default: 1 }
});

medicationScheduleSchema.pre('save', async function (next) {
    if (this.isNew && !this.id) {
        this.id = await Counter.getNextId('medication_schedules');
    }
    next();
});

module.exports = mongoose.model('MedicationSchedule', medicationScheduleSchema);
