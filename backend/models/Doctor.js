const mongoose = require('mongoose');
const Counter = require('./Counter');

const doctorSchema = new mongoose.Schema({
    doctor_id: { type: Number, unique: true },
    user_id: { type: Number, required: true, ref: 'User' },
    clinic_id: { type: Number, default: null, ref: 'Clinic' },
    specialization: { type: String, default: '' },
    experience: { type: Number, default: 0 }
});

doctorSchema.pre('save', async function (next) {
    if (this.isNew && !this.doctor_id) {
        this.doctor_id = await Counter.getNextId('doctors');
    }
    next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
