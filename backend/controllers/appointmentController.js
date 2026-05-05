const Patient = require('../models/Patient');
// cancelAppointment — patient can cancel their OWN pending appointment
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const { sendAppointmentConfirmation } = require('../services/emailService');

// ── AI Triage Engine ──────────────────────────────────────────────────────────
const EMERGENCY_KEYWORDS = [
    'emergency', 'urgent', 'severe', 'chest pain', 'heart attack', 'stroke',
    'unconscious', 'faint', 'fainting', 'can\'t breathe', 'cannot breathe',
    'difficulty breathing', 'high fever', 'bleeding', 'vomiting blood',
    'accident', 'fracture', 'broken', 'paralysis', 'seizure', 'convulsion',
    'allergic reaction', 'anaphylaxis', 'high sugar', 'diabetic',
    'very high bp', 'very low bp', 'oxygen low', 'critical', 'serious',
    'immediate', 'sudden', 'extreme pain', 'unbearable',
];

function runAITriage(text) {
    if (!text) return { priority: 'normal', triageResult: 'Routine', isEmergency: false };
    const lower = text.toLowerCase();
    const matched = EMERGENCY_KEYWORDS.find(kw => lower.includes(kw));
    if (matched) {
        return { priority: 'high', triageResult: `Emergency (${matched})`, isEmergency: true };
    }
    return { priority: 'normal', triageResult: 'Routine', isEmergency: false };
}

// Generate a unique queue token: VS-YYYYMMDD-NNN
function generateToken(sequenceNum) {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `VS-${dateStr}-${String(sequenceNum).padStart(3, '0')}`;
}

// POST /api/appointments/book
const bookAppointment = async (req, res) => {
    const { doctor_id, appointment_date, notes, symptoms } = req.body;
    const io = req.app.get('io');

    if (!doctor_id || !appointment_date)
        return res.status(400).json({ success: false, message: 'Doctor ID and appointment date are required.' });

    try {
        // Get patient info
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const patientUser = await User.findOne({ id: req.user.id });
        if (!patientUser)
            return res.status(404).json({ success: false, message: 'Patient user not found.' });

        const { patient_id } = patient;
        const patientName = patientUser.name;
        const patientEmail = patientUser.email;

        // Get doctor info
        const doctorDoc = parseInt(doctor_id);
        const doctor = await Doctor.findOne({ doctor_id: doctorDoc });
        if (!doctor)
            return res.status(404).json({ success: false, message: 'Doctor not found.' });

        const doctorUser = await User.findOne({ id: doctor.user_id });
        if (!doctorUser)
            return res.status(404).json({ success: false, message: 'Doctor user not found.' });

        const doctorName = doctorUser.name;
        const doctorUserId = doctor.user_id;

        // ── AI Triage ───────────────────────────────────────────────
        const triageInput = [symptoms, notes].filter(Boolean).join(' ');
        const { priority, triageResult, isEmergency } = runAITriage(triageInput);

        // ── Queue Position ──────────────────────────────────────────
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const count = await Appointment.countDocuments({
            doctor_id: doctorDoc,
            appointment_date: { $gte: todayStart, $lte: todayEnd }
        });
        const queuePosition = count + 1;
        const queueToken = generateToken(queuePosition);

        // ── Create appointment ──────────────────────────────────────
        const newAppt = await Appointment.create({
            patient_id,
            doctor_id: doctorDoc,
            appointment_date: new Date(appointment_date),
            status: 'pending',
            notes: notes || symptoms || null,
            priority,
            queue_token: queueToken,
            queue_position: queuePosition,
            triage_result: triageResult,
        });

        // ── Socket alert to doctor if high priority ─────────────────
        if (isEmergency && io) {
            const alertMsg = `🚨 Emergency appointment booked by ${patientName}! Token: ${queueToken}`;
            io.to(`user_${doctorUserId}`).emit('critical_alert', {
                patient_name: patientName, patient_id, vital_type: 'Appointment',
                value: 'HIGH PRIORITY', message: alertMsg, timestamp: new Date().toISOString(),
            });
            io.to('doctors').emit('emergency_appointment', {
                patient_name: patientName, patient_id, doctor_name: doctorName,
                queue_token: queueToken, triage_result: triageResult,
                appointment_date, message: alertMsg, timestamp: new Date().toISOString(),
            });

            // Save notification for doctor
            await Notification.create({
                recipient_id: doctorUserId,
                patient_id,
                type: 'critical',
                vital_type: 'Triage',
                value: triageResult,
                message: alertMsg,
            });
        }

        // ── Email notification ──────────────────────────────────────
        sendAppointmentConfirmation({
            patientName, patientEmail, doctorName,
            appointmentDate: appointment_date,
            queueToken, queuePosition, priority, triageResult,
        });

        res.status(201).json({
            success: true,
            message: `Appointment booked! ${isEmergency ? '🚨 HIGH PRIORITY – Doctor alerted.' : 'Awaiting confirmation.'}`,
            appointment_id: newAppt.id,
            triage: { priority, triageResult, isEmergency },
            queue: { token: queueToken, position: queuePosition },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
};

// GET /api/appointments/list
const listAppointments = async (req, res) => {
    try {
        if (req.user.role === 'patient') {
            const patient = await Patient.findOne({ user_id: req.user.id });
            if (!patient) return res.json({ success: true, appointments: [] });

            const appts = await Appointment.find({ patient_id: patient.patient_id })
                .sort({ priority: -1, appointment_date: -1 });

            const results = await Promise.all(appts.map(async (a) => {
                const doc = await Doctor.findOne({ doctor_id: a.doctor_id });
                const docUser = doc ? await User.findOne({ id: doc.user_id }) : null;
                return {
                    id: a.id,
                    appointment_date: a.appointment_date,
                    status: a.status,
                    notes: a.notes,
                    priority: a.priority,
                    queue_token: a.queue_token,
                    queue_position: a.queue_position,
                    triage_result: a.triage_result,
                    doctor_name: docUser ? docUser.name : 'Unknown',
                    specialization: doc ? doc.specialization : '',
                };
            }));

            res.json({ success: true, appointments: results });
        } else {
            // Doctor
            const doctor = await Doctor.findOne({ user_id: req.user.id });
            if (!doctor) return res.json({ success: true, appointments: [] });

            const appts = await Appointment.find({ doctor_id: doctor.doctor_id })
                .sort({ priority: -1, appointment_date: 1 });

            const results = await Promise.all(appts.map(async (a) => {
                const pat = await Patient.findOne({ patient_id: a.patient_id });
                const patUser = pat ? await User.findOne({ id: pat.user_id }) : null;
                return {
                    id: a.id,
                    appointment_date: a.appointment_date,
                    status: a.status,
                    notes: a.notes,
                    priority: a.priority,
                    queue_token: a.queue_token,
                    queue_position: a.queue_position,
                    triage_result: a.triage_result,
                    patient_name: patUser ? patUser.name : 'Unknown',
                    patient_phone: patUser ? patUser.phone : null,
                    age: pat ? pat.age : null,
                    gender: pat ? pat.gender : null,
                    blood_group: pat ? pat.blood_group : null,
                    patient_id: a.patient_id,
                };
            }));

            res.json({ success: true, appointments: results });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
};

// PUT /api/appointments/update/:id  (doctor only)
const updateAppointment = async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'rejected', 'completed'];
    if (!validStatuses.includes(status))
        return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}.` });

    try {
        // Verify the appointment belongs to this doctor
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor)
            return res.status(403).json({ success: false, message: 'Doctor record not found.' });

        const appt = await Appointment.findOne({ id: parseInt(req.params.id), doctor_id: doctor.doctor_id });
        if (!appt)
            return res.status(403).json({ success: false, message: 'Appointment not found or unauthorized.' });

        appt.status = status;
        await appt.save();

        // ── Socket notification to patient ──────────────────────────
        const io = req.app.get('io');
        if (io) {
            const pat = await Patient.findOne({ patient_id: appt.patient_id });
            if (pat) {
                const doctorUser = await User.findOne({ id: doctor.user_id });
                io.to(`user_${pat.user_id}`).emit('appointment_status_update', {
                    appointment_id: req.params.id,
                    status,
                    doctor_name: doctorUser ? doctorUser.name : 'Doctor',
                    message: `Your appointment with Dr. ${doctorUser ? doctorUser.name : 'Doctor'} has been ${status}.`,
                });
            }
        }

        // Send confirmation email when doctor confirms
        if (status === 'confirmed') {
            const pat = await Patient.findOne({ patient_id: appt.patient_id });
            const patUser = pat ? await User.findOne({ id: pat.user_id }) : null;
            const docUser = await User.findOne({ id: doctor.user_id });
            if (patUser && docUser) {
                sendAppointmentConfirmation({
                    patientName: patUser.name,
                    patientEmail: patUser.email,
                    doctorName: docUser.name,
                    appointmentDate: appt.appointment_date,
                    queueToken: appt.queue_token,
                    queuePosition: appt.queue_position,
                    priority: appt.priority,
                    triageResult: appt.triage_result,
                });
            }
        }

        res.json({ success: true, message: `Appointment ${status} successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
};

// GET /api/appointments/stats  (doctor)
const getAppointmentStats = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.json({ success: true, stats: { pending: 0, confirmed: 0, rejected: 0, completed: 0, high_priority: 0 } });

        const allAppts = await Appointment.find({ doctor_id: doctor.doctor_id });
        const stats = { pending: 0, confirmed: 0, rejected: 0, completed: 0 };
        allAppts.forEach(a => {
            if (stats[a.status] !== undefined) stats[a.status]++;
        });
        stats.high_priority = allAppts.filter(a => a.priority === 'high' && a.status === 'pending').length;

        res.json({ success: true, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
};

// DELETE /api/appointments/delete/:id (doctor only)
const deleteAppointment = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor)
            return res.status(403).json({ success: false, message: 'Doctor record not found.' });

        const appt = await Appointment.findOne({ id: parseInt(req.params.id), doctor_id: doctor.doctor_id });
        if (!appt)
            return res.status(403).json({ success: false, message: 'Appointment not found or unauthorized.' });

        await Appointment.deleteOne({ id: parseInt(req.params.id) });
        res.json({ success: true, message: 'Appointment deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
};

// DELETE /api/appointments/cancel/:id (patient only — own pending appointments)
const cancelAppointment = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient)
            return res.status(403).json({ success: false, message: 'Patient record not found.' });

        const appt = await Appointment.findOne({ id: parseInt(req.params.id), patient_id: patient.patient_id });
        if (!appt)
            return res.status(403).json({ success: false, message: 'Appointment not found or unauthorized.' });

        await Appointment.deleteOne({ id: parseInt(req.params.id) });
        res.json({ success: true, message: 'Appointment cancelled successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
};

module.exports = { bookAppointment, listAppointments, updateAppointment, getAppointmentStats, deleteAppointment, cancelAppointment };
