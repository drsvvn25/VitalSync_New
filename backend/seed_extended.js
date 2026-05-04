/**
 * VitalSync – Extended MongoDB Seed Script (Anand & Nadiad)
 * Run: node seed_extended.js
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
    console.log('\n🌱 VitalSync MongoDB Extended Seeder (Anand & Nadiad)');
    console.log('========================================================\n');

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

        // 3. Insert Clinics (10 Clinics - 5 Anand, 5 Nadiad)
        console.log('🏥 Inserting 10 Clinics (Anand & Nadiad)...');
        const clinicsData = [
            // Anand Clinics
            { name: 'Zydus Hospital Anand', address: 'Anand-Lambhvel Road, Anand', latitude: 22.5458, longitude: 72.9348, city: 'Anand', district: 'Anand', contact: '02692-200001', type: 'hospital' },
            { name: 'Sanjivani Hospital', address: 'Grid Road, Anand', latitude: 22.5512, longitude: 72.9234, city: 'Anand', district: 'Anand', contact: '02692-234000', type: 'hospital' },
            { name: 'Shree Krishna Hospital', address: 'Karamsad Road, Anand', latitude: 22.5399, longitude: 72.8942, city: 'Anand', district: 'Anand', contact: '02692-244500', type: 'hospital' },
            { name: 'Anand Orthopaedic Centre', address: 'Triveni Road, Anand', latitude: 22.5624, longitude: 72.9601, city: 'Anand', district: 'Anand', contact: '02692-248000', type: 'clinic' },
            { name: 'Apollo Clinic Anand', address: 'MG Road, Near Town Hall, Anand', latitude: 22.5555, longitude: 72.9444, city: 'Anand', district: 'Anand', contact: '1800-180-1061', type: 'clinic' },
            // Nadiad Clinics
            { name: 'Dr. N.D. Desai Medical College and Hospital', address: 'College Road, Nadiad', latitude: 22.6797, longitude: 72.8802, city: 'Nadiad', district: 'Kheda', contact: '0268-2527000', type: 'hospital' },
            { name: 'MahaGujarat Medical Hospital', address: 'Ashram Road, Nadiad', latitude: 22.6886, longitude: 72.8711, city: 'Nadiad', district: 'Kheda', contact: '0268-2520001', type: 'hospital' },
            { name: 'Muljibhai Patel Urological Hospital', address: 'Dr. Virendra Desai Rd, Nadiad', latitude: 22.6831, longitude: 72.8722, city: 'Nadiad', district: 'Kheda', contact: '0268-2520323', type: 'hospital' },
            { name: 'Civil Hospital Nadiad', address: 'Station Road, Nadiad', latitude: 22.6900, longitude: 72.8600, city: 'Nadiad', district: 'Kheda', contact: '0268-2562111', type: 'hospital' },
            { name: 'Dharmsinh Desai Hospital', address: 'DDIT Campus, Nadiad', latitude: 22.6860, longitude: 72.8460, city: 'Nadiad', district: 'Kheda', contact: '0268-2520502', type: 'hospital' }
        ];
        const clinics = [];
        for (const c of clinicsData) { clinics.push(await Clinic.create(c)); }
        console.log(`   ✅ 10 clinics inserted\n`);

        // 4. Insert 10 Doctors (Users + Doctor Profiles)
        console.log('🩺 Inserting 10 Doctors...');
        const doctorsData = [
            { name: 'Dr. Priya Sharma', email: 'doctor1@vitalsync.com', spec: 'Cardiologist', exp: 12, phone: '9876543210' },
            { name: 'Dr. Raj Mehta', email: 'doctor2@vitalsync.com', spec: 'General Physician', exp: 8, phone: '9876543211' },
            { name: 'Dr. Amit Patel', email: 'doctor3@vitalsync.com', spec: 'Orthopaedic', exp: 15, phone: '9876543212' },
            { name: 'Dr. Sneha Desai', email: 'doctor4@vitalsync.com', spec: 'Pediatrician', exp: 5, phone: '9876543213' },
            { name: 'Dr. Vikram Singh', email: 'doctor5@vitalsync.com', spec: 'Neurologist', exp: 20, phone: '9876543214' },
            { name: 'Dr. Anjali Joshi', email: 'doctor6@vitalsync.com', spec: 'Gynecologist', exp: 11, phone: '9876543215' },
            { name: 'Dr. Rahul Verma', email: 'doctor7@vitalsync.com', spec: 'Urologist', exp: 14, phone: '9876543216' },
            { name: 'Dr. Kavita Shah', email: 'doctor8@vitalsync.com', spec: 'Dermatologist', exp: 9, phone: '9876543217' },
            { name: 'Dr. Sanjay Gupta', email: 'doctor9@vitalsync.com', spec: 'Surgeon', exp: 18, phone: '9876543218' },
            { name: 'Dr. Neha Trivedi', email: 'doctor10@vitalsync.com', spec: 'ENT Specialist', exp: 7, phone: '9876543219' }
        ];
        const doctorModels = [];
        for (let i = 0; i < doctorsData.length; i++) {
            const d = doctorsData[i];
            const u = await User.create({ name: d.name, email: d.email, password: hash, role: 'doctor', phone: d.phone });
            const docProf = await Doctor.create({ user_id: u.id, clinic_id: clinics[i].clinic_id, specialization: d.spec, experience: d.exp });
            doctorModels.push(docProf);
        }
        console.log(`   ✅ 10 doctors inserted\n`);

        // 5. Insert 10 Patients (Users + Patient Profiles)
        console.log('🧑 Inserting 10 Patients...');
        const patientsData = [
            { name: 'Ananya Patel', email: 'patient1@vitalsync.com', age: 28, gender: 'Female', bg: 'B+', addr: '12 MG Road, Anand', phone: '9123456780' },
            { name: 'Rohit Verma', email: 'patient2@vitalsync.com', age: 35, gender: 'Male', bg: 'O+', addr: '45 Civil Lines, Nadiad', phone: '9123456781' },
            { name: 'Sita Krishnan', email: 'patient3@vitalsync.com', age: 22, gender: 'Female', bg: 'A+', addr: '78 Stadium Road, Anand', phone: '9123456782' },
            { name: 'Karan Patel', email: 'patient4@vitalsync.com', age: 45, gender: 'Male', bg: 'AB+', addr: '11 College Road, Nadiad', phone: '9123456783' },
            { name: 'Meera Rajput', email: 'patient5@vitalsync.com', age: 31, gender: 'Female', bg: 'O-', addr: '22 Station Rd, Anand', phone: '9123456784' },
            { name: 'Vikas Sharma', email: 'patient6@vitalsync.com', age: 50, gender: 'Male', bg: 'B-', addr: '99 Ashram Road, Nadiad', phone: '9123456785' },
            { name: 'Pooja Desai', email: 'patient7@vitalsync.com', age: 26, gender: 'Female', bg: 'A-', addr: '5 VV Nagar, Anand', phone: '9123456786' },
            { name: 'Suresh Kumar', email: 'patient8@vitalsync.com', age: 62, gender: 'Male', bg: 'O+', addr: '101 Highway, Nadiad', phone: '9123456787' },
            { name: 'Neha Bhatt', email: 'patient9@vitalsync.com', age: 29, gender: 'Female', bg: 'B+', addr: '15 Townhall, Anand', phone: '9123456788' },
            { name: 'Ravi Joshi', email: 'patient10@vitalsync.com', age: 38, gender: 'Male', bg: 'AB-', addr: '88 Main Bazaar, Nadiad', phone: '9123456789' }
        ];
        const patientModels = [];
        for (const p of patientsData) {
            const u = await User.create({ name: p.name, email: p.email, password: hash, role: 'patient', phone: p.phone });
            const patProf = await Patient.create({ user_id: u.id, age: p.age, gender: p.gender, blood_group: p.bg, address: p.addr });
            patientModels.push(patProf);
        }
        console.log(`   ✅ 10 patients inserted\n`);

        // 6. Insert Vitals (30+ records)
        console.log('💓 Inserting Vital Stats...');
        const vitals = [];
        for (const p of patientModels) {
            const count = Math.floor(Math.random() * 11) + 10;
            for (let i = 0; i < count; i++) {
                const daysAgo = Math.floor(Math.random() * 30) + 1;
                const recDate = new Date();
                recDate.setDate(recDate.getDate() - daysAgo);
                vitals.push({
                    patient_id: p.patient_id,
                    heart_rate: 65 + Math.floor(Math.random() * 30),
                    blood_pressure: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
                    oxygen_level: 95 + Math.floor(Math.random() * 5),
                    temperature: parseFloat((36.5 + (Math.random() * 1.5)).toFixed(1)),
                    sugar_level: 80 + Math.floor(Math.random() * 60),
                    record_date: recDate
                });
            }
        }
        for (const v of vitals) { await VitalStat.create(v); }
        console.log(`   ✅ ${vitals.length} vitals inserted\n`);

        // 7. Insert Appointments (15+ records)
        console.log('📅 Inserting Appointments...');
        const appointments = [];
        const statuses = ['completed', 'confirmed', 'pending', 'rejected'];
        for (const p of patientModels) {
            const count = Math.floor(Math.random() * 11) + 10;
            for (let i = 0; i < count; i++) {
                const d = doctorModels[Math.floor(Math.random() * doctorModels.length)];
                const daysOffset = Math.floor(Math.random() * 60) - 30;
                const appDate = new Date();
                appDate.setDate(appDate.getDate() + daysOffset);
                appointments.push({
                    patient_id: p.patient_id,
                    doctor_id: d.doctor_id,
                    appointment_date: appDate,
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    notes: `Detailed consultation ${i + 1}`
                });
            }
        }
        for (const a of appointments) { await Appointment.create(a); }
        console.log(`   ✅ ${appointments.length} appointments inserted\n`);

        // 8. Insert Medical Records
        console.log('📋 Inserting Medical Records...');
        const records = [];
        const diagnosesList = ['Viral Infection', 'Hypertension', 'Mild Asthma', 'Migraine', 'Back Pain', 'Seasonal Allergy', 'Gastritis', 'Anemia', 'Dengue Fever', 'Typhoid'];
        const presList = ['Paracetamol 500mg', 'Amlodipine 5mg', 'Salbutamol Inhaler', 'Ibuprofen 400mg', 'Physiotherapy', 'Antihistamine', 'Antacid', 'Iron Supplements', 'IV Fluids', 'Antibiotics'];
        for (const p of patientModels) {
            const count = Math.floor(Math.random() * 11) + 10;
            for (let i = 0; i < count; i++) {
                const d = doctorModels[Math.floor(Math.random() * doctorModels.length)];
                const daysAgo = Math.floor(Math.random() * 365);
                const rDate = new Date();
                rDate.setDate(rDate.getDate() - daysAgo);
                const diagIndex = Math.floor(Math.random() * diagnosesList.length);
                records.push({
                    patient_id: p.patient_id,
                    doctor_id: d.doctor_id,
                    diagnosis: diagnosesList[diagIndex],
                    prescription: presList[diagIndex],
                    notes: 'Regular checkup.',
                    date: rDate
                });
            }
        }
        for (const r of records) { await MedicalRecord.create(r); }
        console.log(`   ✅ ${records.length} medical records inserted\n`);

        // 9. Beds (3 wards, 5 beds each for all 10 clinics)
        console.log('🛏️  Inserting Beds...');
        const wards = ['General', 'ICU', 'Emergency'];
        const beds = [];
        for (const clinic of clinics) {
            for (const ward of wards) {
                for (let i = 1; i <= 3; i++) {
                    beds.push({ clinic_id: clinic.clinic_id, ward_type: ward, bed_number: `${ward[0]}${i}` });
                }
            }
        }
        for (const b of beds) { await Bed.create(b); }
        console.log(`   ✅ ${beds.length} beds inserted across 10 hospitals\n`);

        // 10. Ambulances (10 records)
        console.log('🚑 Inserting Ambulances...');
        const ambulancesData = [
            { vehicle_number: 'GJ-23-AB-1234', driver_name: 'Rajesh Kumar', driver_phone: '9999888811' },
            { vehicle_number: 'GJ-23-CD-5678', driver_name: 'Vijay Singh', driver_phone: '9999888822' },
            { vehicle_number: 'GJ-23-EF-9012', driver_name: 'Suresh Patel', driver_phone: '9999888833' },
            { vehicle_number: 'GJ-23-GH-3456', driver_name: 'Mukesh Bhai', driver_phone: '9999888844' },
            { vehicle_number: 'GJ-23-IJ-7890', driver_name: 'Dinesh Rathod', driver_phone: '9999888855' },
            { vehicle_number: 'GJ-07-KL-1234', driver_name: 'Naresh Joshi', driver_phone: '8888999911' },
            { vehicle_number: 'GJ-07-MN-5678', driver_name: 'Kirit Sharma', driver_phone: '8888999922' },
            { vehicle_number: 'GJ-07-OP-9012', driver_name: 'Jignesh Desai', driver_phone: '8888999933' },
            { vehicle_number: 'GJ-07-QR-3456', driver_name: 'Bhavesh Parmar', driver_phone: '8888999944' },
            { vehicle_number: 'GJ-07-ST-7890', driver_name: 'Manish Chauhan', driver_phone: '8888999955' }
        ];
        for (const a of ambulancesData) { await Ambulance.create(a); }
        console.log('   ✅ 10 ambulances inserted (Anand & Nadiad regions)\n');

        // 11. Blood Inventory
        console.log('🩸 Inserting Blood Inventory...');
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        const bloodData = [];
        for (const clinic of clinics) {
            for (const bg of bloodGroups) {
                bloodData.push({ clinic_id: clinic.clinic_id, blood_group: bg, available_units: Math.floor(Math.random() * 30) + 5 });
            }
        }
        for (const b of bloodData) { await BloodInventory.create(b); }
        console.log(`   ✅ ${bloodData.length} blood inventory records seeded\n`);

        // 12. Patient Wallets
        console.log('💰 Creating Patient Wallets...');
        const wallets = patientModels.map(p => ({
            patient_id: p.patient_id,
            balance: Math.floor(Math.random() * 5000) + 500
        }));
        for (const w of wallets) { await PatientWallet.create(w); }
        console.log('   ✅ 10 patient wallets created\n');

        console.log('========================================================');
        console.log('🎉 Seed complete! Database is fully populated.');
        console.log('========================================================\n');
        console.log('📋 Login credentials examples:');
        console.log('   Doctor:  doctor1@vitalsync.com  | Password@123');
        console.log('   Doctor:  doctor10@vitalsync.com | Password@123');
        console.log('   Patient: patient1@vitalsync.com | Password@123');
        console.log('   Patient: patient10@vitalsync.com| Password@123\n');
    } catch (err) {
        console.error('\n❌ Seed error:', err.message);
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
