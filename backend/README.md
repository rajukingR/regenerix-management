# Regenerix backend (Node.js + Express + MySQL)

## Setup
1. `CREATE DATABASE regenerix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. `cd backend && npm install`
3. `cp .env.example .env` -> set DB_*, a long random `JWT_SECRET`, and `CLIENT_URL` (every origin the site runs on, comma-separated, e.g. `http://localhost:5173,http://localhost:5174`).
4. `npm run setup` = `knex migrate:latest` + `node seeds/seed.js` (admin account + starting content; safe to re-run, it never overwrites admin edits).
   **Upgrading an existing install:** run `npm run migrate` then `npm run seed`. The 4 new migrations only ADD tables/columns/indexes.
5. `npm run dev` -> http://localhost:5000
Frontend `.env`: `VITE_API_URL=http://localhost:5000`

## What the website reads
`src/data.js` no longer exists. The site loads `GET /api/public/site` (active content only) and re-checks every minute / when the tab regains focus,
so edits made in the dashboard appear without a redeploy. The starting content lives in `backend/seeds/seedData.js` and is only used to fill an empty database.
Settings whose key starts with `private_` are never sent to the public site.

## Migrations (23)
01-19 original tables, then: 20260201010000 appointments (unique `slot_key` = no double booking), 020000 appointment_history,
030000 notifications (id, user_id, message, message_type, is_read, created_at, detail JSON, photo), 040000 application/job extras
(adds career_applications.cover_letter/resume_name + indexes, jobs.department/employment_type).
`npm run rollback` reverses all of them.

## Appointments
Opening hours come from settings: `slot_start`, `slot_end`, `slot_minutes`, `slot_sunday_start`, `slot_sunday_end`, `booking_days_ahead`. One booking per time slot.
Statuses: pending, confirmed, rescheduled, cancelled, completed, no_show. Cancelled/no-show release the slot. Set `TZ` (default Asia/Kolkata) so "today" and past-time checks use clinic time.

## Notifications
Created inside the same DB transaction that saves the appointment / application, one row per admin account (`admins.role = 'admin'`), so a failed submission never creates one
and a retry cannot create a second. Types: `appointment_booking`, `job_application`; the ids are stored in `detail`.

## API
Public: GET /api/public/site | /pages/:slug | /{services,packages,testimonials,team,stats,why,journey,faqs,blogs,jobs}[/:slug]
        GET /api/public/appointments/slots?date=YYYY-MM-DD
        POST /appointments {name,email,phone,service,team_id?,appointment_date,appointment_time,reason?}
        POST /careers/apply (multipart: name,email,phone,experience,job_id?,cover_letter?,resume=PDF|DOCX)   POST /contact   POST /newsletter
Auth:   POST /api/auth/login | GET /me | PUT /password
Admin (Bearer token), /api/admin:
        <resource> GET, POST, GET/:id, PUT/:id, PATCH/:id/toggle, DELETE/:id for
        nav-items pages sections services packages testimonials team stats why journey faqs blogs jobs messages subscribers
        appointments   GET ?page&limit&q&status&service&team_id&date_from&date_to | GET/:id (with history) | PUT/:id {status | appointment_date+appointment_time, note} | DELETE/:id
        applications   GET ?page&limit&q&job_id&status&date_from&date_to | GET/:id | PUT/:id {status} | DELETE/:id | GET/:id/resume (private download)
        notifications  GET ?limit (newest first, + unread_count) | GET /unread-count | PATCH /:id/read | PATCH /read-all   (own notifications only)
        GET /dashboard | GET,PUT /settings | GET,POST,DELETE /media

## Uploads
Images JPG/PNG/WebP/GIF <= 10 MB, videos MP4/WebM/MOV <= 200 MB -> `uploads/images|videos`, served with range requests. SVG is rejected.
Resumes PDF/DOCX <= `RESUME_MAX_MB` (default 5), signature-checked, stored in `uploads/resumes`, never served statically; only a logged-in admin can download them.
Back up the `uploads` folder with the database.

## Doctor + member portals (migration 20260301010000_portals)
Run `npm run migrate` once. It adds: `members` table; `admins.team_id / is_active / phone`; `appointments.member_id / assigned_to / assigned_at`;
`career_applications.member_id / status_note`; `notifications.audience` ('staff' = admins.id, 'member' = members.id). Nothing is dropped.

Roles: `admins.role` = 'admin' (everything under /api/admin) or 'doctor' (only /api/doctor). Members use their own table and token.
Every staff request re-reads the account, so disabling a doctor login takes effect immediately.

Flow:
1. Admin -> Doctors: create a login for a team member (email + password). Doctors sign in at /doctor/login (or /admin/login; they are redirected).
2. Admin -> Appointments -> View -> "Assign to doctor". The doctor gets a notification and sees it under My Appointments.
3. Doctor marks it Completed (on/after the appointment date) or Rejected (reason required). Admins and the patient are notified.
   Reassigning a rejected booking re-opens it as Confirmed.
4. Patients / applicants create an account at /member/login. Bookings and applications made while logged in are linked to the account;
   earlier ones are linked automatically when the email AND mobile number match (so nobody can claim someone else's records with just an email).
5. Admin -> Job applications -> Review: choose a status (+ optional message). The applicant is notified ("Your resume has been shortlisted…").
   Appointment confirmations, reschedules, cancellations and doctor assignment also notify the member.

API additions
Admin:  GET /appointments/assignable | PUT /appointments/:id {assigned_to} | GET,POST /doctors | PUT,DELETE /doctors/:id | GET /members | PATCH /members/:id/toggle
        PUT /applications/:id {status, note?}  -> response.notified tells you whether the applicant has an account
Doctor: /api/doctor  GET /dashboard | GET /appointments ?when=today|upcoming|overdue&status&q&page | GET /appointments/:id | PUT /appointments/:id {status: completed|rejected, note} | notifications x4
Member: /api/member  POST /auth/register {name,email,phone,password} | POST /auth/login | GET,PUT /me | PUT /password | GET /dashboard
        GET /appointments[/:id] | GET /applications[/:id] | notifications x4
Optional env: MEMBER_JWT_EXPIRES (default 7d).

## Clinic management (migration 20260401010000_clinic)
Run `npm run migrate` once. It only ADDS six tables: `patients`, `consultations`, `treatments`, `treatment_visits`, `clinic_payments`, `expenses`. Nothing existing is changed.
Admin sidebar -> Clinic: Patients, Consultations, Treatments, Billing, Expenses, Reports. Doctors in these screens are the active rows of Team (`team_members`).

Flow: register a patient (file no `RGX-00001`) -> consultation (`CASE-…`, fee, complaints, doctor's notes, prescription, printable) -> treatment plan (`TRT-…`)
-> a visit entry per session -> payments (`RCP-…`, printable receipt).

Money rule: charged = consultation fees (not cancelled) + package prices (not cancelled) + per-visit amounts of regular / procedure plans.
Settled = payments (amount + discount). A payment with no consultation / treatment is an advance and lowers the patient's balance.
A payment linked to an item cannot exceed what is still due on that item.

API (admin token), /api/admin/clinic:
        GET /options (doctors, modes) | GET /summary (dashboard cards) | GET /reports ?from&to | GET /dues ?q&page
        patients       GET ?q&city&due=1|advance&page&limit | POST | GET/:id (file + consultations, treatments, payments) | PUT/:id | DELETE/:id (only when the file is empty) | GET/:id/dues
        consultations  GET ?q&status&doctor_id&patient_id&date_from&date_to&due=1 | POST | GET/:id | PUT/:id {notes…, status: pending|completed|cancelled} | DELETE/:id
        treatments     GET ?q&status&service_type&package_type&doctor_id&patient_id&due=1 | POST | GET/:id (with visits + payments) | PUT/:id | DELETE/:id
                       POST /:id/visits {visit_date, amount?, paid?, mode?, notes?, doctor_id?} | DELETE /:id/visits/:vid
        payments       GET ?q&mode&patient_id&date_from&date_to | POST {patient_id, consultation_id? | treatment_id?, amount, discount?, mode, paid_on?, note?} | GET/:id (receipt) | DELETE/:id
        expenses       GET ?q&category&date_from&date_to | POST | PUT/:id | DELETE/:id

## Push notifications (migration 20260501010000_push_tokens)
Browser push through Firebase Cloud Messaging. Every in-app notification (new booking, doctor assigned, application status…) is also pushed to the browsers
that account switched on, after the database transaction commits. No extra backend package: `src/config/push.js` signs the service-account JWT with `jsonwebtoken`.

Setup: 1) `npm run migrate` (adds `push_tokens`).  2) Put the Firebase service-account key at `backend/firebase-service-account.json` (git-ignored; never commit it),
or set `FIREBASE_SERVICE_ACCOUNT=<path>`, or on hosts without a disk put the whole JSON in `FIREBASE_SERVICE_ACCOUNT_JSON`. The server logs "Push notifications: on" at the first use.
3) Frontend: `npm install` (adds `firebase`). The web config + VAPID key live in `src/portal/push.js` and `public/firebase-messaging-sw.js`.
Use: bell icon -> "Turn on push notifications for this browser" -> allow -> "Send test". Works on HTTPS and on http://localhost only. Logging out stops pushes to that browser.

API (each portal: /api/admin, /api/doctor, /api/member): GET /push/status | POST /push/register {token} | POST /push/unregister {token} | POST /push/test

## Sending receipts to patients (PDF, email, WhatsApp)
`npm install` in `backend` adds `pdf-lib` (builds the receipt PDF, `src/config/receiptPdf.js`) and `nodemailer` (Gmail, `src/config/mail.js`).
`.env`: `EMAIL_USER` (Gmail address) and `EMAIL_PASS` (a Google app password); optional `EMAIL_FROM_NAME`, and `PUBLIC_API_URL` (e.g. https://api.yoursite.com) so the WhatsApp link uses your public address.
Settings: `whatsapp_country_code` (default 91) is added to 10-digit numbers; `receipt_logo_url` / `logo_url` must be PNG or JPG to appear in the PDF.

Admin: GET /clinic/payments/:id/pdf | GET /clinic/payments/:id/share -> { wa, url, message } | POST /clinic/payments/:id/email { email? }
Public: GET /api/public/receipts/:id/:token -> the PDF. The token is an HMAC of the receipt made with JWT_SECRET, so links cannot be guessed (changing JWT_SECRET invalidates old links).
WhatsApp cannot receive a file from a web link, so the button opens the patient's chat with a message containing this private PDF link.
