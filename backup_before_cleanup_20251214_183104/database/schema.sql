
CREATE DATABASE IF NOT EXISTS `daily_tracker`
  CHARACTER SET = 'utf8mb4'
  COLLATE = 'utf8mb4_unicode_ci';
USE `daily_tracker`;

-- Up-to-date schema for `daily_tracker` (matches current MariaDB tables)
CREATE DATABASE IF NOT EXISTS `daily_tracker`
  CHARACTER SET = 'utf8mb4'
  COLLATE = 'utf8mb4_unicode_ci';
USE `daily_tracker`;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `password_hash` TEXT DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ux_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Habits
CREATE TABLE IF NOT EXISTS `habits` (
  `habit_id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `habit_name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`habit_id`),
  KEY `idx_habits_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Habit logs
CREATE TABLE IF NOT EXISTS `habit_logs` (
  `habit_log_id` INT(11) NOT NULL AUTO_INCREMENT,
  `habit_id` INT(11) NOT NULL,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `log_date` DATE NOT NULL,
  PRIMARY KEY (`habit_log_id`),
  KEY `idx_habit_logs_habit_id` (`habit_id`),
  CONSTRAINT `fk_habit_logs_habit` FOREIGN KEY (`habit_id`) REFERENCES `habits` (`habit_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal
CREATE TABLE IF NOT EXISTS `journal` (
  `journal_id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `content` TEXT NOT NULL,
  `stickers` TEXT DEFAULT NULL,
  `entry_date` DATE NOT NULL,
  `created_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`journal_id`),
  KEY `idx_journal_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mood
CREATE TABLE IF NOT EXISTS `mood` (
  `mood_id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `mood` VARCHAR(20) NOT NULL,
  `energy_level` INT(11) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `log_date` DATE NOT NULL,
  `created_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`mood_id`),
  KEY `idx_mood_user_id` (`user_id`),
  KEY `idx_mood_log_date` (`log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks
CREATE TABLE IF NOT EXISTS `tasks` (
  `task_id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `task_name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `priority` ENUM('Low','Medium','High') DEFAULT 'Medium',
  `due_date` DATE DEFAULT NULL,
  `is_completed` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`),
  KEY `idx_tasks_user_id` (`user_id`),
  KEY `idx_tasks_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: sample data (uncomment to insert)
-- INSERT INTO `habits` (`user_id`, `habit_name`, `description`) VALUES (1, 'Drink water', '8 glasses/day');
-- INSERT INTO `tasks` (`user_id`, `task_name`, `due_date`, `is_completed`) VALUES (1, 'Finish report', '2025-12-08', 0);

-- Rename columns to match Flask model
ALTER TABLE `habits` 
CHANGE COLUMN `id` `habit_id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Create habit_logs table
CREATE TABLE IF NOT EXISTS `habit_logs` (
  `log_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `habit_id` INT UNSIGNED NOT NULL,
  `user_id` INT DEFAULT 1,
  `log_date` DATE NOT NULL,
  `completed` TINYINT(1) DEFAULT 1,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX (`habit_id`),
  INDEX (`log_date`),
  FOREIGN KEY (`habit_id`) REFERENCES `habits`(`habit_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Tasks table (app stores name, date, completed)
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal table (app inserts content and queries by id desc)
CREATE TABLE IF NOT EXISTS `journal` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `content` TEXT NOT NULL,
  `mood` VARCHAR(50),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: small sample data (uncomment to insert)
-- INSERT INTO `habits` (`name`, `description`) VALUES ('Drink water', '8 glasses/day'), ('Morning stretch', '5–10 minutes');
-- INSERT INTO `tasks` (`name`, `date`, `completed`) VALUES ('Finish report', '2025-12-08', 0);
-- INSERT INTO `journal` (`content`, `mood`) VALUES ('Started new habit tracking app.', 'happy');