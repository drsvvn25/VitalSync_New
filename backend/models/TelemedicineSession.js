const mongoose = require('mongoose');

const telemedicineSessionSchema = new mongoose.Schema({
    appointment_id: { type: Number, required: true, unique: true, ref: 'Appointment' },
    meeting_link: { type: String, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TelemedicineSession', telemedicineSessionSchema);
