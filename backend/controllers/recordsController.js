const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const MedicationSchedule = require('../models/MedicationSchedule');
const Appointment = require('../models/Appointment');
const { sendPrescriptionEmail } = require('../services/emailService');
const { autoGenerateBill } = require('./walletController');

// POST /api/records/add
const addRecord = async (req, res) => {
    const { patient_id, diagnosis, prescription, notes, medications } = req.body;
    if (!patient_id || !diagnosis)
        return res.status(400).json({ success: false, message: 'Patient ID and diagnosis are required.' });

    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor record not found.' });
        const doctor_id = doctor.doctor_id;

        const record = await MedicalRecord.create({ patient_id, doctor_id, diagnosis, prescription: prescription || null, notes: notes || null });
        const record_id = record.id;

        if (medications && Array.isArray(medications)) {
            for (const med of medications) {
                if (med.name && med.frequency && med.duration) {
                    await MedicationSchedule.create({ patient_id, doctor_id, record_id, medicine_name: med.name, frequency_hours: med.frequency, duration_days: med.duration });
                }
            }
        }

        // Auto-complete today's confirmed appointment
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        await Appointment.updateMany(
            { patient_id, doctor_id, status: 'confirmed', appointment_date: { $gte: todayStart, $lte: todayEnd } },
            { status: 'completed' }
        );

        // Real-time notification
        const io = req.app.get('io');
        if (io) {
            const p = await Patient.findOne({ patient_id });
            const dUser = await User.findOne({ id: doctor.user_id });
            if (p && dUser) {
                io.to(`user_${p.user_id}`).emit('record_added', {
                    doctor_name: dUser.name,
                    message: `Dr. ${dUser.name} has added a new medical prescription to your profile.`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        const consultation_fee = 150.00;
        const medicines_cost = (medications && medications.length > 0) ? medications.length * 20.00 : 50.00;
        const billResult = await autoGenerateBill(patient_id, record_id, consultation_fee, medicines_cost);

        res.status(201).json({ success: true, message: 'Medical record added successfully.', record_id, billing: billResult });

        // Async email
        (async () => {
            try {
                const p = await Patient.findOne({ patient_id });
                const pUser = p ? await User.findOne({ id: p.user_id }) : null;
                const dUser = await User.findOne({ id: req.user.id });
                if (pUser && dUser) {
                    await sendPrescriptionEmail({ patientName: pUser.name, patientEmail: pUser.email, doctorName: dUser.name, diagnosis, prescription, notes, date: new Date(), medications: medications || [] });
                }
            } catch (emailErr) { console.error('Failed to send prescription email:', emailErr); }
        })();
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/records/:patientId
const getRecords = async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patient_id: parseInt(req.params.patientId) }).sort({ date: -1 });
        const results = [];
        for (const mr of records) {
            const d = await Doctor.findOne({ doctor_id: mr.doctor_id });
            const u = d ? await User.findOne({ id: d.user_id }) : null;
            results.push({ id: mr.id, diagnosis: mr.diagnosis, prescription: mr.prescription, notes: mr.notes, date: mr.date, doctor_name: u ? u.name : null, specialization: d ? d.specialization : null });
        }
        res.json({ success: true, records: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/records/my/all
const getMyRecords = async (req, res) => {
    try {
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ user_id: req.user.id });
            if (!doctor) return res.status(404).json({ success: false, message: 'Doctor record not found.' });
            const records = await MedicalRecord.find({ doctor_id: doctor.doctor_id }).sort({ date: -1 });
            const results = [];
            for (const mr of records) {
                const d = await Doctor.findOne({ doctor_id: mr.doctor_id });
                const du = d ? await User.findOne({ id: d.user_id }) : null;
                const p = await Patient.findOne({ patient_id: mr.patient_id });
                const pu = p ? await User.findOne({ id: p.user_id }) : null;
                results.push({ id: mr.id, diagnosis: mr.diagnosis, prescription: mr.prescription, notes: mr.notes, date: mr.date, doctor_name: du ? du.name : null, specialization: d ? d.specialization : null, patient_name: pu ? pu.name : null });
            }
            return res.json({ success: true, records: results });
        }
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
        const records = await MedicalRecord.find({ patient_id: patient.patient_id }).sort({ date: -1 });
        const results = [];
        for (const mr of records) {
            const d = await Doctor.findOne({ doctor_id: mr.doctor_id });
            const u = d ? await User.findOne({ id: d.user_id }) : null;
            results.push({ id: mr.id, diagnosis: mr.diagnosis, prescription: mr.prescription, notes: mr.notes, date: mr.date, doctor_name: u ? u.name : null, specialization: d ? d.specialization : null });
        }
        res.json({ success: true, records: results, patient_id: patient.patient_id });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// DELETE /api/records/:id
const deleteRecord = async (req, res) => {
    try {
        const recId = parseInt(req.params.id);
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ user_id: req.user.id });
            const rec = await MedicalRecord.findOne({ id: recId, doctor_id: doctor?.doctor_id });
            if (!rec) return res.status(403).json({ success: false, message: 'Record not found or unauthorized.' });
            await MedicalRecord.deleteOne({ id: recId });
            return res.json({ success: true, message: 'Record deleted.' });
        } else if (req.user.role === 'patient') {
            const patient = await Patient.findOne({ user_id: req.user.id });
            const rec = await MedicalRecord.findOne({ id: recId, patient_id: patient?.patient_id });
            if (!rec) return res.status(403).json({ success: false, message: 'Record not found or unauthorized.' });
            await MedicalRecord.deleteOne({ id: recId });
            return res.json({ success: true, message: 'Record deleted.' });
        }
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { addRecord, getRecords, getMyRecords, deleteRecord };
