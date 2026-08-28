CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`issuer` text NOT NULL,
	`password` text,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `account_lookup_idx` ON `account` (`provider_id`,`issuer`,`account_id`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `announcements_class_idx` ON `announcements` (`class_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text,
	`attempt_id` text,
	`question_id` text NOT NULL,
	`response` text,
	`is_correct` integer,
	`points_awarded` real,
	`flagged` integer DEFAULT false NOT NULL,
	`answered_at` integer,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answers_submission_idx` ON `answers` (`submission_id`);--> statement-breakpoint
CREATE INDEX `answers_attempt_idx` ON `answers` (`attempt_id`);--> statement-breakpoint
CREATE INDEX `answers_question_idx` ON `answers` (`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `answers_submission_q_uq` ON `answers` (`submission_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'file' NOT NULL,
	`due_at` integer,
	`points` real DEFAULT 100 NOT NULL,
	`allow_late` integer DEFAULT true NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "assignments_kind_ck" CHECK("assignments"."kind" IN ('file','quiz','mixed'))
);
--> statement-breakpoint
CREATE INDEX `assignments_class_idx` ON `assignments` (`class_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text,
	`size` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attachments_owner_idx` ON `attachments` (`owner_type`,`owner_id`);--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`marked_by` text NOT NULL,
	`marked_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marked_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attendance_status_ck" CHECK("attendance_records"."status" IN ('present','absent','late','excused'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_records_uq` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `attendance_records_student_idx` ON `attendance_records` (`student_id`);--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`session_date` text NOT NULL,
	`title` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_sessions_uq` ON `attendance_sessions` (`class_id`,`session_date`);--> statement-breakpoint
CREATE INDEX `attendance_sessions_class_idx` ON `attendance_sessions` (`class_id`,`session_date`);--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'class' NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer,
	`all_day` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `calendar_events_class_idx` ON `calendar_events` (`class_id`,`start_at`);--> statement-breakpoint
CREATE TABLE `class_members` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_members_role_ck" CHECK("class_members"."role" IN ('teacher','ta','student'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_members_uq` ON `class_members` (`class_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `class_members_user_idx` ON `class_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`subject` text NOT NULL,
	`teacher_id` text NOT NULL,
	`schedule_note` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "classes_subject_ck" CHECK("classes"."subject" IN ('rw','math'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classes_code_uq` ON `classes` (`code`);--> statement-breakpoint
CREATE INDEX `classes_teacher_idx` ON `classes` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`started_at` integer,
	`submitted_at` integer,
	`current_module_id` text,
	`total_score` real,
	`violation_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_attempts_uq` ON `exam_attempts` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `exam_attempts_student_idx` ON `exam_attempts` (`student_id`);--> statement-breakpoint
CREATE TABLE `exam_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`question_count` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exam_modules_exam_idx` ON `exam_modules` (`exam_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'practice' NOT NULL,
	`open_at` integer NOT NULL,
	`close_at` integer NOT NULL,
	`lockdown` integer DEFAULT true NOT NULL,
	`violation_limit` integer DEFAULT 3 NOT NULL,
	`released` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exams_class_idx` ON `exams` (`class_id`,`open_at`);--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `materials_class_idx` ON `materials` (`class_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `module_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`module_id` text NOT NULL,
	`started_at` integer,
	`expires_at` integer,
	`submitted_at` integer,
	FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`module_id`) REFERENCES `exam_modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `module_attempts_uq` ON `module_attempts` (`attempt_id`,`module_id`);--> statement-breakpoint
CREATE TABLE `proctor_events` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`meta` text,
	FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `proctor_events_attempt_idx` ON `proctor_events` (`attempt_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text,
	`exam_module_id` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`prompt` text NOT NULL,
	`image_r2_key` text,
	`type` text NOT NULL,
	`choices` text,
	`correct_answer` text,
	`accepted_answers` text,
	`explanation` text,
	`points` real DEFAULT 1 NOT NULL,
	`domain` text,
	`skill_tag` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_module_id`) REFERENCES `exam_modules`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "questions_type_ck" CHECK("questions"."type" IN ('mcq','grid_in','free_text')),
	CONSTRAINT "questions_owner_ck" CHECK(("questions"."assignment_id" IS NULL) <> ("questions"."exam_module_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `questions_assignment_idx` ON `questions` (`assignment_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `questions_module_idx` ON `questions` (`exam_module_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_uq` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`turned_in_at` integer,
	`returned_at` integer,
	`is_late` integer DEFAULT false NOT NULL,
	`auto_score` real,
	`manual_score` real,
	`final_grade` real,
	`feedback` text,
	`graded_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "submissions_status_ck" CHECK("submissions"."status" IN ('assigned','turned_in','returned'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_uq` ON `submissions` (`assignment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `submissions_student_idx` ON `submissions` (`student_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`assignment_id`,`status`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'student' NOT NULL,
	`phone` text,
	`must_change_password` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "user_role_ck" CHECK("user"."role" IN ('admin','teacher','ta','student'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_uq` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user` (`role`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);