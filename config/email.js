const nodemailer = require('nodemailer');
const dotenv = require('dotenv')
dotenv.config()

// ตัวอย่างใช้ Gmail
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_SEND_MAIL, // อีเมลผู้ส่ง
        pass: process.env.MAIL_PASS     // รหัสผ่าน หรือ App Password (Gmail ต้องสร้าง App Password)
    }
})

async function sendEmailToAdmin(subject , text) {
    let mailOptions = {
        from: process.env.ADMIN_SEND_MAIL,       // ใครส่ง
        to:process.env.ADMIN_RECIPT_MAIL,  // ใครรับ
        subject:subject,           // หัวข้อเมล
        text:text, 
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("ส่งอีเมลให้แอดมินแล้ว", info.response);
    } catch (err) {
        console.error(err);
    }
}
async function sendEmailToUser(userEmail, subject, text){
    let mailOptions = {
        from: process.env.ADMIN_SEND_MAIL,
        to: userEmail,
        subject: subject,
        text: text,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("ส่งอีเมลให้ user แล้ว", info.response);
    } catch (err) {
        console.error(err);
    }
}

module.exports = {sendEmailToAdmin , sendEmailToUser}