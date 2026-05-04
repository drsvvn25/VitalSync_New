/**
 * VitalSync – MongoDB Seed Script
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Clinic = require('./models/Clinic');
const Appointment = require('./models/Appointment');
const VitalStat = require('./models/VitalStat');
const MedicalRecord = require('./models/MedicalRecord');
const Bed = require('./models/Bed');
const Ambulance = require('./models/Ambulance');
const BloodInventory = require('./models/BloodInventory');
const PatientWallet = require('./models/PatientWallet');
const Counter = require('./models/Counter');

async function seed() {
    console.log('\n🌱 VitalSync MongoDB Seeder');
    console.log('================================\n');

    try {
        await connectDB();

        // 1. Clear all collections
        console.log('🗑️  Clearing existing data...');
        const collections = [User, Patient, Doctor, Clinic, Appointment, VitalStat, MedicalRecord, Bed, Ambulance, BloodInventory, PatientWallet, Counter];
        for (const Model of collections) { await Model.deleteMany({}); }
        console.log('   ✅ Collections cleared.\n');

        // 2. Hash password
        const RAW_PASSWORD = 'Password@123';
        console.log(`🔑 Hashing password "${RAW_PASSWORD}"...`);
        const hash = await bcrypt.hash(RAW_PASSWORD, 12);

        // 3. Insert users
        console.log('👤 Inserting users...');
        const doc1 = await User.create({ name: 'Dr. Priya Sharma', email: 'doctor1@vitalsync.com', password: hash, role: 'doctor', phone: '9876543210' });
        const doc2 = await User.create({ name: 'Dr. Raj Mehta', email: 'doctor2@vitalsync.com', password: hash, role: 'doctor', phone: '9876543211' });
        const pat1 = await User.create({ name: 'Ananya Patel', email: 'patient1@vitalsync.com', password: hash, role: 'patient', phone: '9123456780' });
        const pat2 = await User.create({ name: 'Rohit Verma', email: 'patient2@vitalsync.com', password: hash, role: 'patient', phone: '9123456781' });
        const pat3 = await User.create({ name: 'Sita Krishnan', email: 'patient3@vitalsync.com', password: hash, role: 'patient', phone: '9123456782' });
        console.log(`   ✅ 2 doctors, 3 patients inserted\n`);

        // 4. Insert clinics
        console.log('🏥 Inserting clinics...');
        const c1 = await Clinic.create({ name: 'Zydus Hospital Anand', address: 'Anand-Vidyanagar Road, Anand', latitude: 22.5560, longitude: 72.9510, city: 'Anand', district: 'Anand', contact: '02692-200002', type: 'hospital' });
        const c2 = await Clinic.create({ name: 'Sanjivani Hospital', address: 'Grid Road, Anand', latitude: 22.5613, longitude: 72.9608, city: 'Anand', district: 'Anand', contact: '02692-234000', type: 'hospital' });
        const c3 = await Clinic.create({ name: 'Shree Krishna Hospital', address: 'Karamsad Road, Anand', latitude: 22.5598, longitude: 72.9352, city: 'Anand', district: 'Anand', contact: '02692-244500', type: 'hospital' });
        const c4 = await Clinic.create({ name: 'Anand Orthopaedic Centre', address: 'Triveni Road, Anand', latitude: 22.5651, longitude: 72.9333, city: 'Anand', district: 'Anand', contact: '02692-248000', type: 'clinic' });
        const c5 = await Clinic.create({ name: 'Apollo Pharmacy - Anand', address: 'MG Road, Near Town Hall, Anand', latitude: 22.5622, longitude: 72.9298, city: 'Anand', district: 'Anand', contact: '1800-180-1061', type: 'pharmacy' });
        console.log(`   ✅ 5 clinics inserted\n`);

        // 5. Insert doctors
        console.log('🩺 Inserting doctor profiles...');
        const d1 = await Doctor.create({ user_id: doc1.id, clinic_id: c1.clinic_id, specialization: 'Cardiologist', experience: 10 });
        const d2 = await Doctor.create({ user_id: doc2.id, clinic_id: c2.clinic_id, specialization: 'General Physician', experience: 7 });
        console.log(`   ✅ Doctor profiles created\n`);

        // 6. Insert patients
        console.log('🧑 Inserting patient profiles...');
        const p1 = await Patient.create({ user_id: pat1.id, age: 28, gender: 'Female', blood_group: 'B+', address: '12 MG Road, Ahmedabad, Gujarat' });
        const p2 = await Patient.create({ user_id: pat2.id, age: 35, gender: 'Male', blood_group: 'O+', address: '45 Civil Lines, Surat, Gujarat' });
        const p3 = await Patient.create({ user_id: pat3.id, age: 22, gender: 'Female', blood_group: 'A+', address: '78 Stadium Road, Vadodara, Gujarat' });
        console.log(`   ✅ 3 patients inserted\n`);

        // 7. Insert vitals
        console.log('💓 Inserting vital stats...');
        const vitalsData = [
            { patient_id: p1.patient_id, heart_rate: 72, blood_pressure: '120/80', oxygen_level: 98.5, temperature: 36.6, record_date: new Date('2026-03-01T08:00:00') },
            { patient_id: p1.patient_id, heart_rate: 88, blood_pressure: '130/85', oxygen_level: 97, temperature: 37.0, record_date: new Date('2026-03-02T08:00:00') },
            { patient_id: p1.patient_id, heart_rate: 65, blood_pressure: '118/78', oxygen_level: 99, temperature: 36.5, record_date: new Date('2026-03-03T08:00:00') },
            { patient_id: p1.patient_id, heart_rate: 110, blood_pressure: '140/90', oxygen_level: 94, temperature: 37.5, record_date: new Date('2026-03-04T08:00:00') },
            { patient_id: p1.patient_id, heart_rate: 76, blood_pressure: '122/82', oxygen_level: 98, temperature: 36.7, record_date: new Date('2026-03-05T08:00:00') },
            { patient_id: p2.patient_id, heart_rate: 80, blood_pressure: '125/82', oxygen_level: 96, temperature: 36.8, record_date: new Date('2026-03-03T09:00:00') },
            { patient_id: p2.patient_id, heart_rate: 75, blood_pressure: '120/80', oxygen_level: 97.5, temperature: 36.6, record_date: new Date('2026-03-05T09:00:00') },
            { patient_id: p3.patient_id, heart_rate: 68, blood_pressure: '115/75', oxygen_level: 99, temperature: 36.4, record_date: new Date('2026-03-04T10:00:00') },
        ];
        for (const v of vitalsData) await VitalStat.create(v);
        console.log(`   ✅ ${vitalsData.length} vitals inserted\n`);

        // 8. Insert appointments
        console.log('📅 Inserting appointments...');
        await Appointment.create({ patient_id: p1.patient_id, doctor_id: d1.doctor_id, appointment_date: new Date('2026-03-10T10:00:00'), status: 'confirmed', notes: 'Regular cardiac check-up' });
        await Appointment.create({ patient_id: p1.patient_id, doctor_id: d2.doctor_id, appointment_date: new Date('2026-03-12T14:00:00'), status: 'pending', notes: 'Flu symptoms follow-up' });
        await Appointment.create({ patient_id: p2.patient_id, doctor_id: d1.doctor_id, appointment_date: new Date('2026-03-11T11:00:00'), status: 'pending', notes: 'Chest pain review' });
        await Appointment.create({ patient_id: p3.patient_id, doctor_id: d2.doctor_id, appointment_date: new Date('2026-03-09T09:30:00'), status: 'completed', notes: 'Annual health check' });
        console.log('   ✅ 4 appointments inserted\n');

        // 9. Insert medical records
        console.log('📋 Inserting medical records...');
        await MedicalRecord.create({ patient_id: p1.patient_id, doctor_id: d1.doctor_id, diagnosis: 'Mild hypertension', prescription: 'Amlodipine 5mg once daily', notes: 'Reduce sodium intake.', date: new Date('2026-02-15T10:00:00') });
        await MedicalRecord.create({ patient_id: p1.patient_id, doctor_id: d2.doctor_id, diagnosis: 'Viral fever', prescription: 'Paracetamol 500mg if temp > 38°C', notes: 'Rest and hydration.', date: new Date('2026-02-20T11:30:00') });
        await MedicalRecord.create({ patient_id: p2.patient_id, doctor_id: d1.doctor_id, diagnosis: 'Stable angina', prescription: 'Aspirin 75mg once daily', notes: 'Avoid strenuous activity.', date: new Date('2026-03-01T09:00:00') });
        await MedicalRecord.create({ patient_id: p3.patient_id, doctor_id: d2.doctor_id, diagnosis: 'Iron deficiency anaemia', prescription: 'Ferrous Sulfate 200mg twice daily', notes: 'Iron-rich diet.', date: new Date('2026-02-25T10:00:00') });
        console.log('   ✅ 4 records inserted\n');

        // 10. Beds
        console.log('🛏️  Inserting beds...');
        const wards = ['General', 'ICU', 'Emergency'];
        for (const clinic of [c1, c2]) {
            for (const ward of wards) {
                for (let i = 1; i <= 3; i++) {
                    await Bed.create({ clinic_id: clinic.clinic_id, ward_type: ward, bed_number: `${ward[0]}${i}` });
                }
            }
        }
        console.log('   ✅ 18 beds inserted\n');

        // 11. Ambulances
        console.log('🚑 Inserting ambulances...');
        await Ambulance.create({ vehicle_number: 'GJ-01-AB-1234', driver_name: 'Rajesh Kumar', driver_phone: '9999888811' });
        await Ambulance.create({ vehicle_number: 'GJ-01-CD-5678', driver_name: 'Vijay Singh', driver_phone: '9999888822' });
        console.log('   ✅ 2 ambulances inserted\n');

        // 12. Blood Inventory
        console.log('🩸 Inserting blood inventory...');
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        for (const bg of bloodGroups) {
            await BloodInventory.create({ clinic_id: c1.clinic_id, blood_group: bg, available_units: Math.floor(Math.random() * 20) + 5 });
        }
        console.log('   ✅ Blood inventory seeded\n');

        // 13. Patient Wallets
        console.log('💰 Creating patient wallets...');
        await PatientWallet.create({ patient_id: p1.patient_id, balance: 500 });
        await PatientWallet.create({ patient_id: p2.patient_id, balance: 300 });
        await PatientWallet.create({ patient_id: p3.patient_id, balance: 0 });
        console.log('   ✅ Wallets created\n');

        console.log('================================');
        console.log('🎉 Seed complete! All sample data inserted.\n');
        console.log('📋 Login credentials:');
        console.log('   Doctor:  doctor1@vitalsync.com  | Password@123');
        console.log('   Doctor:  doctor2@vitalsync.com  | Password@123');
        console.log('   Patient: patient1@vitalsync.com | Password@123');
        console.log('   Patient: patient2@vitalsync.com | Password@123');
        console.log('   Patient: patient3@vitalsync.com | Password@123\n');
    } catch (err) {
        console.error('\n❌ Seed error:', err.message);
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
