import { ONLINE, WEEK } from '../shared/schedule.js'

// Everything a non-developer would want to change lives in this file.
// Empty strings hide the thing they belong to, so nothing fake ever shows.

const name = "Dr. Anamika's Avighna Classical Homeopathy Clinic"
const address =
  'A111, Lane No. 01, Anand Baug Society, Susen–Tarsali Link Road, Tarsali, Vadodara, Gujarat 390010'

export const clinic = {
  name,
  shortName: 'Avighna',
  doctor: 'Dr. Anamika',
  doctorFull: 'Dr. Anamika Singh',
  qualifications: 'B.H.M.S.',
  regNo: '6745',
  tagline: 'For effective, gentle and safe treatment',
  // Phone in international format without spaces or +, e.g. '919876543210'.
  // Empty = Call / WhatsApp buttons fall back to the Google listing.
  phone: import.meta.env.VITE_CLINIC_PHONE || '',
  whatsapp: import.meta.env.VITE_CLINIC_WHATSAPP || '',
  email: '',
  // Drop a real photo in /public (e.g. /dr-anamika.jpg) and put its path here.
  doctorPhoto: '',
  address,
  addressLines: [
    'A111, Lane No. 01, Anand Baug Society',
    'Susen–Tarsali Link Road, Tarsali',
    'Vadodara, Gujarat 390010',
  ],
  rating: 5.0,
  reviewCount: 21,
  timezone: 'Asia/Kolkata',
}

const q = encodeURIComponent(`${name}, ${address}`)
export const links = {
  maps: `https://www.google.com/maps/search/?api=1&query=${q}`,
  directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  embed: `https://www.google.com/maps?q=${q}&output=embed`,
  reviews: `https://www.google.com/maps/search/?api=1&query=${q}`,
}

// India: 112 is the national all-in-one emergency number; 108 is Gujarat's free ambulance service.
export const emergency = { national: '112', ambulance: '108' }

// How booking works. Fill any of these in; the form picks the best available route:
//  formEndpoint  a Formspree (or compatible) URL: requests arrive in the clinic's email inbox
//  scheduleUrl   a Google Calendar appointment schedule / Cal.com link: shows live free slots
//  (clinic.whatsapp) opens WhatsApp with the request pre-written
export const booking = {
  formEndpoint: import.meta.env.VITE_BOOKING_ENDPOINT || '',
  scheduleUrl: import.meta.env.VITE_SCHEDULE_URL || '',
  types: [
    { key: 'new', label: 'First consultation', note: 'Longer visit, about an hour', mode: 'both' },
    { key: 'follow', label: 'Follow-up', note: 'Review of your remedy', mode: 'both' },
    { key: 'counsel', label: 'Counselling & therapy', note: 'A session to talk things through', mode: 'both' },
  ],
}

const DAY_NAMES = [['Sunday', 'Sun'], ['Monday', 'Mon'], ['Tuesday', 'Tue'], ['Wednesday', 'Wed'], ['Thursday', 'Thu'], ['Friday', 'Fri'], ['Saturday', 'Sat']]
// Hours live in shared/schedule.js so the website, the booking API and the Desk app always agree.
export const hours = WEEK.map((sessions, i) => ({ day: DAY_NAMES[i][0], short: DAY_NAMES[i][1], sessions }))
export const onlineHours = ONLINE

export const conditions = [
  'Skin & eczema',
  'Allergies',
  'Acidity & digestion',
  'PCOS & cycles',
  'Children’s health',
  'Migraine',
  'Stress & sleep',
  'Hair fall',
  'Joint pain',
  'Recurring colds',
  'Thyroid support',
  'Anxiety',
]

export const services = [
  {
    n: '01',
    title: 'Classical homeopathy',
    body: 'A full-case consultation, one carefully chosen remedy and steady follow-ups, for acute and long-standing complaints in adults and children.',
    points: ['Individual remedy', 'Minimum dose', 'Gentle on children'],
  },
  {
    n: '02',
    title: 'Counselling & therapy',
    body: 'An unhurried, private space to talk through stress, anxiety, low mood or anything weighing on you, offered alongside homeopathic care or on its own.',
    points: ['Confidential', 'In clinic or online', 'Alongside your treatment'],
  },
  {
    n: '03',
    title: 'Online consultation',
    body: 'Consult from anywhere, any day, 9 am to 1 pm. Ideal for follow-ups, or if you live outside Vadodara.',
    points: ['Daily 9 am – 1 pm', 'Video or call', 'Reports shared by message'],
  },
]

export const principles = [
  {
    n: '01',
    title: 'You, not a label',
    body:
      'Two people with the same diagnosis can need two different remedies. Your remedy is chosen for how illness shows up in you: body, mind and habits together.',
  },
  {
    n: '02',
    title: 'One remedy at a time',
    body:
      'Classical homeopathy uses a single, well-chosen remedy instead of a mix, so every change you notice can be read clearly and acted on.',
  },
  {
    n: '03',
    title: 'The minimum dose',
    body:
      'The smallest dose that does the work, repeated only when needed and adjusted at every follow-up. Gentle by design.',
  },
]

export const steps = [
  {
    n: '01',
    title: 'We listen',
    kicker: 'The first conversation',
    body:
      'An unhurried first consultation about everything, not just the main complaint: sleep, appetite, energy, moods, what makes things better or worse, your history and your family’s.',
  },
  {
    n: '02',
    title: 'We see the whole picture',
    kicker: 'Studying your case',
    body:
      'All of it is put together into one picture of you. Scattered symptoms start to make sense as a single pattern.',
  },
  {
    n: '03',
    title: 'One remedy',
    kicker: 'The similimum',
    body:
      'From that picture, Dr. Anamika selects the one remedy that matches it most closely, with clear instructions on how and when to take it.',
  },
  {
    n: '04',
    title: 'We follow up',
    kicker: 'Steady, honest reviews',
    body:
      'Regular follow-ups track how you respond. The potency or remedy is adjusted only when your case asks for it.',
  },
]

export const care = [
  {
    title: 'Skin',
    detail: 'Eczema, acne, psoriasis, urticaria, warts',
    tone: 'sky',
    size: 'wide',
  },
  {
    title: 'Allergies & breathing',
    detail: 'Allergic rhinitis, sinusitis, recurring colds and coughs',
    tone: 'card',
  },
  {
    title: 'Women’s health',
    detail: 'PCOS, irregular or painful cycles, menopause',
    tone: 'cream',
  },
  {
    title: 'Children',
    detail: 'Frequent infections, tonsils, appetite, sleep, behaviour',
    tone: 'card',
    size: 'tall',
  },
  {
    title: 'Digestion',
    detail: 'Acidity, IBS, constipation, bloating',
    tone: 'deep',
  },
  {
    title: 'Mind, sleep & counselling',
    detail: 'Stress, anxiety, low mood, insomnia, with counselling and therapy if you want it',
    tone: 'sky',
  },
  {
    title: 'Pain',
    detail: 'Migraine, joint pain, back and neck pain',
    tone: 'card',
  },
  {
    title: 'Hair & scalp',
    detail: 'Hair fall, dandruff, alopecia areata',
    tone: 'cream',
  },
  {
    title: 'Long-standing complaints',
    detail: 'The problem that keeps coming back. Bring your reports and we will look at all of it together.',
    tone: 'deep',
    size: 'wide',
  },
]

export const faqs = [
  {
    q: 'What makes classical homeopathy different?',
    a:
      'Classical homeopathy follows Hahnemann’s original method: a detailed case history, a single remedy chosen for you as a whole person, and the minimum dose needed. It is individual by design, so two patients with the same complaint may get different remedies.',
  },
  {
    q: 'How long is the first consultation?',
    a:
      'Longer than a routine visit. The first conversation covers your whole history, so please keep some unhurried time aside. Follow-ups are shorter.',
  },
  {
    q: 'What should I bring?',
    a:
      'Any recent reports, prescriptions and a list of medicines you take. A short note of your symptoms and when they started is helpful too.',
  },
  {
    q: 'Can I continue my current medicines?',
    a:
      'Do not stop any prescribed medicine on your own. Tell Dr. Anamika everything you take, and keep your other doctors informed. Homeopathy can sit alongside your regular care.',
  },
  {
    q: 'Is it suitable for children and during pregnancy?',
    a:
      'Many families bring children to the clinic. During pregnancy or breastfeeding, mention it at the start so the treatment plan accounts for it.',
  },
  {
    q: 'Do you offer counselling and therapy?',
    a:
      'Yes. Dr. Anamika offers counselling and therapy sessions, in the clinic or online, alongside homeopathic treatment or separately. Everything you share stays confidential. If you are in crisis or at risk of harming yourself, call 112 or 108 right away.',
  },
  {
    q: 'Do you offer online consultations?',
    a:
      'Yes. Online consultations run from 9 am to 1 pm. Message or call the clinic to book a slot.',
  },
  {
    q: 'What about emergencies?',
    a:
      'Homeopathy is not for emergencies. For chest pain, breathlessness, heavy bleeding, high fever in an infant, an injury, a mental-health crisis or anything that feels urgent, call 112 (India’s national emergency number) or 108 (free ambulance in Gujarat), or go to the nearest hospital.',
  },
]

export const testimonials = [
  // Paste real Google reviews here (with permission), e.g.
  // { quote: '...', name: 'First name, L.', when: 'Mar 2026' },
]

export const hahnemann = {
  quote:
    'The highest ideal of cure is rapid, gentle and permanent restoration of the health…',
  source: 'Samuel Hahnemann, Organon of Medicine, §2',
}
