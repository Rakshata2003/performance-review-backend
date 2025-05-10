require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/submit-review", async (req, res) => {
    
    const { name, email, employeeId, categories } = req.body;


  // 1. Generate PDF
  const doc = new PDFDocument();
  let buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  

  // Header
  doc.fontSize(18).fillColor("black").text("Employee Performance Review", { align: "center" });
  doc.moveDown(1);


  // Basic Info
    doc.fontSize(12).text(`Employee Name: ${name}`);
    doc.text(`Employee ID: ${employeeId}`);
    doc.text(`Email: ${email}`);  // <-- 👈 This line adds email to PDF
    doc.moveDown(1);
  // Table Setup
  const startX = 50;
  const tableTop = doc.y;
  const tableWidth = 500;
  const rowHeight = 25;
  const ratingX = 350;

  // Table Header
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Criteria", startX, tableTop);
  doc.text("Rating", ratingX, tableTop);

  // Line below header
  doc.moveTo(startX, tableTop + 15).lineTo(startX + tableWidth, tableTop + 15).stroke();

  // Table Rows
  doc.font("Helvetica").fontSize(11);
  let y = tableTop + 20;

  categories.forEach(({ label, value }) => {
    doc.text(label, startX, y);
    doc.text(value || "N/A", ratingX, y);

    // Horizontal line after each row
    doc.moveTo(startX, y + rowHeight - 5).lineTo(startX + tableWidth, y + rowHeight - 5).stroke();

    y += rowHeight;
  });

  // Optional: Add border around table
  doc.rect(startX - 5, tableTop - 5, tableWidth + 10, (categories.length + 1) * rowHeight).stroke();

  // Footer
  doc.moveDown(2);
  doc.fontSize(10).fillColor("gray").text("Generated automatically by the Appraisal System", { align: "center" });

  doc.end();

  // 2. Send Email
  doc.on("end", async () => {
    const pdfData = Buffer.concat(buffers);
  
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  
    const mailOptions = {
        from: `"Performance Review" <${process.env.EMAIL_USER}>`,
        to: process.env.MANAGER_EMAIL,
        subject: "New Employee Performance Review",
        text: "Please find the attached performance review.",
        attachments: [
          {
            filename: "review.pdf",
            content: pdfData,
          },
        ],
      };
      
  
    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Email sent to manager");
      res.status(200).json({ message: "Email sent with PDF!" });
    } catch (error) {
      console.error("❌ Email send error:", error);
      res.status(500).json({ message: "Failed to send email." });
    }
  });
  
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

