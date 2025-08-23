const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const verifyJWTToken= require('../middleware/verifyToken')
const {hashPassword , verifyPassword} = require('../middleware/hashPassword')
const supabase = require('../config/supabase')


const router = require('express').Router()

dotenv.config()

// register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // hash password
        const hash_password = await hashPassword(password);

        // ตรวจสอบว่าอีเมลถูกใช้ยัง
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (selectError) throw new Error(selectError.message);
        if (existingUser.length > 0) {
            return res.json({ message: "Email has been used" });
        }

        // เพิ่มลง DB
        const { data, error } = await supabase
            .from('users')
            .insert([{ email, hash_password, role: 'user' }])
            .select()

        if (error) throw new Error(error.message);

        return res.json({ message: "สมัครสมาชิกสำเร็จ" , data});

    } catch (err) {
        return res.json({ message: `เกิดข้อผิดพลาดในการสมัครสมาชิก: ${err.message}` });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error) throw new Error(error.message);
        if (data.length === 0) return res.status(401).json({ message: "อีเมลไม่ถูกต้อง" });

        const user = data[0];
        const valid = await verifyPassword(password, user.hash_password)
        if (!valid) {
            return res.status(401).json({ message: "username password ไม่ตรงกัน" });
        }

        const payload = { uid : user.uid,  email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.status(200).json({ payload, token });
    } catch (err) {
        return res.status(500).json({ message: `เกิดข้อผิดพลาดในการล็อกอิน: ${err.message}` });
    }
});

// login with token
router.post('/signinWithToken' , verifyJWTToken , (req , res)=>{
    res.json({
        message: 'เข้าถึงโปรไฟล์ได้',
        user: req.user  // ข้อมูล payload จาก JWT
    });
})


// reset password


module.exports = router