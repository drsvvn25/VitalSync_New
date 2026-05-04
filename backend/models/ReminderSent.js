const mongoose = require('mongoose');
const Counter = require('./Counter');

const reminderSentSchema = new mongoose.Schema({
    reminder_id: { type: Number, unique: true },
    schedule_id: { type: Number, required: true, ref: 'MedicationSchedule' },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    status: { type: String, enum: ['pending', 'taken', 'missed'], default: 'pending' },
    sent_at: { type: Date, default: Date.now },
    taken_at: { type: Date, default: null }
});

reminderSentSchema.pre('save', async function (next) {
    if (this.isNew && !this.reminder_id) {
        this.reminder_id = await Counter.getNextId('reminders_sent');
    }
    next();
});

module.exports = mongoose.model('ReminderSent', reminderSentSchema);
