const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');

// GET /api/doctor/profile
const getDoctorProfile = async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        const doctor = await Doctor.findOne({ user_id: req.user.id });
        let clinic = null;
        if (doctor && doctor.clinic_id) {
            clinic = await Clinic.findOne({ clinic_id: doctor.clinic_id });
        }

        res.json({
            success: true,
            doctor: {
                id: user.id, name: user.name, email: user.email, phone: user.phone, created_at: user.created_at,
                doctor_id: doctor ? doctor.doctor_id : null,
                specialization: doctor ? doctor.specialization : null,
                experience: doctor ? doctor.experience : null,
                clinic_id: clinic ? clinic.clinic_id : null,
                clinic_name: clinic ? clinic.name : null,
                clinic_address: clinic ? clinic.address : null,
                clinic_contact: clinic ? clinic.contact : null
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/doctor/patients  – all patients assigned to this doctor via appointments
const getDoctorPatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.json({ success: true, patients: [] });

        const appointments = await Appointment.find({ doctor_id: doctor.doctor_id });
        const patientIds = [...new Set(appointments.map(a => a.patient_id))];

        const results = [];
        for (const pid of patientIds) {
            const p = await Patient.findOne({ patient_id: pid });
            if (!p) continue;
            const u = await User.findOne({ id: p.user_id });
            if (!u) continue;
            results.push({
                id: u.id, name: u.name, email: u.email, phone: u.phone,
                patient_id: p.patient_id, age: p.age, gender: p.gender, blood_group: p.blood_group
            });
        }
        results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        res.json({ success: true, patients: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/doctor/all  (for patient booking)
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find();
        const results = [];
        for (const d of doctors) {
            const u = await User.findOne({ id: d.user_id, role: 'doctor' });
            if (!u) continue;
            let clinic = null;
            if (d.clinic_id) clinic = await Clinic.findOne({ clinic_id: d.clinic_id });
            results.push({
                id: u.id, name: u.name, email: u.email,
                doctor_id: d.doctor_id, specialization: d.specialization, experience: d.experience,
                clinic_id: clinic ? clinic.clinic_id : null,
                clinic_name: clinic ? clinic.name : null,
                clinic_address: clinic ? clinic.address : null,
                latitude: clinic ? clinic.latitude : null,
                longitude: clinic ? clinic.longitude : null,
                city: clinic ? clinic.city : null,
                district: clinic ? clinic.district : null,
                contact: clinic ? clinic.contact : null
            });
        }
        results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        res.json({ success: true, doctors: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/doctor/update
const updateDoctorProfile = async (req, res) => {
    const { name, phone, specialization, experience } = req.body;
    try {
        await User.updateOne({ id: req.user.id }, { name, phone });
        await Doctor.updateOne({ user_id: req.user.id }, { specialization, experience });
        res.json({ success: true, message: 'Doctor profile updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/doctor/stats
const getDoctorStats = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.json({ success: true, stats: { totalPatients: 0, pendingAppointments: 0 } });

        const appointments = await Appointment.find({ doctor_id: doctor.doctor_id });
        const uniquePatients = new Set(appointments.map(a => a.patient_id));
        const pendingAppointments = appointments.filter(a => a.status === 'pending').length;

        res.json({ success: true, stats: { totalPatients: uniquePatients.size, pendingAppointments } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getDoctorProfile, getDoctorPatients, getAllDoctors, updateDoctorProfile, getDoctorStats };
