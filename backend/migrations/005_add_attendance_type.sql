ALTER TABLE attendance_records ADD COLUMN `type` ENUM('wfh','office') NOT NULL DEFAULT 'wfh' AFTER `date`;

ALTER TABLE employees ADD COLUMN `can_wfh` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active`;