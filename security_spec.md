# Security Specification - Fintly Campus Virtual

## Data Invariants
1. A Class (`/classes/{classId}`) can only be modified by Staff users (`admin` or `directivo`).
2. A User profile (`/users/{email}`) can only be created by the owner themselves (or by Staff), and a regular student user can never upgrade their role to `admin` or `directivo`.
3. A Student profile (`/students/{studentId}`) can only be managed by Staff, or written to by the student matching that email specifically during interactive progress sync updates.
4. A Submission (`/submissions/{submissionId}`) can only be written (created or updated) by the student matching that submission's `studentEmail`. Its grading fields (`grade`, `feedback`, `correctedBy`, `correctedAt`) can only be set or modified by Staff users.
5. Mail documents (`/mail/{mailId}`) can only be read or created by Staff.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **User Profile Spoofing**: An unauthenticated user attempts to write to `/users/any_email` setting their role to `admin`.
2. **User Profile Upgrading**: A logged-in student (`alumno@fintly.pro`) attempts to update their own profile `/users/alumno@fintly.pro` to change `role` to `admin`.
3. **Foreign Profile Read**: A logged-in student (`student1@fintly.pro`) attempts to read the private user profile of `student2@fintly.pro`.
4. **Class Tampering (Create)**: A student attempts to create a new class under `/classes/malicious_class`.
5. **Class Tampering (Delete)**: A student attempts to delete a class under `/classes/syllabus_l0_w1`.
6. **Student Data Theft**: A normal student attempts to read all students at `/students`.
7. **Student Progress Spoofing**: A student attempts to overwrite another student's document at `/students/other_student_gmail_com`.
8. **Submissions Blanket Fetch**: A student attempts to fetch everyone's submissions via a collection read of `/submissions`.
9. **Submission Hijacking**: A student (`student1@gmail.com`) attempts to create or update a submission under student ID `student2@gmail.com`.
10. **Grade Modification**: A student attempts to assign themselves a `grade` of "Muy bien" on their own submission document.
11. **Mail Interception**: A student attempts to read the outbound mailbox collection `/mail`.
12. **Mail Spoofing**: An unauthenticated or student user attempts to queue a mail document in `/mail` to trigger spam emails.

All the above malicious payloads will return `PERMISSION_DENIED` under the new security rules.
