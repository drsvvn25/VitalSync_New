const Patient = require('../models/Patient');
const Ambulance = require('../models/Ambulance');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const User = require('../models/User');

const requestAmbulance = async (req, res) => {
    try {
        const { pickup_address, lat, lng } = req.body;
        if (!pickup_address) return res.status(400).json({ success: false, message: 'Pickup address required.' });

        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

        const ambulance = await Ambulance.findOne({ status: 'available' });
        const ambulance_id = ambulance ? ambulance.ambulance_id : null;

        const request = await AmbulanceRequest.create({
            patient_id: patient.patient_id, ambulance_id,
            pickup_address, pickup_lat: lat || null, pickup_lng: lng || null,
            status: ambulance_id ? 'dispatched' : 'pending'
        });

        if (ambulance_id) {
            await Ambulance.updateOne({ ambulance_id }, { status: 'dispatched' });
            const io = req.app.get('io');
            if (io) io.to(`user_${req.user.id}`).emit('ambulance_dispatched', { request_id: request.request_id, message: `Ambulance dispatched to ${pickup_address}. Help is on the way!` });
            res.json({ success: true, message: 'Ambulance requested and dispatched!', dispatched: true });
        } else {
            res.status(201).json({ success: true, message: 'Ambulance requested. Searching for available driver...', dispatched: false });
        }
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getPatientAmbulanceRequests = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false });
        const requests = await AmbulanceRequest.find({ patient_id: patient.patient_id }).sort({ request_time: -1 }).limit(10);
        const results = [];
        for (const ar of requests) {
            let amb = null;
            if (ar.ambulance_id) amb = await Ambulance.findOne({ ambulance_id: ar.ambulance_id });
            results.push({ ...ar.toObject(), vehicle_number: amb ? amb.vehicle_number : null, driver_name: amb ? amb.driver_name : null, driver_phone: amb ? amb.driver_phone : null });
        }
        res.json({ success: true, requests: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getAllRequests = async (req, res) => {
    try {
        const requests = await AmbulanceRequest.find().sort({ request_time: -1 }).limit(50);
        const results = [];
        for (const ar of requests) {
            const p = await Patient.findOne({ patient_id: ar.patient_id });
            const u = p ? await User.findOne({ id: p.user_id }) : null;
            results.push({ ...ar.toObject(), patient_id: ar.patient_id, patient_name: u ? u.name : null, phone: u ? u.phone : null });
        }
        res.json({ success: true, requests: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { requestAmbulance, getPatientAmbulanceRequests, getAllRequests };
