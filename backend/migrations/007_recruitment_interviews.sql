CREATE TABLE IF NOT EXISTS recruitment_interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  interview_date DATETIME NOT NULL,
  duration INT DEFAULT 60,
  mode VARCHAR(50) DEFAULT 'video',
  interviewer VARCHAR(255) DEFAULT '',
  location_or_link VARCHAR(500) DEFAULT '',
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
);
