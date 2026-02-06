const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Email Configuration (User Provided) //
const SENDER_EMAIL = "dubeyom1406@gmail.com"; // <-- REPLACE THIS WITH YOUR EMAIL
const APP_PASSWORD = "todp rokn mrof pibe"; // User provided password

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SENDER_EMAIL,
        pass: APP_PASSWORD
    }
});

// Store OTPs temporarily (In-memory for demo, use DB for prod)
let otpStore = {};

// 1. Send OTP Route
app.post('/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    const mailOptions = {
        from: SENDER_EMAIL,
        to: email,
        subject: 'Your Niti Kavya Verification Code',
        text: `Hello,\n\nYour OTP for verification is: ${otp}\n\nThis code is valid for 10 minutes.\n\nRegards,\nNiti Kavya Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ success: false, message: "Failed to send OTP. Check server console." });
        }
        console.log(`OTP sent to ${email}: ${otp}`);
        res.json({ success: true, message: "OTP sent successfully!" });
    });
});

// 2. Verify OTP Route
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

    if (otpStore[email] === otp) {
        delete otpStore[email]; // Clear OTP after success
        // Simulating DB update success
        res.json({ success: true, message: "Email Verified Successfully!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }
});

app.listen(PORT, () => {
    console.log(`Backend Server running at http://localhost:${PORT}`);
    console.log(`NOTE: Make sure to update SENDER_EMAIL in server.js`);
});
