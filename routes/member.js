const supabase =require('../config/supabase');
const verifyJWTToken = require('../middleware/verifyToken');
const router = require('express').Router()
const {sendEmailToAdmin , sendEmailToUser} = require('../config/email')
const upload= require('../config/upload')


router.post('/register', upload.single('slip'), async (req, res) => {
    function toIntOrNull(value) {
        const n = parseInt(value, 10);
        return !isNaN(n) ? n : null;
    }
    try {
        if (!req.file) {
            return res.status(400).json({ message: "กรุณาอัปโหลดสลิป" });
        }

                // สร้างชื่อไฟล์ใหม่ ป้องกันภาษาไทย + ตัวอักษรพิเศษ
        const originalName = req.file.originalname;
        const ext = originalName.split('.').pop(); // หานามสกุลไฟล์
        const sanitizedBaseName = originalName
            .replace(/\.[^/.]+$/, "")            // ตัดนามสกุลเก่าออก
            .replace(/[^a-zA-Z0-9-_]/g, "");    // ลบตัวอักษรพิเศษและภาษาไทยออก

        // สร้างชื่อไฟล์ใหม่ ปลอดภัยสำหรับ Supabase
        const slip_payment_name = `${Date.now()}_${sanitizedBaseName}.${ext}`;
        const fileBuffer = req.file.buffer;

        const { error: uploadError } = await supabase.storage
            .from("member_slip_payment")
            .upload(slip_payment_name, fileBuffer, {
                contentType: req.file.mimetype,
            });

        if (uploadError) {
            console.log(uploadError)
            return res.status(500).json({ message: "อัปโหลดสลิปไม่สำเร็จ", error: uploadError.message });
        }

        const newRegisteration = {
            ...req.body,
            age: toIntOrNull(req.body.age),
            bachelor_degree_ku_batch: toIntOrNull(req.body.bachelor_degree_ku_batch),
            bachelor_degree_as_batch: toIntOrNull(req.body.bachelor_degree_as_batch),
            bachelor_degree_start_year: toIntOrNull(req.body.bachelor_degree_start_year),
            bachelor_degree_end_year: toIntOrNull(req.body.bachelor_degree_end_year),
            master_degree_ku_batch: toIntOrNull(req.body.master_degree_ku_batch),
            master_degree_as_batch: toIntOrNull(req.body.master_degree_as_batch),
            master_degree_start_year: toIntOrNull(req.body.master_degree_start_year),
            master_degree_end_year: toIntOrNull(req.body.master_degree_end_year),
            doctoral_degree_ku_batch: toIntOrNull(req.body.doctoral_degree_ku_batch),
            doctoral_degree_as_batch: toIntOrNull(req.body.doctoral_degree_as_batch),
            doctoral_degree_start_year: toIntOrNull(req.body.doctoral_degree_start_year),
            doctoral_degree_end_year: toIntOrNull(req.body.doctoral_degree_end_year),
            slip_payment_name
        };

        const { data, error } = await supabase
            .from('member_registrations')
            .insert([newRegisteration])
            .select();

        if (error) {
            if (error.code === "23505" || error.message.includes("duplicate key")) {
                return res.status(400).json({ message: "รหัสนิสิตนี้เคยสมัครแล้ว" });
            }
            console.log(error)
            return res.status(500).json({ message: `มีปัญหาในการส่งแบบสมัคร: ${error.message}` });
        }

        // try {
        //     await sendEmailToAdmin(
        //         'มีคนสมัครสมาชิกมาใหม่',
        //         `รหัสนิสิต ${req.body.student_id}`
        //     );
        // } catch (emailErr) {
        //     console.error("ส่งอีเมลไม่สำเร็จ:", emailErr);
        // }

        return res.status(200).json({ message: "ส่งแบบสมัครเรียบร้อย", data });

    } catch (err) {
        return res.status(500).json({ message: `เกิดข้อผิดพลาด: ${err.message}` });
    }
});

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