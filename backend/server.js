const express = require('express');
const PDFDocument = require('pdfkit');

const mongoose = require('mongoose');
const cors = require('cors');

const Student = require('./models/Student');
const Syllabus = require('./models/Syllabus');
const Timetable = require('./models/Timetable');
const Attendance = require('./models/Attendance');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ssce_portal';
mongoose.connect(MONGO_URI).then(() => {
  console.log('MongoDB connected:', MONGO_URI);
}).catch(err => console.error('MongoDB connection error:', err));

// Health
app.get('/', (req, res) => res.send('SSCE Backend is running'));

/**
 * Students API
 * GET /api/students/:batch/:deptCode
 */
app.get('/api/students/:batch/:deptCode', async (req, res) => {
  const { batch, deptCode } = req.params;
  try {
    const students = await Student.find({ batch, deptCode }).sort({ regNo: 1 });
    res.json({ success: true, list: students });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Syllabus API
 * GET /api/syllabus/:regulation/:deptCode/:semester
 */
app.get('/api/syllabus/:regulation/:deptCode/:semester', async (req, res) => {
  const { regulation, deptCode, semester } = req.params;
  try {
    const papers = await Syllabus.find({ regulation, deptCode, semester }).sort({ courseCode: 1 });
    if (!papers.length) {
      return res.json({ success: false, message: 'No papers found for given criteria.' });
    }
    const out = papers.map(p => ({ code: p.courseCode, name: p.courseName }));
    res.json({ success: true, papers: out });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Timetable / Scheduled Exams
 * GET /api/exams?date=YYYY-MM-DD&session=FN|AN&deptCode=104
 */
app.get('/api/exams', async (req, res) => {
  const { date, session, deptCode } = req.query;
  try {
    const exams = await Timetable.find({ date, session, deptCode }).sort({ courseCode: 1 });
    if (!exams.length) {
      return res.json({ success: false, message: 'No exams found for these criteria.' });
    }
    const out = exams.map(e => ({
      courseCode: e.courseCode,
      courseName: e.courseName,
      semester: e.semester,
      regulation: e.regulation
    }));
    res.json({ success: true, exams: out });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Attendance
 * POST /api/attendance
 * body: { examDetails, attendanceList: [regNo] }
 */
app.post('/api/attendance', async (req, res) => {
  try {
    const { examDetails, attendanceList } = req.body;
    if (!examDetails || !Array.isArray(attendanceList)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    const entries = attendanceList.map(regNo => ({ regNo, status: 'PRESENT' }));
    const record = await Attendance.create({ examDetails, entries });
    res.json({ success: true, message: 'Attendance submitted successfully.', id: record._id });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
app.post('/api/exams/export', (req, res) => {
  const {
    students,      // [{ regNo, name }, ...]
    papers,        // [{ courseCode, courseName, fee }, ...]
    totalAmount,   // number
    semester,
    regulation,
    programCode,
  } = req.body;

  if (!students || !students.length) {
    return res.status(400).json({ message: 'No students selected' });
  }

  // tell browser this is a PDF file download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="exam-registration.pdf"'
  );

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  students.forEach((stu, index) => {
    if (index > 0) doc.addPage(); // 👉 new page for every student

    // Header
    doc
      .fontSize(14)
      .text('SREE SOWDAMBIGA COLLEGE OF ENGINEERING', { align: 'center' });
    doc
      .fontSize(11)
      .text('Autonomous – Examination Registration', { align: 'center' });
    doc.moveDown();

    // Student details
    doc.fontSize(11);
    doc.text(`Program Code : ${programCode || '-'}`);
    doc.text(`Regulation   : ${regulation || '-'}`);
    doc.text(`Semester     : ${semester || '-'}`);
    doc.moveDown();

    doc.text(`Student Name : ${stu.name}`, { continued: true });
    doc.text(`     Reg No : ${stu.regNo}`);
    doc.moveDown();

    // Subjects table
    doc.fontSize(11).text('Selected Papers:', { underline: true });
    doc.moveDown(0.3);

    if (!papers || !papers.length) {
      doc.text('No papers selected.');
    } else {
      papers.forEach((p, i) => {
        const feeText =
          p.fee !== undefined && p.fee !== null ? `  ₹${p.fee}` : '';
        doc.text(
          `${i + 1}. ${p.courseCode || p.subjectCode || ''} - ${
            p.courseName || p.subjectName || ''
          }${feeText}`
        );
      });
    }

    doc.moveDown();

    // Total
    doc
      .fontSize(12)
      .text(`Total Amount: ₹${totalAmount || 0}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(11).text('Controller of Examinations', { align: 'right' });
  });

  doc.end();
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
