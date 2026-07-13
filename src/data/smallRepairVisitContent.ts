import type { FaqItem } from './schema';
import {
  additionalTimeLabel,
  formatUsd,
  smallRepairPricing,
} from './smallRepairPricing';

export const smallRepairVisitMeta = {
  title: 'Small Repair Visit in Katy, TX | Elevate Your Space Handyman',
  description: `Book a Small Repair Visit for quick home repairs, installations, adjustments, and multi-item to-do lists in Katy and surrounding West Houston communities. One-hour visits start at ${formatUsd(smallRepairPricing.oneHour)}.`,
  h1: 'Small Repair Visit in Katy & West Houston',
  heroEyebrow: 'Small Repairs. One Convenient Visit.',
  heroTitle: 'Take Care of Your Home To-Do List in One Handyman Visit',
  heroSummary:
    'Reserve a professional handyman for quick repairs, installations, adjustments, and maintenance tasks throughout your home. Choose your highest-priority items, select the time block that fits your list, and we will work through them in order.',
  qualification:
    'Materials and specialty equipment are additional. Completion of every submitted task is not guaranteed within the reserved time.',
  path: '/services/small-repair-visit/',
} as const;

export const eligibleTasks = [
  'Hanging shelves, mirrors, artwork, and curtain rods',
  'Door adjustments and minor hardware repairs',
  'Caulking and minor sealing work',
  'Furniture assembly',
  'Cabinet-hardware replacement',
  'Minor drywall patching',
  'Weatherstripping',
  'Small fixture replacements',
  'TV, soundbar, or accessory mounting where appropriate',
  'Minor trim and finish repairs',
  'Installing customer-supplied accessories',
  'Addressing several small maintenance items in one visit',
] as const;

export const exclusions = [
  'Large renovations',
  'Multi-day work',
  'Major plumbing or electrical work',
  'Work requiring permits or specialized licensing',
  'Structural repairs',
  'Large drywall or painting projects',
  'Extensive water damage',
  'Hidden-condition diagnosis',
  'Projects requiring substantial material sourcing',
  'Work that cannot be safely evaluated from the submitted information',
] as const;

export const howItWorksSteps = [
  {
    title: 'Build your task list',
    description:
      'List the repairs, installations, and adjustments you want handled, in priority order.',
  },
  {
    title: 'Submit photographs and project details',
    description:
      'Clear photos and notes help us confirm whether the work fits a Small Repair Visit.',
  },
  {
    title: 'Select the visit length that best fits your list',
    description:
      'Choose a one-hour visit, a two-hour visit, or a longer block based on the size of your list.',
  },
  {
    title: 'We review, confirm scope, and finalize the appointment',
    description:
      'We review the request, confirm the appropriate visit length, and schedule your appointment. If online booking becomes available, you may be able to choose a time directly.',
  },
] as const;

export const serviceTermsSummary = [
  'List tasks in priority order — work is completed in that order unless otherwise agreed.',
  'The selected duration reserves handyman labor; it does not guarantee completion of every item on your list.',
  'Materials and specialty equipment are additional unless explicitly included.',
  'Customer-supplied materials must be onsite and ready before the visit.',
  'Additional time is performed only with your approval.',
  'Unsafe, concealed, specialized, or unexpectedly complex conditions may require a revised estimate or return visit.',
] as const;

export const serviceTermsDetails = [
  'Time begins at the scheduled visit time or according to Elevate Your Space’s finalized operating policy for the appointment.',
  'Time spent obtaining missing materials may reduce the available labor time for your list, subject to the final policy communicated at confirmation.',
  'Cancellation and no-access terms are presented during booking or confirmation.',
] as const;

export const includes = [
  'Reserved handyman labor for the visit length you select',
  'Professional tools for typical small residential repairs',
  'Tasks worked in your stated priority order',
  'Clear communication if scope, safety, or time needs change',
] as const;

export const smallRepairFaqs: FaqItem[] = [
  {
    question: 'What is a Small Repair Visit?',
    answer:
      'A Small Repair Visit reserves a professional handyman for a block of time to work through smaller repairs, installations, adjustments, and maintenance items on your home to-do list, in priority order.',
  },
  {
    question: 'What types of tasks can I include?',
    answer:
      'Typical examples include hanging shelves or curtain rods, door adjustments, minor caulking, furniture assembly, cabinet-hardware swaps, minor drywall patches, weatherstripping, and similar smaller items. Eligibility depends on safety, complexity, and the information you provide.',
  },
  {
    question: 'How many tasks can be completed?',
    answer:
      'It depends on the size and complexity of each task. The visit length reserves labor time — it does not guarantee that every submitted task will be finished within that window.',
  },
  {
    question: 'What happens if the work takes longer than expected?',
    answer: `Additional time after your reserved block is available only with your approval. After two hours, additional time is billed at ${additionalTimeLabel}.`,
  },
  {
    question: 'Are materials included?',
    answer:
      'No. Materials and specialty equipment are additional unless we specifically include them for your visit.',
  },
  {
    question: 'Can I supply my own materials?',
    answer:
      'Yes. Customer-supplied materials should be onsite and ready. Time spent obtaining missing materials may affect how much labor time remains for your list.',
  },
  {
    question: 'Can I add another task during the appointment?',
    answer:
      'You can ask. If time and materials allow, we may add it; otherwise it may need another visit or a revised estimate.',
  },
  {
    question: 'What if a task requires specialized or licensed work?',
    answer:
      'Work that requires specialized licensing, permits, or skills beyond a Small Repair Visit will be flagged. We may recommend a different service path or a custom project estimate.',
  },
  {
    question: 'Is this appropriate for a full renovation?',
    answer:
      'No. Renovations, multi-day work, and complex projects should use a custom project estimate instead of a Small Repair Visit.',
  },
  {
    question: 'What areas do you serve?',
    answer:
      'We serve Katy and surrounding West Houston communities, including Cypress, Fulshear, Richmond, and nearby master-planned neighborhoods. Send your address if you need confirmation.',
  },
  {
    question: 'Do I need to send photographs?',
    answer:
      'Photographs and clear project details help us confirm scope and the right visit length. If photos are not enough, we may request more information or recommend a different path.',
  },
  {
    question: 'Can I reserve more than four hours?',
    answer:
      'For longer needs, request a custom full-day or project estimate rather than stacking Small Repair Visit blocks without review.',
  },
];

export const pathwayCopy = {
  eyebrow: 'Clear Options for Every Type of Project',
  title: 'Choose the Right Way to Get Started',
  intro:
    'Whether you have one repair, a growing home to-do list, or a larger project, start with the service path that best matches your needs.',
} as const;
