const mongoose = require('mongoose');
const Counter = require('./Counter');

const bedAllocationSchema = new mongoose.Schema({
    allocation_id: { type: Number, unique: true },
    patient_id: { type: Number, required: true, ref: 'Patient' },
    bed_id: { type: Number, required: true, ref: 'Bed' },
    admission_date: { type: Date, default: Date.now },
    discharge_date: { type: Date, default: null }
});

bedAllocationSchema.pre('save', async function (next) {
    if (this.isNew && !this.allocation_id) {
        this.allocation_id = await Counter.getNextId('bed_allocations');
    }
    next();
});

module.exports = mongoose.model('BedAllocation', bedAllocationSchema);
