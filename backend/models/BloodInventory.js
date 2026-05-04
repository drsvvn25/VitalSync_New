const mongoose = require('mongoose');
const Counter = require('./Counter');

const bloodInventorySchema = new mongoose.Schema({
    inventory_id: { type: Number, unique: true },
    clinic_id: { type: Number, required: true, ref: 'Clinic' },
    blood_group: { type: String, required: true },
    available_units: { type: Number, default: 0 }
});

bloodInventorySchema.pre('save', async function (next) {
    if (this.isNew && !this.inventory_id) {
        this.inventory_id = await Counter.getNextId('blood_inventory');
    }
    next();
});

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);
