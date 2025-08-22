const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()
 

const verifyJWTToken = (req, res, next) => {
    try {
        // 1. ดึง token จาก header
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'ไม่ได้ส่ง Token มาด้วย' });
        }

        // 2. แยก Bearer ออก
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'ไม่พบ Token' });
        }

        // 3. ตรวจสอบความถูกต้องของ Token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
            }

            // 4. เก็บข้อมูล user ที่ถอดรหัสได้ไว้ใน req.user
            req.user = decoded;

            // 5. ให้ middleware ถัดไปทำงานต่อ
            next();
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาด:', err);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
    }
};
module.exports = verifyJWTToken