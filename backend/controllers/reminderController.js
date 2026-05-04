const Notification = require('../models/Notification');
const MedicationSchedule = require('../models/MedicationSchedule');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const ReminderSent = require('../models/ReminderSent');

function scheduleReminders(io) {
    console.log('⏰ Medication Reminder Scheduler started.');

    const run = async () => {
        try {
            const now = new Date();
            const schedules = await MedicationSchedule.find({ is_active: 1 });

            for (const sched of schedules) {
                // Check if expired
                const endDate = new Date(sched.start_date);
                endDate.setDate(endDate.getDate() + sched.duration_days);
                if (endDate < now) { await MedicationSchedule.updateOne({ id: sched.id }, { is_active: 0 }); continue; }

                // Check if reminder due
                if (sched.last_reminder_sent) {
                    const nextDue = new Date(sched.last_reminder_sent);
                    nextDue.setHours(nextDue.getHours() + sched.frequency_hours);
                    if (nextDue > now) continue;
                }

                const p = await Patient.findOne({ patient_id: sched.patient_id });
                if (!p) continue;
                const pUser = await User.findOne({ id: p.user_id });
                const d = await Doctor.findOne({ doctor_id: sched.doctor_id });
                const dUser = d ? await User.findOne({ id: d.user_id }) : null;

                const message = `💊 Time to take your medicine: ${sched.medicine_name}`;

                await Notification.create({ recipient_id: p.user_id, patient_id: sched.patient_id, type: 'reminder', vital_type: 'Medication', value: sched.medicine_name, message });
                const rem = await ReminderSent.create({ schedule_id: sched.id, patient_id: sched.patient_id, status: 'pending' });

                if (io) {
                    io.to(`user_${p.user_id}`).emit('medication_reminder', {
                        reminder_id: rem.reminder_id, schedule_id: sched.id,
                        medicine: sched.medicine_name, message,
                        doctor_name: dUser ? dUser.name : null, timestamp: new Date().toISOString(),
                    });
                }

                await MedicationSchedule.updateOne({ id: sched.id }, { last_reminder_sent: now });
                console.log(`⏰ Medication reminder sent to patient ${pUser ? pUser.name : 'unknown'}: ${sched.medicine_name}`);
            }
        } catch (err) { console.error('Reminder scheduler error:', err.message); }
    };

    setInterval(run, 60000);
    setTimeout(run, 5000);
}

const getMyReminders = async (req, res) => {
    try {
        const notifs = await Notification.find({ recipient_id: req.user.id, type: 'reminder' }).sort({ created_at: -1 }).limit(20);
        res.json({ success: true, reminders: notifs });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getActiveSchedules = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
        const scheds = await MedicationSchedule.find({ patient_id: patient.patient_id, is_active: 1 }).sort({ start_date: -1 });
        const results = [];
        for (const ms of scheds) {
            const d = await Doctor.findOne({ doctor_id: ms.doctor_id });
            const du = d ? await User.findOne({ id: d.user_id }) : null;
            results.push({ ...ms.toObject(), doctor_name: du ? du.name : null });
        }
        res.json({ success: true, schedules: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const markAsTaken = async (req, res) => {
    try {
        const { reminder_id } = req.params;
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false });
        const result = await ReminderSent.updateOne({ reminder_id: parseInt(reminder_id), patient_id: patient.patient_id }, { status: 'taken', taken_at: new Date() });
        if (result.modifiedCount === 0) return res.status(404).json({ success: false, message: 'Reminder record not found or already processed.' });
        res.json({ success: true, message: 'Medication marked as taken! Stay healthy.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { scheduleReminders, getMyReminders, getActiveSchedules, markAsTaken };
