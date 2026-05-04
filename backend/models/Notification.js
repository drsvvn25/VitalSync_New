const mongoose = require('mongoose');
const Counter = require('./Counter');

const notificationSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    recipient_id: { type: Number, required: true },
    patient_id: { type: Number, default: null },
    type: { type: String, enum: ['critical', 'sos', 'reminder', 'info'], default: 'info' },
    vital_type: { type: String, default: null },
    value: { type: String, default: null },
    message: { type: String, required: true },
    is_read: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

notificationSchema.pre('save', async function (next) {
    if (this.isNew && !this.id) {
        this.id = await Counter.getNextId('notifications');
    }
    next();
});

module.exports = mongoose.model('Notification', notificationSchema);
