const mongoose = require('mongoose');
const Counter = require('./Counter');

const clinicSchema = new mongoose.Schema({
    clinic_id: { type: Number, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    city: { type: String, default: null },
    district: { type: String, default: null },
    contact: { type: String, default: null },
    type: { type: String, enum: ['hospital', 'clinic', 'pharmacy'], default: 'clinic' },
    capacity: { type: Number, default: null },
    operating_hours: { type: String, default: null },
    emergency_services: { type: Boolean, default: false },
    specialities: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
});

clinicSchema.pre('save', async function (next) {
    if (this.isNew && !this.clinic_id) {
        this.clinic_id = await Counter.getNextId('clinics');
    }
    next();
});

module.exports = mongoose.model('Clinic', clinicSchema);
