const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const BloodInventory = require('../models/BloodInventory');
const BloodRequest = require('../models/BloodRequest');

const getInventory = async (req, res) => {
    try {
        const doc = await Doctor.findOne({ user_id: req.user.id });
        if (!doc || !doc.clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });
        const inventory = await BloodInventory.find({ clinic_id: doc.clinic_id }).sort({ blood_group: 1 });
        res.json({ success: true, inventory });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateInventory = async (req, res) => {
    try {
        const { inventory_id, units } = req.body;
        await BloodInventory.updateOne({ inventory_id }, { available_units: units });
        res.json({ success: true, message: 'Inventory updated.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const requestBlood = async (req, res) => {
    try {
        const { patient_id, blood_group, urgency_level, units_needed } = req.body;
        await BloodRequest.create({ patient_id, blood_group, urgency_level, units_needed });

        const doc = await Doctor.findOne({ user_id: req.user.id });
        const clinicId = doc ? doc.clinic_id : null;

        if (clinicId) {
            const inv = await BloodInventory.findOne({ clinic_id: clinicId, blood_group });
            if (inv && inv.available_units >= units_needed) {
                await BloodInventory.updateOne({ inventory_id: inv.inventory_id }, { $inc: { available_units: -units_needed } });
                await BloodRequest.findOneAndUpdate({ patient_id, status: 'pending' }, { status: 'fulfilled' }, { sort: { request_date: -1 } });
                return res.json({ success: true, message: 'Blood procured and request fulfilled instantly from clinic inventory.' });
            }
        }
        res.status(201).json({ success: true, message: 'Blood request filed. Waiting for donors/stock.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getRequests = async (req, res) => {
    try {
        const requests = await BloodRequest.find().sort({ request_date: -1 }).limit(50);
        const results = [];
        for (const br of requests) {
            const p = await Patient.findOne({ patient_id: br.patient_id });
            const u = p ? await User.findOne({ id: p.user_id }) : null;
            results.push({ ...br.toObject(), patient_name: u ? u.name : null });
        }
        res.json({ success: true, requests: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getInventory, updateInventory, requestBlood, getRequests };
