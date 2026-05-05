const mongoose = require('mongoose');
const Counter = require('./Counter');

const appointmentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    doctor_id: { type: Number, required: true, ref: 'Doctor' },
    appointment_date: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'completed'], default: 'pending' },
    notes: { type: String, default: null },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    queue_token: { type: String, default: null },
    queue_position: { type: Number, default: 0 },
    triage_result: { type: String, default: 'Routine' },
    checkin_time: { type: Date, default: null }
});

appointmentSchema.pre('save', async function (next) {
    if (this.isNew && !this.id) {
        this.id = await Counter.getNextId('appointments');
    }
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
