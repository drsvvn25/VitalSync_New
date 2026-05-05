const mongoose = require('mongoose');
const Counter = require('./Counter');

const receptionistSchema = new mongoose.Schema({
    receptionist_id: { type: Number, unique: true },
    user_id: { type: Number, required: true, unique: true, ref: 'User' },
    clinic_id: { type: Number, required: true, ref: 'Clinic' },
    created_at: { type: Date, default: Date.now }
});

receptionistSchema.pre('save', async function (next) {
    if (this.isNew && !this.receptionist_id) {
        this.receptionist_id = await Counter.getNextId('receptionists');
    }
    next();
});

module.exports = mongoose.model('Receptionist', receptionistSchema);
