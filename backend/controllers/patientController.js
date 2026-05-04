const User = require('../models/User');
const Patient = require('../models/Patient');

// GET /api/patient/profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ success: false, message: 'Patient not found.' });

        const patient = await Patient.findOne({ user_id: req.user.id });
        const result = {
            id: user.id, name: user.name, email: user.email, phone: user.phone,
            role: user.role, created_at: user.created_at,
            patient_id: patient ? patient.patient_id : null,
            age: patient ? patient.age : null,
            gender: patient ? patient.gender : null,
            blood_group: patient ? patient.blood_group : null,
            address: patient ? patient.address : null
        };
        res.json({ success: true, patient: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/patient/update
const updateProfile = async (req, res) => {
    const { name, phone, age, gender, blood_group, address } = req.body;
    try {
        await User.updateOne({ id: req.user.id }, { name, phone });
        await Patient.updateOne({ user_id: req.user.id }, { age, gender, blood_group, address });
        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/patient/all  (doctor only)
const getAllPatients = async (req, res) => {
    try {
        const patients = await Patient.find();
        const results = [];
        for (const p of patients) {
            const u = await User.findOne({ id: p.user_id, role: 'patient' });
            if (!u) continue;
            results.push({
                id: u.id, name: u.name, email: u.email, phone: u.phone, created_at: u.created_at,
                patient_id: p.patient_id, age: p.age, gender: p.gender,
                blood_group: p.blood_group, address: p.address
            });
        }
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ success: true, patients: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/patient/:id  (doctor only)
const getPatientById = async (req, res) => {
    try {
        const u = await User.findOne({ id: parseInt(req.params.id) });
        if (!u) return res.status(404).json({ success: false, message: 'Patient not found.' });
        const p = await Patient.findOne({ user_id: u.id });
        if (!p) return res.status(404).json({ success: false, message: 'Patient not found.' });
        res.json({
            success: true,
            patient: {
                id: u.id, name: u.name, email: u.email, phone: u.phone, created_at: u.created_at,
                patient_id: p.patient_id, age: p.age, gender: p.gender,
                blood_group: p.blood_group, address: p.address
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getProfile, updateProfile, getAllPatients, getPatientById };
