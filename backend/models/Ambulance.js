const mongoose = require('mongoose');
const Counter = require('./Counter');

const ambulanceSchema = new mongoose.Schema({
    ambulance_id: { type: Number, unique: true },
    vehicle_number: { type: String, required: true },
    driver_name: { type: String, default: null },
    driver_phone: { type: String, default: null },
    status: { type: String, enum: ['available', 'dispatched', 'maintenance'], default: 'available' }
});

ambulanceSchema.pre('save', async function (next) {
    if (this.isNew && !this.ambulance_id) {
        this.ambulance_id = await Counter.getNextId('ambulances');
    }
    next();
});

module.exports = mongoose.model('Ambulance', ambulanceSchema);
