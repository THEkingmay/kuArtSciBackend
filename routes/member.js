const supabase =require('../config/supabase');
const verifyJWTToken = require('../middleware/verifyToken');
const router = require('express').Router()
const {sendEmailToAdmin , sendEmailToUser} = require('../config/email')
const upload= require('../config/upload')


router.post('/register', upload.single('transcript'), async (req, res) => {
    // return console.log(req.body)
    function toIntOrNull(value) {
        const n = parseInt(value, 10);
        return !isNaN(n) ? n : null;
    }
    const normalizeNull = (value) => {
        if (value === '' || value === undefined || value === 'undefined' || value === null) {
            return null;
        }
        return value;
    };
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
        const transcript_image_name = `${Date.now()}_${sanitizedBaseName}.${ext}`;
        const fileBuffer = req.file.buffer;

        const { error: uploadError } = await supabase.storage
            .from("transcript_image")
            .upload(transcript_image_name, fileBuffer, {
                contentType: req.file.mimetype,
            });

        if (uploadError) {
            console.log(uploadError)
            return res.status(500).json({ message: "อัปโหลดสลิปไม่สำเร็จ", error: uploadError.message });
        }

        const newRegisteration = {
            ...Object.fromEntries(
                Object.entries(req.body).map(([key, value]) => [key, normalizeNull(value)])
            ),  
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
            transcript_image_name
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

        try {
            await sendEmailToAdmin(
                'มีคนสมัครสมาชิกมาใหม่',
                `รหัสนิสิต ${req.body.student_id}`
            );
        } catch (emailErr) {
            console.error("ส่งอีเมลไม่สำเร็จ:", emailErr);
        }

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
            try {
            await sendEmailToUser(
                current.contact_email ,
                'ผลการสมัครสมาชิกสมาคมศิษย์เก่า ศวท.',
                `รหัสนิสิต ${current.student_id} ได้รับการอนุมัติเป็นในการเข้าร่วมสมาคมศิษย์เก่าแล้ว!`
                );
            } catch (emailErr) {
                console.error("ส่งอีเมลไม่สำเร็จ:", emailErr);
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
             try {
                await sendEmailToUser(
                    current.contact_email ,
                    'ผลการสมัครสมาชิกสมาคมศิษย์เก่า ศวท.',
                    `รหัสนิสิต ${current.student_id} ถูกปฏิเสธในการเข้าร่วมสมาคมศิษย์เก่า !`
                    );
                } catch (emailErr) {
                    console.error("ส่งอีเมลไม่สำเร็จ:", emailErr);
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
router.get('/getMemberRegisteration' ,verifyJWTToken , async(req , res) =>{
    try{
        const {data , error} = await supabase.from('member_registrations')
        .select('*').order('submitted_at');

        if(error) return res.status(401).json({message: `เกิดข้อผิดพลาดในการดึงข้อมูล ${error.message}`})

        return res.status(200).json({data})
    }catch(err){
        return res.status(500).json({message : err.message})
    }
})

// get Image
router.post('/getTranscriptImage', verifyJWTToken, async (req, res) => {
    try {
        const { transcript_image_name } = req.body;

        // ✅ 1. ตรวจสอบก่อนว่ามีชื่อไฟล์ไหม
        if (!transcript_image_name || typeof transcript_image_name !== 'string') {
            return res.status(400).json({ 
                message: "กรุณาระบุ transcript_image_name ที่ถูกต้อง" 
            });
        }

        // ✅ 2. ขอ signed URL จาก Supabase
        const { data, error } = await supabase
            .storage
            .from("transcript_image") // ชื่อ bucket ของเม
            .createSignedUrl(transcript_image_name, 60 * 5); // ลิงก์หมดอายุใน 5 นาที

        // ✅ 3. เช็ค error จาก Supabase
        if (error) {
            return res.status(401).json({ message: error.message });
        }

        // ✅ 4. ส่ง URL กลับ
        return res.status(200).json({ transcript_URL: data.signedUrl });

    } catch (err) {
        console.error("❌ ERROR: ", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
});

module.exports = router