const supabase =require('../config/supabase');
const verifyJWTToken = require('../middleware/verifyToken');
const router = require('express').Router()

// register
router.post('/register' , async(req, res)=>{
    const {data , error} = await supabase.from('member_registrations')
    .insert([req.body])
    .select()
   if (error) {
    // ✅ ตรวจสอบว่าผิดเพราะ unique constraint หรือไม่
    if (error.code === "23505" || error.message.includes("duplicate key")) {
        return res.status(400).json({ message: "รหัสนิสิตนี้เคยสมัครแล้ว" });
    }
    // ❌ กรณีเกิด error อื่น ๆ
    return res.status(500).json({
        message: `มีปัญหาในการส่งแบบสมัคร: ${error.message}`,
    });
    }
    res.status(200).json({message : "ส่งแบบสมัครเรียบร้อย" , data})
})

router.post('/updateMemberRegistration', verifyJWTToken, async (req, res) => {
    const { registration_id, newStatus } = req.body;
    const { uid } = req.user; // id ของแอดมิน

    try {
        // 1. ดึงข้อมูลการสมัครปัจจุบัน
        const { data: registrations, error: fetchError } = await supabase
            .from('member_registrations')
            .select('*')
            .eq('registration_id', registration_id);

        if (fetchError) {
            return res.status(500).json({ message: fetchError.message });
        }

        if (!registrations || registrations.length === 0) {
            return res.status(404).json({ message: 'ไม่พบการสมัครนี้' });
        }

        const current = registrations[0];

        // 2. ถ้าสถานะเดิมเหมือนกับที่ต้องการจะเปลี่ยน → ไม่ต้องทำอะไร
        if (current.status === newStatus) {
            return res.status(400).json({ message: 'การสมัครนี้เป็นสถานะนี้อยู่แล้ว' });
        }

        // 3. ถ้าจะ "อนุมัติ" (approved)
        if (newStatus === 'approved') {
            // อัปเดตสถานะ
            const { error: updateError } = await supabase
                .from('member_registrations')
                .update({ status: newStatus })
                .eq('registration_id', registration_id);

            if (updateError) {
                return res.status(500).json({ message: updateError.message });
            }

            // เพิ่มข้อมูลใน members
            const { error: insertError } = await supabase
                .from('members')
                .insert({ registration_id, approved_by: uid });

            if (insertError) {
                return res.status(500).json({ message: insertError.message });
            }

            return res.status(200).json({ message: 'อนุมัติสมาชิกสำเร็จ' });
        }

        // 4. ถ้าจะ "ปฏิเสธ" (rejected)
        if (newStatus === 'rejected') {
            // อัปเดตสถานะ
            const { error: updateError } = await supabase
                .from('member_registrations')
                .update({ status: newStatus })
                .eq('registration_id', registration_id);

            if (updateError) {
                return res.status(500).json({ message: updateError.message });
            }

            // ลบออกจาก members ถ้ามี
            const { error: deleteError } = await supabase
                .from('members')
                .delete()
                .eq('registration_id', registration_id);

            if (deleteError) {
                return res.status(500).json({ message: deleteError.message });
            }

            return res.status(200).json({ message: 'ปฏิเสธสมาชิกสำเร็จ' });
        }

        // 5. ถ้าสถานะไม่ถูกต้อง
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });

        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });

// delete 

// get  
router.get('/getMemberRegisteration' , async(req , res) =>{
    try{
        const {data , error} = await supabase.from('member_registrations')
        .select('*').order('submitted_at');

        if(error) return res.status(401).json({message: `เกิดข้อผิดพลาดในการดึงข้อมูล ${error.message}`})

        return res.status(200).json({data})
    }catch(err){
        return res.status(500).json({message : err.message})
    }
})

module.exports = router