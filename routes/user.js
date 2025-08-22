const dotenv = require('dotenv')
const verifyJWTToken = require('../middleware/verifyToken')
const {hashPassword} = require('../middleware/hashPassword')
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

// login 

// login with token

// reset password


module.exports = router