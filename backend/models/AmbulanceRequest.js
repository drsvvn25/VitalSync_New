const mongoose = require('mongoose');
const Counter = require('./Counter');

const ambulanceRequestSchema = new mongoose.Schema({
    request_id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    ambulance_id: { type: Number, default: null, ref: 'Ambulance' },
    pickup_address: { type: String, required: true },
    pickup_lat: { type: Number, default: null },
    pickup_lng: { type: Number, default: null },
    status: { type: String, enum: ['pending', 'dispatched', 'completed', 'cancelled'], default: 'pending' },
    request_time: { type: Date, default: Date.now }
});

ambulanceRequestSchema.pre('save', async function (next) {
    if (this.isNew && !this.request_id) {
        this.request_id = await Counter.getNextId('ambulance_requests');
    }
    next();
});

module.exports = mongoose.model('AmbulanceRequest', ambulanceRequestSchema);
