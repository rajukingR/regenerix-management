// Starting content used ONLY by seeds/seed.js to fill an empty database. The website never imports this file.
const U = 'https://theregenerix.com/wp-content/uploads/2026/10/'
const SITE = { name: 'Regenerix', tag: 'Health & Longevity', phone: '+91 78927 99973', tel: '917892799973', email: 'support@theregenerix.com',
  address: '294, 1st Cross, Neeladri Nagar, Electronic City Phase I, Doddathoguru, Bangalore', logo: U + 'Logo-01.png', logo2: U + 'Logo-02.png',
  hours: [['Mon – Sat', '7:00 am – 10:00 pm'], ['Sunday', '9:00 am – 1:00 pm']],
  social: [['Instagram', 'https://www.instagram.com/theregenerix/'], ['Facebook', 'https://www.facebook.com/theregenerix/'], ['X', 'https://x.com/theregenerix'],
    ['YouTube', 'https://www.youtube.com/@theregenerix'], ['LinkedIn', 'https://www.linkedin.com/company/theregenerix/'], ['Pinterest', 'https://in.pinterest.com/theregenerix/']] }
const waLink = (msg = 'Hello Regenerix Team,\n\nI’m interested in booking an appointment with Regenerix – Health and Longevity.\n\nName:\nAge:\nPreferred Date:\nPreferred Time:\nService / Consultation:\n\nPlease contact me with the available appointment options.\n\nThank you.') =>
  `https://wa.me/${SITE.tel}?text=${encodeURIComponent(msg)}`
const NAV = [['/', 'Home'], ['/about', 'About'], ['/service', 'Service'], ['/careers', 'Careers'], ['/blogs', 'Blogs'], ['/contact-us', 'Contact Us']]
const SERVICES = [
  { slug: 'rehabilation', name: 'Rehabilitation', img: U + 'Rehabilation-672x448.webp',
    short: 'Personalized rehabilitation programs restore movement, reduce pain, improve mobility, and support confident recovery from injuries and conditions.',
    long: 'Rehabilitation begins with understanding your condition, movement, and goals. We combine comprehensive clinical assessment, evidence-informed treatment, and progressive exercise to optimise function and support long-term musculoskeletal health.',
    points: ['Physiotherapy and orthopaedic rehabilitation', 'Post-surgical recovery programmes', 'Joint and tendon disorders', 'Movement retraining', 'Structured return-to-sport or daily-activity plans', 'Shockwave therapy when clinically indicated'] },
  { slug: 'regenerative-care', name: 'Regenerative Care', img: U + 'Regenerative_Care_03-672x448.webp',
    short: 'Advanced regenerative care supports tissue recovery, enhances healing, reduces discomfort, and promotes long-term physical health and function.',
    long: 'Regenerative care supports your body’s own recovery processes using advanced technologies alongside rehabilitation, including radial and focused shock wave therapy with the DUOLITH® SD1 »ultra« by STORZ MEDICAL.',
    points: ['Radial shock wave therapy', 'Focused shock wave therapy', 'Tissue recovery support', 'Pain and discomfort reduction', 'Integrated with progressive exercise'] },
  { slug: 'longevity', name: 'Longevity', img: U + 'Longivity_03-672x448.webp',
    short: 'Personalized longevity programs improve mobility, strength, balance, and physical resilience to support healthier, more active aging.',
    long: 'Our longevity programmes support lifelong strength, mobility, physical independence, and musculoskeletal health through proactive, personalised care and ongoing monitoring.',
    points: ['Deep health screening', 'Mobility, strength and balance training', 'Lifestyle optimisation', 'Personalised interventions', 'Ongoing monitoring and written reports'] },
  { slug: 'strength-conditioning-human-performance', name: 'Strength, Conditioning & Human Performance', img: U + 'Strength_Conditioning__Human_Permormance-672x448.webp',
    short: 'Build strength, improve movement, enhance performance, and develop physical resilience.',
    long: 'We help athletes and active individuals improve strength, movement efficiency, and physical performance through sports rehabilitation and performance training.',
    points: ['Strength and conditioning', 'Movement efficiency analysis', 'Sports rehabilitation', 'Return-to-sport programmes', 'Performance testing and re-testing'] },
]
const WHY = [['Advanced Movement Analysis', 'We assess more than a visual check to understand how you move.', ['Movement Screening', 'Functional Testing']],
  ['Whole-Body Approach', 'We look at your whole body, not just the injury.', ['Root-Cause Focus', 'Personalised Plans']],
  ['Clear Health Monitoring', 'We track your recovery with the same measures at each stage.', ['Objective Re-Testing', 'Written Reports']],
  ['Measurable Milestones', 'You always know where you stand in your plan.', ['Goal Setting', 'Regular Reviews']]]
const STATS = [['Years of experience', 5, ''], ['Certified Specialists', 10, '+'], ['Satisfied Patients', 5, 'K'], ['Successful Treatments', 8, 'K+']]
const PACKAGES = [
  { name: 'Single Assessment', sub: 'Personalized Health & Movement Assessment', dur: null, text: 'A comprehensive movement and health assessment designed to understand your current condition, identify key areas to improve, and provide you with a clear, personalized roadmap.' },
  { name: 'Elite Performance Package', sub: 'Personalized Performance Program', dur: '12 Weeks', text: 'A structured performance program combining detailed assessment, personalized training, and regenerative treatments to help you move better, perform stronger, and recover more effectively.' },
  { name: 'Longevity Protocol', sub: 'Personalized Longevity Program', dur: '6 Months', text: 'A comprehensive longevity program combining deep health screening, lifestyle optimization, personalized interventions, and ongoing monitoring to support long-term health and performance.' }]
const STEPS = [['Comprehensive Assessment', 'We evaluate your symptoms, movement, strength, mobility, functional capacity, medical history, and goals to understand your individual needs.'],
  ['Personalised Care Plan', 'Your clinician develops a tailored programme combining evidence-based rehabilitation, progressive exercise, and advanced technologies where clinically indicated.'],
  ['Progressive Rehabilitation', 'We progressively develop mobility, strength, control, and physical capacity through individualised exercise and targeted interventions.'],
  ['Reassessment & Optimisation', 'We track your progress using clinical and functional outcome measures, refining your programme to support meaningful, measurable improvements.'],
  ['Performance & Longevity', 'We help you maintain your progress, build long-term physical resilience, and support an active, independent lifestyle.']]
const TEAM = [{ id: 'imthiyaz', name: 'Imthiyaz Ibrahim', role: 'Co-Founder, Performance & Rehabilation Care', img: U + 'webp.webp', bio: 'Leads performance and rehabilitation care at Regenerix, focused on evidence-based, personalised musculoskeletal care.' },
  { id: 'ajmal', name: 'Ajmal TA', role: 'Co-Founder, Strategy, Marketing & Operations Lead', img: U + 'Ajmal_Potrait.webp', bio: 'Leads strategy, marketing and operations, building the systems that keep care consistent and measurable.' }]
const FAQS = [['What makes Regenerix different?', 'We combine evidence-based rehabilitation, personalised treatment, and advanced technologies to support better movement, function, and long-term musculoskeletal health.'],
  ['What conditions do you treat?', 'We provide care for musculoskeletal conditions, sports injuries, post-surgical rehabilitation, joint and tendon disorders, and movement-related limitations.'],
  ['How is my treatment plan designed?', 'Your journey begins with a comprehensive assessment. Your personalised plan is tailored to your condition, goals, and progress, using appropriate treatments and progressive exercise.'],
  ['How do I get started?', 'Book a comprehensive assessment with our clinical team to understand your needs and identify the most appropriate care pathway.'],
  ['Do you provide sports rehabilitation?', 'Yes. Regenerix provides sports-specific rehabilitation and structured return-to-sport programs designed around your injury, performance goals, recovery needs, movement quality, strength, and individual physical capabilities.'],
  ['Is shockwave therapy available?', 'Yes. Shockwave therapy is available when clinically indicated. Your clinician will assess your condition, goals, and overall needs to determine whether this treatment is suitable as part of your rehabilitation plan.'],
  ['How many sessions will I need?', 'The number of sessions depends on your condition, goals, progress, and response to treatment. Your care plan is reviewed regularly and adjusted according to your individual recovery needs and clinical progress.'],
  ['Do you offer online consultations?', 'Yes. Online consultations and exercise guidance are available for selected cases. Our team will assess whether remote consultation is appropriate based on your condition, requirements, rehabilitation needs, and circumstances.']]
const TESTIMONIALS = [{ name: 'Esther Howard', role: 'Operations Manager', quote: 'Our communication created confusion across departments. We improved internal messaging and accountability systems.' },
  { name: 'Tynisha Obey', role: 'Business Owner', quote: 'Saved time, stress & money.' }, { name: 'Brittni Lando', role: 'Senior Manager', quote: 'A true Consultation partner.' }]
const BLOGS = [{ slug: 'blog-01', title: 'The Role of Rehabilitation in Recovery After Orthopedic Surgery', date: '26 Oct 2026', img: U + 'image.jpg',
  excerpt: 'The operation is often the part people prepare for most. The scans are done,',
  body: ['The operation is often the part people prepare for most. The scans are done, the surgeon has explained the procedure, and the date is fixed. What happens afterwards gets far less attention, yet it largely decides how well you move a year later.', 'Rehabilitation restores range of motion, rebuilds strength, retrains movement patterns and guides a safe return to daily activity or sport. Starting early, under clinical supervision, helps protect the repair while avoiding stiffness and muscle loss.', 'At Regenerix, post-surgical care starts with a full assessment and is re-tested at fixed points so progress is measured, not guessed. Book an assessment to plan your recovery.'] }]
const JOBS = [['Physiotherapist (MPT)', 'Full-time · Electronic City, Bangalore'], ['Strength & Conditioning Coach', 'Full-time · Electronic City, Bangalore'], ['Front Desk & Patient Coordinator', 'Full-time · Electronic City, Bangalore']]
const POLICIES = {
  'privacy-policy': ['Privacy Policy', ['We collect the details you submit through our forms (name, phone, email, service and message) only to respond to your enquiry and arrange care.', 'Form submissions are securely sent to and stored in Google Sheets for processing. We do not sell your information.', 'To request access to or deletion of your data, write to ' + SITE.email + '.']],
  'terms-and-condition': ['Terms & Conditions', ['Information on this website is general and does not replace clinical assessment.', 'Appointments are subject to availability and clinical suitability. Treatments such as shockwave therapy are offered when clinically indicated.']],
  'refund-and-returns-policy': ['Refund and Returns Policy', ['Package refunds depend on sessions already used and are reviewed case by case.', 'To request a refund, contact ' + SITE.email + ' with your package details.']] }

const BANNER = '/img/banner.jpg'
const ROWS = { rehabilation: 'Personalised rehabilitation to restore movement, improve function, and support lasting musculoskeletal health.',
  'regenerative-care': 'Personalised regenerative care to support healing, reduce discomfort, and promote long-term tissue and musculoskeletal health.',
  longevity: 'Personalised longevity care to build strength, mobility, balance and physical resilience for healthier, more active ageing.',
  'strength-conditioning-human-performance': 'Personalised performance training to build strength, improve conditioning, and enhance physical performance at every level.' }
const WHY2 = [['Advanced Movement Analysis', 'We assess more than a visual check to understand how you move.', ['Movement Screening', 'Functional Testing']],
  ['Whole-Body Approach', 'We look at your whole body, not just the injury.', ['Root-Cause Focus', 'Personalised Plans']],
  ['Measurable Milestones', 'You always know where you stand in your plan.', ['Goal Setting', 'Regular Reviews']],
  ['Clear Health Monitoring', 'We track your recovery with the same measures at each stage.', ['Objective Re-Testing', 'Written Reports']]]
const LEADS = { imthiyaz: 'Leads Exercise Therapy, Strength & Conditioning and Movement Optimization Program', ajmal: 'Co-Founder Strategy, Marketing & Operations Lead' }
const JOB = { title: 'Consultant Physiotherapist', qual: 'BPT / MPT', place: 'Bangalore' }

const CAREER = { title: 'Physiotherapy Consultant',
  intro: ['We are looking for a skilled and compassionate ', 'Physiotherapy Consultant', ' to join Regenerix. The role involves assessing patients, developing personalized treatment plans, guiding rehabilitation, and supporting patients toward improved mobility, strength, function, and long-term physical health.'],
  duties: ['Conduct comprehensive physiotherapy assessments and clinical evaluations.', 'Develop personalized rehabilitation and treatment plans.', 'Deliver evidence-based physiotherapy interventions and exercise programs.', 'Monitor patient progress and modify treatment plans when required.', 'Maintain accurate clinical records and treatment documentation.'],
  reqs: ['Bachelor’s or Master’s degree in Physiotherapy.', 'Valid professional registration/licence to practice.', 'Strong knowledge of musculoskeletal rehabilitation and exercise therapy.', 'Good clinical assessment and communication skills.', 'Experience in physiotherapy or rehabilitation is preferred.'],
  details: [['Posted', 'Oct 20, 2026'], ['Expiration', 'Jan 15, 2027'], ['Location', 'Electronic City'], ['Category', 'Consultant'], ['Salary', 'Competitive Pay'], ['Experience', '1 - 2 year'], ['Gender', 'Female']] }

module.exports = { SITE, waLink, NAV, SERVICES, WHY, STATS, PACKAGES, STEPS, TEAM, FAQS, TESTIMONIALS, BLOGS, JOBS, POLICIES, BANNER, ROWS, WHY2, LEADS, JOB, CAREER };
