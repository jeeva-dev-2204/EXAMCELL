import React, { useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../ssce.png';



const PAPER_FEE = 150;

const DEPARTMENTS = [
  { code: '114', name: 'MECH' },
  { code: '103', name: 'CIVIL' },
  { code: '105', name: 'EEE' },
  { code: '106', name: 'ECE' },
  { code: '243', name: 'AI&DS' },
  { code: '104', name: 'CSE' }
];

const SEMS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const REGULATIONS = ['2017', '2021', '2025'];

// Replace this with your real Base64 string: data:image/png;base64,....
//const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';

function ExamRegistration() {
  const [batch, setBatch] = useState('2022-2025');
  const [deptCode, setDeptCode] = useState('104');
  const [semester, setSemester] = useState('II');
  const [regulation, setRegulation] = useState('2025');

  const [students, setStudents] = useState([]);
  const [papers, setPapers] = useState([]);

  const [error, setError] = useState('');
  const [amount, setAmount] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState({});
  const [selectedPapers, setSelectedPapers] = useState({});

  const fetchStudents = async () => {
    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/students/${batch}/${deptCode}`);
      setStudents(res.data.list || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchPapers = async () => {
    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/syllabus/${regulation}/${deptCode}/${semester}`);
      setPapers(res.data.papers || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleStudent = (regNo) => {
    setSelectedStudents((prev) => ({ ...prev, [regNo]: !prev[regNo] }));
  };

  const togglePaper = (code) => {
    setSelectedPapers((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const calculateTotal = () => {
    const studentCount = Object.values(selectedStudents).filter(Boolean).length;
    const paperCount = Object.values(selectedPapers).filter(Boolean).length;
    if (studentCount === 0 || paperCount === 0) {
      setAmount(0);
      return;
    }
    setAmount(studentCount * paperCount * PAPER_FEE);
  };

 const exportToPDF = () => {
  try {
    const selectedStudentList = students.filter((s) => selectedStudents[s.regNo]);
    const selectedPaperList = papers.filter((p) => selectedPapers[p.code]);

    if (selectedStudentList.length === 0) {
      alert("Please select students");
      return;
    }
    if (selectedPaperList.length === 0) {
      alert("Please select papers");
      return;
    }

    const paperRows = selectedPaperList.map((p) => [p.code, p.name]);
    const doc = new jsPDF();

    selectedStudentList.forEach((stu, index) => {
      if (index > 0) doc.addPage();

      // === ADD LOGO (Top Center or Left) ===
      const imgWidth = 28;
      const imgHeight = 28;
      doc.addImage(logo, 'PNG', 10, 8, imgWidth, imgHeight);



      // === HEADER TEXT ===
      doc.setFontSize(16);
      doc.text('SREE SOWDAMBIKA COLLEGE OF ENGINEERING', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('(Autonomous)', 105, 28, { align: 'center' });
      doc.text('EXAMINATION REGISTRATION FORM', 105, 36, { align: 'center' });

      // === STUDENT & META DATA ===
      doc.setFontSize(11);
      doc.text(`Batch       : ${batch}`, 20, 50);
      doc.text(`Department  : ${deptCode}`, 20, 58);
      doc.text(`Semester    : ${semester}`, 20, 66);
      doc.text(`Regulation  : ${regulation}`, 20, 74);

      doc.text(`Register No : ${stu.regNo}`, 20, 88);
      doc.text(`Student Name: ${stu.name}`, 20, 96);

      // === SUBJECT TABLE ===
      autoTable(doc, {
  startY: 110,
  head: [['Course Code', 'Course Name']],
  body: paperRows,
  theme: 'grid',
});


      // === TOTAL ===
      const y = doc.lastAutoTable.finalY + 10;
      const totalAmount = selectedPaperList.length * PAPER_FEE;

      doc.setFontSize(12);
      doc.text(`Total Exam Fee: ₹ ${totalAmount}`, 20, y + 4);

      // === FOOTER ===
      doc.setFontSize(10);
      doc.text('Controller of Examinations', 150, 285, { align: 'center' });
    });

    doc.save('ExamRegistration.pdf');
  } catch (err) {
    setError(`Export failed: ${err.message}`);
  }
};


  return (
    <div>
      <h3 className="section-title">Examination Registration</h3>
      <div className="card">
        <div className="dropdown-group">
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">Select Semester</option>
            {SEMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={regulation} onChange={(e) => setRegulation(e.target.value)}>
            <option value="">Select Regulation</option>
            {REGULATIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={deptCode} onChange={(e) => setDeptCode(e.target.value)}>
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
          <select value={batch} onChange={(e) => setBatch(e.target.value)}>
            <option value="">Select Batch (Year)</option>
            {['2025-2028', '2024-2027', '2023-2026', '2022-2025'].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown-group">
          <button className="btn" onClick={fetchStudents}>
            Load Students
          </button>
          <button className="btn" onClick={fetchPapers}>
            Load Papers
          </button>
         <button className="btn btn-primary" onClick={exportToPDF}>

            Export
          </button>
          <button className="btn payment-gateway-btn" onClick={calculateTotal}>
            Calculate Total
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {students.length > 0 && (
          <div className="table-container">
            <h4>Select Students</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Reg No</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.regNo}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selectedStudents[s.regNo]}
                        onChange={() => toggleStudent(s.regNo)}
                      />
                    </td>
                    <td>{s.regNo}</td>
                    <td>{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {papers.length > 0 && (
          <div className="table-container" style={{ marginTop: 20 }}>
            <h4>Papers (₹150 per paper)</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.code}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selectedPapers[p.code]}
                        onChange={() => togglePaper(p.code)}
                      />
                    </td>
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 15 }}>
          <div id="total-amount-display" className="success-message">
            Total Amount: ₹ {amount}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamRegistration;
