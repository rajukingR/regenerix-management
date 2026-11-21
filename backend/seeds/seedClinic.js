// Sample clinic data: 20 patients, each with a consultation, and most with a treatment plan, visit entries and payments.
// Run from the backend folder:  npm run seed:clinic
// Safe to re-run: a patient whose phone number is already in the table is skipped. Names and numbers are made up for demo use.
require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
const db = require('../src/config/db');
const { dateStr } = require('../src/config/util');

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); };
const numbered = async (trx, table, col, prefix, row) => {
  const [id] = await trx(table).insert(row);
  await trx(table).where({ id }).update({ [col]: `${prefix}${String(id).padStart(5, '0')}` });
  return id;
};

// plan: [package_type, service_type, sessions done, per-session fee | package price, total sessions (package only)]
// pay: 'full' = everything settled, 'part' = some still due, 'none' = nothing paid on the treatment, 'advance' = paid extra on account
const PATIENTS = [
  { name: 'Ramesh Iyer', gender: 'male', age: 54, phone: '9845012301', city: 'Bangalore', area: 'Electronic City Phase I', ref: 'Dr. Suresh Menon', days: 34, fee: 600, complaint: 'Right knee pain for 6 months, worse on climbing stairs', diagnosis: 'Early osteoarthritis, right knee', plan: ['package', 'clinic', 6, 18000, 10], pay: 'part', treat: 'Knee strengthening, ultrasound therapy and joint mobilisation' },
  { name: 'Lakshmi Narayanan', gender: 'female', age: 47, phone: '9845012302', city: 'Bangalore', area: 'HSR Layout', ref: 'Google search', days: 32, fee: 600, complaint: 'Lower back pain radiating to the left leg', diagnosis: 'Lumbar disc bulge with sciatica', plan: ['regular', 'clinic', 5, 1200], pay: 'full', treat: 'Traction, core stabilisation and nerve glides' },
  { name: 'Arjun Reddy', gender: 'male', age: 29, phone: '9845012303', city: 'Bangalore', area: 'Koramangala', ref: 'Friend', days: 30, fee: 500, complaint: 'Shoulder pain after a badminton injury', diagnosis: 'Rotator cuff strain, right shoulder', plan: ['regular', 'clinic', 4, 1000], pay: 'full', treat: 'Rotator cuff rehab, taping and progressive loading' },
  { name: 'Fathima Beevi', gender: 'female', age: 61, phone: '9845012304', city: 'Bangalore', area: 'BTM Layout', ref: 'Dr. Anitha Rao', days: 29, fee: 600, complaint: 'Stiffness and pain in both knees, difficulty sitting cross-legged', diagnosis: 'Bilateral knee osteoarthritis', plan: ['package', 'home', 8, 24000, 12], pay: 'part', treat: 'Home sessions: quadriceps strengthening, IFT and gait training' },
  { name: 'Vikram Shetty', gender: 'male', age: 38, phone: '9845012305', city: 'Bangalore', area: 'Bommanahalli', ref: 'Walk-in', days: 27, fee: 500, complaint: 'Neck pain and headaches, long hours at a desk', diagnosis: 'Cervical spondylosis with postural strain', plan: ['regular', 'clinic', 3, 900], pay: 'part', treat: 'Cervical mobilisation, posture correction and ergonomic advice' },
  { name: 'Meenakshi Sundaram', gender: 'female', age: 52, phone: '9845012306', city: 'Bangalore', area: 'Jayanagar', ref: 'Dr. Suresh Menon', days: 26, fee: 600, complaint: 'Frozen right shoulder, cannot lift the arm overhead', diagnosis: 'Adhesive capsulitis, right shoulder', plan: ['package', 'clinic', 7, 15000, 10], pay: 'full', treat: 'Capsular stretches, mobilisation and heat therapy' },
  { name: 'Mohammed Irfan', gender: 'male', age: 33, phone: '9845012307', city: 'Bangalore', area: 'Electronic City Phase II', ref: 'Instagram', days: 24, fee: 500, complaint: 'Ankle sprain while playing football two weeks ago', diagnosis: 'Grade 2 lateral ankle sprain', plan: ['regular', 'clinic', 4, 800], pay: 'full', treat: 'Balance training, strengthening and return-to-sport drills' },
  { name: 'Shalini Gupta', gender: 'female', age: 41, phone: '9845012308', city: 'Bangalore', area: 'Sarjapur Road', ref: 'Colleague', days: 23, fee: 600, complaint: 'Heel pain on the first steps in the morning', diagnosis: 'Plantar fasciitis, left foot', plan: ['procedure', 'clinic', 1, 3500], pay: 'full', treat: 'Shockwave therapy session with a stretching programme' },
  { name: 'Prakash Hegde', gender: 'male', age: 66, phone: '9845012309', city: 'Bangalore', area: 'Banashankari', ref: 'Dr. Anitha Rao', days: 21, fee: 600, complaint: 'Weakness on the right side after a stroke three months ago', diagnosis: 'Post-stroke right hemiparesis', plan: ['package', 'home', 9, 36000, 20], pay: 'part', treat: 'Home neuro-rehab: strength, balance and walking practice' },
  { name: 'Divya Krishnan', gender: 'female', age: 27, phone: '9845012310', city: 'Bangalore', area: 'Whitefield', ref: 'Google search', days: 20, fee: 500, complaint: 'Wrist pain and tingling in the fingers while typing', diagnosis: 'Carpal tunnel syndrome, right wrist', plan: ['regular', 'clinic', 3, 800], pay: 'none', treat: 'Nerve gliding, splint advice and ultrasound therapy' },
  { name: 'Suresh Babu', gender: 'male', age: 45, phone: '9845012311', city: 'Bangalore', area: 'Hosur Road', ref: 'Walk-in', days: 18, fee: 500, complaint: 'Tennis elbow, pain on gripping and lifting', diagnosis: 'Lateral epicondylitis, right elbow', plan: ['procedure', 'clinic', 1, 4500], pay: 'part', treat: 'PRP injection with an eccentric loading programme' },
  { name: 'Anjali Deshmukh', gender: 'female', age: 35, phone: '9845012312', city: 'Bangalore', area: 'Bellandur', ref: 'Friend', days: 16, fee: 600, complaint: 'Mid-back pain since childbirth, worse when lifting the baby', diagnosis: 'Thoracic postural pain with weak core', plan: ['regular', 'clinic', 4, 1000], pay: 'advance', treat: 'Core activation, thoracic mobility and lifting technique' },
  { name: 'Joseph Mathew', gender: 'male', age: 58, phone: '9845012313', city: 'Bangalore', area: 'Electronic City Phase I', ref: 'Dr. Suresh Menon', days: 14, fee: 600, complaint: 'Recovery after a total knee replacement six weeks ago', diagnosis: 'Post-operative left TKR rehabilitation', plan: ['package', 'clinic', 5, 20000, 15], pay: 'part', treat: 'Range of motion, strengthening and gait re-education' },
  { name: 'Kavitha Raman', gender: 'female', age: 49, phone: '9845012314', city: 'Bangalore', area: 'JP Nagar', ref: 'Newspaper', days: 12, fee: 600, complaint: 'Persistent neck and shoulder tightness with poor sleep', diagnosis: 'Myofascial pain syndrome, upper trapezius', plan: ['regular', 'clinic', 3, 900], pay: 'full', treat: 'Dry needling, myofascial release and stretching' },
  { name: 'Naveen Kumar', gender: 'male', age: 31, phone: '9845012315', city: 'Bangalore', area: 'Marathahalli', ref: 'Instagram', days: 10, fee: 500, complaint: 'Knee pain while running, training for a half marathon', diagnosis: 'Patellofemoral pain syndrome, left knee', plan: ['regular', 'clinic', 2, 1000], pay: 'full', treat: 'Hip and quad strengthening, running form correction' },
  { name: 'Sarojini Pillai', gender: 'female', age: 72, phone: '9845012316', city: 'Bangalore', area: 'Begur', ref: 'Dr. Anitha Rao', days: 8, fee: 600, complaint: 'Unsteady walking and two falls in the last month', diagnosis: 'Balance impairment with lower limb weakness', plan: ['package', 'home', 3, 16000, 10], pay: 'none', treat: 'Home fall-prevention programme: balance and strength' },
  { name: 'Rahul Verma', gender: 'male', age: 26, phone: '9845012317', city: 'Bangalore', area: 'Indiranagar', ref: 'Friend', days: 6, fee: 500, complaint: 'Lower back stiffness after gym deadlifts', diagnosis: 'Acute lumbar muscle strain', plan: ['regular', 'clinic', 2, 900], pay: 'part', treat: 'Pain relief modalities, mobility and graded return to lifting' },
  { name: 'Geetha Venkatesh', gender: 'female', age: 56, phone: '9845012318', city: 'Bangalore', area: 'Electronic City Phase I', ref: 'Walk-in', days: 4, fee: 600, complaint: 'Pain in both hands and morning stiffness', diagnosis: 'Hand osteoarthritis, to rule out rheumatoid arthritis', plan: null, pay: 'full' },
  { name: 'Imran Khan', gender: 'male', age: 43, phone: '9845012319', city: 'Bangalore', area: 'Silk Board', ref: 'Colleague', days: 2, fee: 500, complaint: 'Sudden neck pain on waking, cannot turn the head', diagnosis: 'Acute wry neck (torticollis)', plan: null, pay: 'none' },
  { name: 'Pooja Nair', gender: 'female', age: 30, phone: '9845012320', city: 'Bangalore', area: 'Electronic City Phase II', ref: 'Google search', days: 0, fee: 600, complaint: 'Hip pain during pregnancy, second trimester', diagnosis: null, plan: null, pay: 'none' },
];
const MODES = ['upi', 'cash', 'card', 'upi', 'cash', 'bank'];

(async () => {
  if (!(await db.schema.hasTable('patients'))) { console.error('The clinic tables do not exist yet. Run "npm run migrate" first.'); process.exit(1); }
  const doctors = (await db('team_members').where({ is_active: 1 }).orderBy('sort_order').orderBy('id').select('id', 'name'));
  const admin = await db('admins').where({ role: 'admin' }).orderBy('id').first();
  const receivedBy = admin?.name || 'Admin';
  let added = 0, skipped = 0, cons = 0, treats = 0, visits = 0, pays = 0;

  for (const [i, p] of PATIENTS.entries()) {
    if (await db('patients').where({ phone: p.phone }).first()) { skipped += 1; continue; }
    const doctor = doctors.length ? doctors[i % doctors.length] : null, doctor_id = doctor?.id || null;
    const mode = (n) => MODES[(i + n) % MODES.length];
    await db.transaction(async (trx) => {
      const first = daysAgo(p.days), stamp = `${first} ${String(9 + (i % 8)).padStart(2, '0')}:${i % 2 ? '30' : '00'}:00`;
      const pay = (row) => numbered(trx, 'clinic_payments', 'receipt_no', 'RCP-', { discount: 0, received_by: receivedBy, ...row, created_at: `${row.paid_on} 12:00:00`, updated_at: `${row.paid_on} 12:00:00` }).then(() => { pays += 1; });

      const patient_id = await numbered(trx, 'patients', 'file_no', 'RGX-', { name: p.name, gender: p.gender, age: p.age, phone: p.phone, email: `${p.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
        city: p.city, address: `${12 + i * 3}, ${i % 2 ? '2nd' : '4th'} Cross, ${p.area}, Bangalore`, referred_by: p.ref, remarks: 'Sample record', created_at: stamp, updated_at: stamp });

      // Consultation on the day they registered. Today's patient is still waiting to be seen.
      const seen = !!p.diagnosis;
      const consultation_id = await numbered(trx, 'consultations', 'case_no', 'CASE-', { patient_id, doctor_id, visit_date: first, fee: p.fee, referred_by: p.ref, height_cm: String(152 + ((i * 7) % 28)), weight_kg: String(54 + ((i * 5) % 34)),
        complaints: p.complaint, allergies: i % 6 === 0 ? 'Allergic to diclofenac' : null, examination: seen ? 'Tenderness and reduced range of motion on assessment. No red flags.' : null, diagnosis: p.diagnosis,
        investigation: seen && i % 3 === 0 ? 'X-ray reviewed' : null, advice: seen ? 'Home exercise programme twice daily. Avoid aggravating activity. Ice or heat as advised.' : null,
        prescription: seen && i % 2 === 0 ? 'Analgesic gel, local application twice daily for 7 days' : null, next_visit_date: seen && !p.plan ? daysAgo(p.days - 7 > 0 ? p.days - 7 : -5) : null,
        status: seen ? 'completed' : 'pending', created_at: stamp, updated_at: stamp });
      cons += 1;
      // Consultation fee: collected at the desk unless the patient has not paid anything yet
      if (!(p.pay === 'none' && !p.plan)) await pay({ patient_id, consultation_id, amount: p.fee, mode: mode(0), paid_on: first, note: 'Consultation fee' });
      if (!p.plan) return;

      const [package_type, service_type, done, price, total] = p.plan, isPkg = package_type === 'package';
      const gap = Math.max(1, Math.floor(p.days / (done + 1))); // spread the sessions between the first visit and today
      const dates = Array.from({ length: done }, (_, k) => daysAgo(Math.max(0, p.days - gap * (k + 1) + 1)));
      const finished = !isPkg && p.pay === 'full' && p.days > 20; // older, fully settled regular plans are closed
      const treatment_id = await numbered(trx, 'treatments', 'treatment_no', 'TRT-', { patient_id, doctor_id, consultation_id, start_date: dates[0] || first, diagnosis: p.diagnosis, details: p.treat, referred_by: p.ref,
        service_type, package_type, session_fee: isPkg ? 0 : price, total_sessions: isPkg ? total : null, package_price: isPkg ? price : 0,
        next_visit_date: finished ? null : daysAgo(-(1 + (i % 4))), status: finished ? 'completed' : 'active', created_at: stamp, updated_at: stamp });
      treats += 1;
      for (const [k, d] of dates.entries()) {
        await trx('treatment_visits').insert({ treatment_id, doctor_id, visit_date: d, amount: isPkg ? 0 : price, notes: k === 0 ? 'First session. Baseline assessment recorded.' : k === done - 1 ? 'Good progress, pain reduced.' : 'Session completed as planned.', created_at: `${d} 11:00:00`, updated_at: `${d} 11:00:00` });
        visits += 1;
      }
      const charged = isPkg ? price : price * done;
      if (p.pay === 'none') return;
      if (isPkg) { // packages: an upfront instalment, and the balance later when fully paid
        const upfront = p.pay === 'full' ? Math.round(charged * 0.5) : Math.round(charged * 0.4);
        await pay({ patient_id, treatment_id, amount: upfront, mode: mode(1), paid_on: dates[0], note: 'Package instalment' });
        if (p.pay === 'full') await pay({ patient_id, treatment_id, amount: charged - upfront - 500, discount: 500, mode: mode(2), paid_on: dates[Math.min(done - 1, 3)], note: 'Package balance' });
      } else { // per-visit plans: paid at each visit; "part" leaves the latest visit unpaid
        const paidVisits = p.pay === 'part' ? Math.max(0, done - 1) : done;
        for (let k = 0; k < paidVisits; k++) await pay({ patient_id, treatment_id, amount: price, mode: mode(k + 1), paid_on: dates[k], note: 'Paid at visit' });
        if (p.pay === 'part' && done === 1) await pay({ patient_id, treatment_id, amount: Math.round(price * 0.5), mode: mode(1), paid_on: dates[0], note: 'Part payment' });
        if (p.pay === 'advance') await pay({ patient_id, amount: price * 2, mode: mode(3), paid_on: dates[done - 1], note: 'Advance for upcoming sessions' });
      }
    });
    added += 1;
  }
  console.log(`Clinic sample data: ${added} patients added${skipped ? `, ${skipped} already present (skipped)` : ''}.`);
  console.log(`Created ${cons} consultations, ${treats} treatments, ${visits} visit entries and ${pays} payments.`);
  if (!doctors.length) console.log('Note: there are no active Team members, so the records have no doctor assigned. Add doctors under Team and assign them from each record.');
  await db.destroy();
})().catch(async (e) => { console.error(e.message || e); await db.destroy().catch(() => {}); process.exit(1); });
