import NodemailerHelper from 'nodemailer-otp';
require('dotenv').config();

// Initialize the helper
const helper = new NodemailerHelper(process.env.EMAIL_USER, process.env.EMAIL_PASS);
const OTP = {
    generateOTP: function (length = 6) {
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
        }
        return otp;
    }

}