const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config();

// แปลงค่า SALT_ROUNDS จาก .env ให้เป็นตัวเลขเสมอ
const saltRounds = parseInt(process.env.SALT_ROUNDS , 10) || 2;

/**
 * ฟังก์ชันสำหรับเข้ารหัสรหัสผ่าน
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
async function hashPassword(password) {
  if (!password || password.length < 6) {
    throw new Error("Password ต้องมีอย่างน้อย 6 ตัวอักษร");
  }

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดตอน hash password:", error);
    throw error;
  }
}

/**
 * ฟังก์ชันสำหรับตรวจสอบรหัสผ่าน
 * @param {string} password - รหัสผ่านที่ผู้ใช้กรอก
 * @param {string} hash - hash จาก database
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดตอน verify password:", error);
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
