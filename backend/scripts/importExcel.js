/**
 * Import all Excel files from backend/data/ into MongoDB
 * Usage: node scripts/importExcel.js
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

// Load models
const Student = require('../models/Student');
const Syllabus = require('../models/Syllabus');
const Timetable = require('../models/Timetable');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ssce_portal';

async function importExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  console.log(`📄 Processing ${path.basename(filePath)} with ${rows.length} rows`);

  const fname = path.basename(filePath).toLowerCase();

  // --- Syllabus ---
  if (fname.includes('syllabus')) {
    for (const row of rows) {
      const regulation = fname.includes('2021') ? '2021' : fname.includes('2025') ? '2025' : 'unknown';
      const semester = row['SEMESTER'] || row['Semester'];
      const deptCode = row['PROGRAM CODE'] || row['Program Code'];
      const courseCode = row['SUBJECT CODE'] || row['Course Code'];
      const courseName = row['SUBJECT NAME'] || row['Course Name'];

      if (!courseCode || !courseName) continue;

      await Syllabus.updateOne(
        { regulation, deptCode, semester, courseCode },
        { $set: { regulation, deptCode, semester, courseCode, courseName } },
        { upsert: true }
      );
    }
    console.log(`✅ Inserted syllabus from ${fname}`);
    return;
  }

  // --- Timetable ---
  if (fname.includes('timetable')) {
    for (const row of rows) {
      const semRaw = row['Semester'];
      const semester = semRaw || 'unknown';
      const deptCode = row['Program Code'] || 'unknown';
      const courseCode = row['Sub-Code'];
      const courseName = row['Subject Name'];
      const dateRaw = row['Date'];
      const session = row['Session'];

      if (!courseCode || !dateRaw) continue;

      let dateISO = null;
      if (typeof dateRaw === 'string') {
        const [d, m, y] = dateRaw.split('-');
        const yyyy = Number(y) < 50 ? `20${y}` : `19${y}`;
        dateISO = `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (typeof dateRaw === 'number') {
        const jsDate = xlsx.SSF.parse_date_code(dateRaw);
        const yyyy = jsDate.y;
        const mm = String(jsDate.m).padStart(2, '0');
        const dd = String(jsDate.d).padStart(2, '0');
        dateISO = `${yyyy}-${mm}-${dd}`;
      } else {
        console.warn(`⚠️ Skipping row with invalid date:`, dateRaw);
        continue;
      }

      await Timetable.updateOne(
        { date: dateISO, session, deptCode, courseCode },
        { $set: { date: dateISO, session, deptCode, semester, regulation: '2025', courseCode, courseName } },
        { upsert: true }
      );
    }
    console.log(`✅ Inserted timetable from ${fname}`);
    return;
  }

  // --- Students ---
  for (const row of rows) {
    const regNo = row['Register Number'] || row['Reg No'] || row['Reg Number'];
    const name = row['Name of the Student'] || row['Student Name'] || row['Name'];
    const deptCode = row['Program Code'] || row['Dept'];
    const batchMatch = fname.match(/\d{4}-\d{4}/);
    const batch = batchMatch ? batchMatch[0] : 'unknown';

    if (!regNo || !name) continue;

    await Student.updateOne(
      { regNo },
      { $set: { regNo, name, batch, deptCode } },
      { upsert: true }
    );
  }
  console.log(`✅ Inserted students from ${fname}`);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('🚀 Connected to MongoDB');

  const dataDir = path.join(__dirname, '../data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));

  for (const file of files) {
    await importExcelFile(path.join(dataDir, file));
  }

  console.log('🎉 Import complete');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
