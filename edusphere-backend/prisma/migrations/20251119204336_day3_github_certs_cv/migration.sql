-- AlterTable
ALTER TABLE "users" ADD COLUMN "github_connected_at" DATETIME;
ALTER TABLE "users" ADD COLUMN "github_token" TEXT;
ALTER TABLE "users" ADD COLUMN "github_username" TEXT;
ALTER TABLE "users" ADD COLUMN "last_github_sync" DATETIME;
ALTER TABLE "users" ADD COLUMN "profile_picture_url" TEXT;
ALTER TABLE "users" ADD COLUMN "resume_url" TEXT;

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "roll_number" TEXT,
    "department" TEXT,
    "semester" INTEGER,
    "cgpa" REAL,
    "date_of_birth" DATETIME,
    "phone" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "bio" TEXT,
    "gender" TEXT,
    "dob" DATETIME,
    "avatar_url" TEXT,
    "github" TEXT,
    "linkedin" TEXT,
    "skills" TEXT,
    "interests" TEXT,
    "resume_url" TEXT,
    "department" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "internships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "stipend" INTEGER,
    "requiredSkills" TEXT NOT NULL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "application_deadline" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "posted_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "internship_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "internship_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cover_letter" TEXT,
    "resume_url" TEXT,
    "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    "rejection_reason" TEXT,
    CONSTRAINT "internship_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "internship_applications_internship_id_fkey" FOREIGN KEY ("internship_id") REFERENCES "internships" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "internship_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internship_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "rubric_json" TEXT NOT NULL,
    "comments" TEXT,
    "final_score" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internship_evaluations_internship_id_fkey" FOREIGN KEY ("internship_id") REFERENCES "internships" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "internship_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" REAL,
    "thumbnail" TEXT,
    "instructor_id" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "enrolled_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "completed_at" DATETIME,
    CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resource_url" TEXT,
    CONSTRAINT "checkpoints_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "github_url" TEXT,
    "live_url" TEXT,
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "github_repo_id" TEXT,
    "last_synced_at" DATETIME,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    CONSTRAINT "portfolio_projects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mentor_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "meeting_link" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mentor_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mentor_sessions_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mentor_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "review" TEXT,
    CONSTRAINT "mentor_reviews_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mentor_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mentor_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "logbook_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "task" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "proof_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logbook_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificate_url" TEXT NOT NULL,
    CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "student_learning_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" DATETIME,
    "checkpoint_id" TEXT NOT NULL,
    CONSTRAINT "student_learning_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "issue_date" DATETIME,
    "expiry_date" DATETIME,
    "credential_id" TEXT,
    "credential_url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "document_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "certifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "student_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proficiencyLevel" INTEGER NOT NULL,
    "years_experience" REAL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_skills_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cv_generations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "cv_generations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size" BIGINT,
    "category" TEXT,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_roll_number_key" ON "students"("roll_number");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_student_id_key" ON "profiles"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "internship_applications_student_id_internship_id_key" ON "internship_applications"("student_id", "internship_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_student_id_course_id_key" ON "course_enrollments"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "student_skills_student_id_skill_id_key" ON "student_skills"("student_id", "skill_id");
