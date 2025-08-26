const multer = require("multer");
// ✅ ใช้ memoryStorage เพื่อไม่เซฟไฟล์ลงดิสก์
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload