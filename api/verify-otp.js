const crypto = require('crypto');
const SECRET_KEY = "NitiKavyaSecureKey";

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { email, otp, hash } = req.body;
    if (!email || !otp || !hash) {
        return res.status(400).json({ success: false, message: "Email, OTP and Hash required" });
    }

    const verificationHash = crypto.createHmac('sha256', SECRET_KEY).update(email + otp).digest('hex');

    if (verificationHash === hash) {
        res.status(200).json({ success: true, message: "Email Verified Successfully!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }
};
