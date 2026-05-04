const mongoose = require('mongoose');

// Counter collection for auto-incrementing numeric IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },  // e.g. 'users', 'patients'
    seq: { type: Number, default: 0 }
});

counterSchema.statics.getNextId = async function (modelName) {
    const counter = await this.findByIdAndUpdate(
        modelName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
