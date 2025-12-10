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
 * Timetable / Scheduled Exams (Corrected)
 * GET /api/exams?date=YYYY-MM-DD&session=FN|AN&deptCode=104&semester=III&regulation=2025
 */
app.get('/api/exams', async (req, res) => {
  const { date, session, deptCode, semester, regulation } = req.query;
  try {
    const exams = await Timetable.find({ date, session, deptCode, semester, regulation }).sort({ courseCode: 1 });
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

/**
 * Exam Registration PDF Export (UPDATED FOR CLEANER TABLE DRAWING)
 * POST /api/exams/export
 */
app.post('/api/exams/export', (req, res) => {
  const {
    students,       // [{ regNo, name }, ...]
    papers,         // [{ courseCode, courseName, fee }, ...]
    totalAmount,    // number
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

  const tableTop = 250;
  const itemHeight = 25;
  const col1 = 50;
  const col2 = 100;
  const col3 = 300;
  const col4 = 450;
  const colWidths = [50, 50, 200, 100];


  students.forEach((stu, index) => {
    if (index > 0) doc.addPage(); // new page for every student

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
    doc.text(`Program Code : ${programCode || '-'}`, 40);
    doc.text(`Regulation   : ${regulation || '-'}`, 40);
    doc.text(`Semester     : ${semester || '-'}`, 40);
    doc.moveDown();

    doc.text(`Student Name : ${stu.name}`, 40);
    doc.text(`Reg No       : ${stu.regNo}`, 350, doc.y - doc.currentLineHeight());
    doc.moveDown();

    // Subjects table
    let currentY = doc.y;

    // Table Header
    doc.fontSize(10).fillColor('#444');
    doc.text('S.No.', col1, currentY, { width: colWidths[0], align: 'left' });
    doc.text('Code', col2, currentY, { width: colWidths[1], align: 'left' });
    doc.text('Course Name', col3, currentY, { width: colWidths[2], align: 'left' });
    doc.text('Fee (₹)', col4, currentY, { width: colWidths[3], align: 'right' });
    currentY += itemHeight / 2;
    doc.lineWidth(1).strokeOpacity(0.5).moveTo(40, currentY).lineTo(550, currentY).stroke();
    currentY += 5;
    
    // Table Rows
    doc.fontSize(10).fillColor('#000');
    if (!papers || !papers.length) {
      doc.text('No papers selected.', 40, currentY);
      currentY += itemHeight;
    } else {
      papers.forEach((p, i) => {
        const fee = p.fee !== undefined && p.fee !== null ? p.fee.toFixed(2) : '-';
        
        doc.text(`${i + 1}.`, col1, currentY, { width: colWidths[0], align: 'left' });
        doc.text(p.courseCode || p.subjectCode || '', col2, currentY, { width: colWidths[1], align: 'left' });
        
        // Ensure course name wraps correctly
        doc.text(p.courseName || p.subjectName || '', col3, currentY, { width: colWidths[2], align: 'left' });
        
        doc.text(fee, col4, currentY, { width: colWidths[3], align: 'right' });
        
        currentY = doc.y; // Update Y position based on text wrapping
        currentY += 5; // Add some padding
      });
    }

    // Table Footer / Total
    doc.lineWidth(1).strokeOpacity(0.5).moveTo(40, currentY).lineTo(550, currentY).stroke();
    currentY += 10;
    
    doc.fontSize(12).text(`Total Amount: ₹${totalAmount ? totalAmount.toFixed(2) : 0.00}`, 40, currentY, { align: 'right' });

    currentY += 50;
    
    doc.moveDown(2);
    doc.fontSize(11).text('Controller of Examinations', 40, currentY, { align: 'right' });
  });

  doc.end();
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
