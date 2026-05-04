const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const TelemedicineSession = require('../models/TelemedicineSession');

const startSession = async (req, res) => {
    try {
        const { appointment_id } = req.body;
        if (!appointment_id) return res.status(400).json({ success: false, message: 'Appointment ID required.' });

        const appt = await Appointment.findOne({ id: appointment_id });
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });

        const patient = await Patient.findOne({ patient_id: appt.patient_id });
        const patientUser = patient ? await User.findOne({ id: patient.user_id }) : null;

        const roomName = `VitalSync-Session-${appointment_id}-${Math.floor(Math.random() * 10000)}`;
        const meeting_link = `https://meet.jit.si/${roomName}`;

        await TelemedicineSession.findOneAndUpdate(
            { appointment_id },
            { meeting_link, status: 'active' },
            { upsert: true, new: true }
        );

        const io = req.app.get('io');
        if (io && patient) {
            io.to(`user_${patient.user_id}`).emit('telemedicine_session_started', {
                appointment_id, meeting_link, doctor_name: req.user.name,
                message: `Dr. ${req.user.name} has started your video consultation. Click here to join.`
            });
        }

        res.json({ success: true, meeting_link, message: 'Telemedicine session started and patient notified.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getSession = async (req, res) => {
    try {
        const session = await TelemedicineSession.findOne({ appointment_id: parseInt(req.params.appointment_id), status: 'active' });
        if (!session) return res.status(404).json({ success: false, message: 'No active session found.' });
        res.json({ success: true, session });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const endSession = async (req, res) => {
    try {
        await TelemedicineSession.updateOne({ appointment_id: req.body.appointment_id }, { status: 'ended' });
        res.json({ success: true, message: 'Session ended.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { startSession, getSession, endSession };
