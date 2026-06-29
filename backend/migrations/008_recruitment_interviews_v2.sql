ALTER TABLE recruitment_interviews
  ADD COLUMN `type` ENUM('online','offline') NOT NULL DEFAULT 'online' AFTER `status`,
  ADD COLUMN `location_name` VARCHAR(255) DEFAULT '' AFTER `type`,
  ADD COLUMN `location_address` TEXT AFTER `location_name`,
  ADD COLUMN `dress_code` VARCHAR(100) DEFAULT '' AFTER `location_address`,
  ADD COLUMN `what_to_bring` TEXT AFTER `dress_code`,
  ADD COLUMN `map_link` VARCHAR(500) DEFAULT '' AFTER `what_to_bring`,
  ADD COLUMN `meeting_platform` VARCHAR(50) DEFAULT '' AFTER `map_link`,
  ADD COLUMN `meeting_link` VARCHAR(500) DEFAULT '' AFTER `meeting_platform`,
  ADD COLUMN `candidate_status` ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending' AFTER `meeting_link`;
