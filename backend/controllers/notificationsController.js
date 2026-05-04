const Notification = require('../models/Notification');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

const getNotifications = async (req, res) => {
    try {
        const notifs = await Notification.find({ recipient_id: req.user.id }).sort({ created_at: -1 }).limit(50);
        const results = [];
        for (const n of notifs) {
            let patient_name = null;
            if (n.patient_id) {
                const p = await Patient.findOne({ patient_id: n.patient_id });
                if (p) { const u = await User.findOne({ id: p.user_id }); if (u) patient_name = u.name; }
            }
            results.push({ ...n.toObject(), patient_name });
        }
        const unread = results.filter(r => !r.is_read).length;
        res.json({ success: true, notifications: results, unread });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getUnreadCritical = async (req, res) => {
    try {
        const alerts = await Notification.find({ recipient_id: req.user.id, is_read: 0, type: { $in: ['critical', 'sos'] } }).sort({ created_at: -1 }).limit(10);
        const results = [];
        for (const n of alerts) {
            let patient_name = null;
            if (n.patient_id) { const p = await Patient.findOne({ patient_id: n.patient_id }); if (p) { const u = await User.findOne({ id: p.user_id }); if (u) patient_name = u.name; } }
            results.push({ ...n.toObject(), patient_name });
        }
        res.json({ success: true, alerts: results, count: results.length });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const markRead = async (req, res) => {
    try {
        await Notification.updateOne({ id: parseInt(req.params.id), recipient_id: req.user.id }, { is_read: 1 });
        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient_id: req.user.id }, { is_read: 1 });
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const triggerSOS = async (req, res) => {
    const io = req.app.get('io');
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
        const patientUser = await User.findOne({ id: req.user.id });
        const { patient_id } = patient;
        const patient_name = patientUser.name;
        const patient_phone = patientUser.phone;
        const message = `🆘 Emergency SOS triggered by patient ${patient_name}! Immediate attention required.`;

        // Find assigned doctors
        const appts = await Appointment.find({ patient_id });
        const docIds = [...new Set(appts.map(a => a.doctor_id))].slice(0, 5);
        let doctors = [];
        for (const did of docIds) {
            const d = await Doctor.findOne({ doctor_id: did });
            if (!d) continue;
            const u = await User.findOne({ id: d.user_id });
            if (!u) continue;
            doctors.push({ doctor_user_id: d.user_id, doctor_id: d.doctor_id, doctor_name: u.name, doctor_phone: u.phone });
        }

        if (doctors.length === 0) {
            const allDocs = await Doctor.find().limit(5);
            for (const d of allDocs) {
                const u = await User.findOne({ id: d.user_id });
                if (u) doctors.push({ doctor_user_id: d.user_id, doctor_id: d.doctor_id, doctor_name: u.name, doctor_phone: u.phone });
            }
        }

        const socketPayload = { patient_name, patient_id, patient_phone, message, timestamp: new Date().toISOString() };

        if (doctors.length > 0) {
            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const queueToken = `SOS-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
            await Appointment.create({ patient_id, doctor_id: doctors[0].doctor_id, appointment_date: new Date(), status: 'pending', notes: 'EMERGENCY SOS', priority: 'high', queue_token: queueToken, triage_result: 'SOS TRIGGER' });
        }

        for (const doc of doctors) {
            const notif = await Notification.create({ recipient_id: doc.doctor_user_id, patient_id, type: 'sos', vital_type: 'SOS', value: 'EMERGENCY', message });
            if (io) { io.to(`user_${doc.doctor_user_id}`).emit('emergency_sos', { ...socketPayload, id: notif.id }); }
            console.log(`\n📲 Emergency SMS sent to doctor ${doc.doctor_name} (${doc.doctor_phone})`);
        }

        if (io) io.to('doctors').emit('emergency_sos', socketPayload);

        res.json({ success: true, message: 'Emergency SOS alert sent to your doctor(s).', doctors_notified: doctors.length });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getNotifications, getUnreadCritical, markRead, markAllRead, triggerSOS };
