const nodemailer = require('nodemailer');

const SENDER_EMAIL = "dubeyom1406@gmail.com";
const APP_PASSWORD = "todp rokn mrof pibe";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SENDER_EMAIL,
        pass: APP_PASSWORD
    }
});

// Since Vercel Functions are stateless, we can't rely on in-memory `otpStore`.
// Typically you'd use a database (Redis/Postgres). For this demo, we'll try to use a simple approach:
// Just return success and console log the OTP for local dev, or rely on client-side state?
// Ah wait, serverless functions can't share memory.
// We probably need a simple way. Maybe use `otpStore` in a global scope? No, functions spin up/down.
// We'll proceed with sending the OTP via Email.
// The verification part is tricky without a DB.
// Let's implement a 'mock' store or just verify against the OTP sent in the request? No that's insecure.
// Actually, sending the OTP itself back to the client encrypted would work (stateless OTP).
// Or just keep it simple: For this demo, we'll assume the client is honest (not ideal for real world).
// BETTER: Generate a hash of the OTP + Secret, send it to client. Client sends it back for verification.
// That's standard stateless OTP verification.

const crypto = require('crypto');
const SECRET_KEY = "NitiKavyaSecureKey";

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a hash to send back to client for verification later
    const hash = crypto.createHmac('sha256', SECRET_KEY).update(email + otp).digest('hex');

    const mailOptions = {
        from: SENDER_EMAIL,
        to: email,
        subject: 'Your Niti Kavya Verification Code',
        text: `Hello,\n\nYour OTP for verification is: ${otp}\n\nThis code is valid for 10 minutes.\n\nRegards,\nNiti Kavya Team`
    };

    try {
        await transporter.sendMail(mailOptions);
        // Send hash back to client (they must send it back with the OTP to verify)
        res.status(200).json({ success: true, message: "OTP sent successfully!", hash: hash });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
    }
};
