// Run `npm run seed` to add any missing example allocations to MongoDB.
require('dotenv').config();
const { getDatabase, closeDatabase } = require('./db');

const allocations = [
  { allocationId: 'AL-1001', courseCode: 'CS101', courseName: 'Introduction to Programming', department: 'Information Technology', building: 'North Block', roomNumber: 'N-101', day: 'Monday', startTime: '09:00', endTime: '10:00', capacity: 60 },
  { allocationId: 'AL-1002', courseCode: 'CS201', courseName: 'Data Structures', department: 'Computer Science', building: 'North Block', roomNumber: 'N-102', day: 'Monday', startTime: '10:00', endTime: '11:30', capacity: 45 },
  { allocationId: 'AL-1003', courseCode: 'IT210', courseName: 'Database Systems', department: 'Information Technology', building: 'East Wing', roomNumber: 'E-201', day: 'Tuesday', startTime: '09:00', endTime: '10:30', capacity: 50 },
  { allocationId: 'AL-1004', courseCode: 'MA105', courseName: 'Discrete Mathematics', department: 'Mathematics', building: 'Science Hall', roomNumber: 'S-110', day: 'Tuesday', startTime: '11:00', endTime: '12:00', capacity: 70 },
  { allocationId: 'AL-1005', courseCode: 'EC101', courseName: 'Basic Electronics', department: 'Electronics', building: 'East Wing', roomNumber: 'E-105', day: 'Wednesday', startTime: '09:30', endTime: '11:00', capacity: 40 },
  { allocationId: 'AL-1006', courseCode: 'CS305', courseName: 'Web Development', department: 'Computer Science', building: 'North Block', roomNumber: 'N-205', day: 'Wednesday', startTime: '13:00', endTime: '14:30', capacity: 55 },
  { allocationId: 'AL-1007', courseCode: 'HS110', courseName: 'Technical Communication', department: 'Humanities', building: 'Central Building', roomNumber: 'C-301', day: 'Thursday', startTime: '10:00', endTime: '11:00', capacity: 80 },
  { allocationId: 'AL-1008', courseCode: 'IT315', courseName: 'Computer Networks', department: 'Information Technology', building: 'East Wing', roomNumber: 'E-202', day: 'Thursday', startTime: '11:30', endTime: '13:00', capacity: 48 },
  { allocationId: 'AL-1009', courseCode: 'PH102', courseName: 'Applied Physics', department: 'Physics', building: 'Science Hall', roomNumber: 'S-205', day: 'Friday', startTime: '09:00', endTime: '10:30', capacity: 65 },
  { allocationId: 'AL-1010', courseCode: 'CS220', courseName: 'Object-Oriented Programming', department: 'Computer Science', building: 'North Block', roomNumber: 'N-103', day: 'Friday', startTime: '11:00', endTime: '12:30', capacity: 45 },
  { allocationId: 'AL-1011', courseCode: 'MA220', courseName: 'Probability and Statistics', department: 'Mathematics', building: 'Science Hall', roomNumber: 'S-111', day: 'Monday', startTime: '14:00', endTime: '15:00', capacity: 60 },
  { allocationId: 'AL-1012', courseCode: 'IT330', courseName: 'Cloud Computing', department: 'Information Technology', building: 'Central Building', roomNumber: 'C-210', day: 'Tuesday', startTime: '14:00', endTime: '15:30', capacity: 35 },
  { allocationId: 'AL-1013', courseCode: 'EC220', courseName: 'Digital Circuits', department: 'Electronics', building: 'East Wing', roomNumber: 'E-108', day: 'Wednesday', startTime: '11:00', endTime: '12:30', capacity: 42 },
  { allocationId: 'AL-1014', courseCode: 'CS410', courseName: 'Artificial Intelligence', department: 'Computer Science', building: 'North Block', roomNumber: 'N-301', day: 'Thursday', startTime: '14:00', endTime: '15:30', capacity: 36 },
  { allocationId: 'AL-1015', courseCode: 'HS205', courseName: 'Professional Ethics', department: 'Humanities', building: 'Central Building', roomNumber: 'C-105', day: 'Friday', startTime: '13:00', endTime: '14:00', capacity: 75 }
];

async function seed() {
  try {
    const db = await getDatabase();
    const collection = db.collection('allocations');
    await collection.createIndex({ allocationId: 1 }, { unique: true });
    await collection.createIndex({ courseCode: 1 });
    const operations = allocations.map((item) => ({
      updateOne: {
        filter: { allocationId: item.allocationId },
        update: { $setOnInsert: item },
        upsert: true
      }
    }));
    const result = await collection.bulkWrite(operations, { ordered: true });
    console.log(`Sample data ready. Added ${result.upsertedCount} new allocations; existing records were kept.`);
  } catch (error) {
    console.error('Could not seed MongoDB:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

seed();
