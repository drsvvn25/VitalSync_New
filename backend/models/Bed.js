const mongoose = require('mongoose');
const Counter = require('./Counter');

const bedSchema = new mongoose.Schema({
    bed_id: { type: Number, unique: true },
    clinic_id: { type: Number, required: true, ref: 'Clinic' },
    ward_type: { type: String, default: 'General' },
    bed_number: { type: String, required: true },
    status: { type: String, enum: ['available', 'occupied'], default: 'available' }
});

bedSchema.pre('save', async function (next) {
    if (this.isNew && !this.bed_id) {
        this.bed_id = await Counter.getNextId('beds');
    }
    next();
});

module.exports = mongoose.model('Bed', bedSchema);
