-- สร้างตาราง USERS
CREATE TABLE users (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    hash_password TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- admin, member, staff
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตาราง MEMBER_REGISTRATIONS
CREATE TABLE member_registrations (
    registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ข้อมูลส่วนตัว
    student_id VARCHAR(20) not null,
    prefix VARCHAR(20),
    custom_prefix VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    old_fname VARCHAR(100),
    old_lname VARCHAR(100),
    birth_date VARCHAR(50),
    age INT,
    nationality TEXT,
    race TEXT,
    religion TEXT,

    -- การศึกษา: ปริญญาตรี
    bachelor_degree   VARCHAR(255) not null
    bachelor_degree_major VARCHAR(255) not null,
    bachelor_degree_KU_batch INT ,
    bachelor_degree_AS_batch INT ,
    bachelor_degree_start_year INT,
    bachelor_degree_end_year INT, 

    -- การศึกษา: ปริญญาโท
    master_degree_major VARCHAR(255),
    master_degree_major VARCHAR(255),
    master_degree_KU_batch INT,
    master_degree_AS_batch INT,
    master_degree_start_year INT ,
    master_degree_end_year INT , 

    -- การศึกษา: ปริญญาเอก
    doctoral_degree VARCHAR(255)
    doctoral_degree_major VARCHAR(255),
    doctoral_degree_KU_batch INT,
    doctoral_degree_AS_batch INT,
    doctoral_degree_start_year INT ,
    doctoral_degree_end_year INT , 

    -- ข้อมูลติดต่อ
    current_home_place TEXT,
    current_work_place TEXT,
    
    contact_preference VARCHAR(100), 
    phone_number TEXT not null,
    contact_email TEXT not null,
    line_id TEXT,
    facebook TEXT,

    -- ประเภทสมาชิก
    member_type VARCHAR(100) not null,
    transcript_image_name VARCHAR(100) not null
    -- สถานะการสมัคร
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตาราง MEMBERS (สมาชิกที่อนุมัติแล้ว)
CREATE TABLE members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID REFERENCES member_registrations(registration_id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(uid),
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_member_registrations_student_id ON member_registrations(student_id);
CREATE INDEX idx_member_registrations_contact_email ON member_registrations(contact_email);
CREATE INDEX idx_members_registration_id ON members(registration_id);
