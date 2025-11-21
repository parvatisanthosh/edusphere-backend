-- Mentors table
CREATE TABLE "mentors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 0,
    "bio" TEXT,
    CONSTRAINT "mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Reviews for mentors
CREATE TABLE "mentorReviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mentor_id" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "reviews" TEXT,
    "student_id" TEXT NOT NULL,
    CONSTRAINT "mentorReviews_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors" ("id") ON DELETE CASCADE,
    CONSTRAINT "mentorReviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE
);

-- Mentor Sessions (already exists but adding missing fields)
-- This needs to be updated

-- User Notifications
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Institutions/Faculty
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteName" TEXT NOT NULL,
    "state" TEXT,
    "aishe_id" TEXT,
    "channels_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Faculty
CREATE TABLE "faculty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institute_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    CONSTRAINT "faculty_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutions" ("id") ON DELETE CASCADE,
    CONSTRAINT "faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Credits System
CREATE TABLE "credits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "credits_earned" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "credits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE
);

-- Unique constraints
CREATE UNIQUE INDEX "mentors_user_id_key" ON "mentors"("user_id");
CREATE UNIQUE INDEX "institutions_aishe_id_key" ON "institutions"("aishe_id");
CREATE UNIQUE INDEX "faculty_user_id_key" ON "faculty"("user_id");
CREATE UNIQUE INDEX "credits_student_id_key" ON "credits"("student_id");