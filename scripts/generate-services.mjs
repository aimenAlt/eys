#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(import.meta.dirname, '../src/content/services');

const services = [
  {
    slug: 'tv-mounting',
    title: 'TV Mounting',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request TV Mounting Quote',
    seoTitle: 'TV Mounting in Katy, TX | Elevate Your Space Handyman',
    metaDescription: 'Professional TV mounting in Katy and West Houston. Secure wall mounting, bracket installation, and clean wire concealment.',
    heroTitle: 'Professional TV Mounting in Katy & West Houston',
    summary: 'Clean, secure TV mounting for living rooms, bedrooms, media rooms, and fireplace walls.',
    included: ['Wall mount installation on drywall, stone, or tile', 'Stud location and secure anchoring', 'Tilt, full-motion, or fixed bracket mounting', 'Wire concealment options where applicable', 'Level placement and safety check'],
    priceFactors: ['TV size and weight', 'Wall type (drywall, stone, tile, brick)', 'Mount type (fixed, tilt, articulating)', 'Wire concealment or outlet coordination'],
    process: ['Send photos of your wall and TV size via our contact form', 'Receive a clear, itemized estimate', 'Schedule installation at a convenient time', 'Mount, level, test, and clean up completely'],
    faqs: [
      { q: 'Can you mount TVs on stone or brick fireplaces?', a: 'Yes. We use proper masonry bits and heavy-duty anchors for secure mounting on stone, brick, and tile surfaces.' },
      { q: 'Do you hide the wires?', a: 'We offer clean wire concealment options. If new in-wall outlets are needed, we can help coordinate licensed electrical support.' },
      { q: 'What size TVs do you mount?', a: 'We mount TVs of all sizes, from bedroom screens to large-format displays above fireplaces.' },
    ],
    body: 'Elevate Your Space provides clean, secure TV mounting throughout Katy, Cypress, Fulshear, Richmond, and West Houston. We treat your walls and finishes with care — level placement, secure anchoring, and a spotless cleanup every time.',
  },
  {
    slug: 'ceiling-fan-installation',
    title: 'Ceiling Fan Installation',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Fan Installation Quote',
    seoTitle: 'Ceiling Fan Installation in Katy, TX | Elevate Your Space',
    metaDescription: 'Ceiling fan installation in Katy and West Houston. Pre-wired rooms, patio fans, and fixture swaps done safely and cleanly.',
    heroTitle: 'Ceiling Fan Installation in Katy & West Houston',
    summary: 'Safe, clean ceiling fan installation for bedrooms, living rooms, patios, and builder pre-wired boxes.',
    included: ['Installation on pre-wired ceiling boxes', 'Outdoor-rated patio fan mounting', 'Balance check and wobble correction', 'Remote and wall control setup', 'Old fixture removal when applicable'],
    priceFactors: ['Number of fans', 'Ceiling height', 'Indoor vs outdoor-rated fans', 'Electrical box condition'],
    process: ['Share room photos and fan model details', 'Get a transparent estimate', 'Schedule installation', 'Install, test, and clean up'],
    faqs: [
      { q: 'Can you install fans on builder pre-wires?', a: 'Yes. We frequently install fans on pre-wired caps left by builders in new construction throughout Katy-area communities.' },
      { q: 'Do you install outdoor patio fans?', a: 'Absolutely. We mount outdoor-rated fans on covered patios and porches.' },
      { q: 'What if new wiring is needed?', a: 'We can help coordinate licensed electrical support when the project requires it.' },
    ],
    body: 'Texas heat makes ceiling fans essential. EYS installs fans quickly and safely — ideal for move-in upgrades in Sunterra, Jordan Ranch, Tamarron, and established homes across West Houston.',
  },
  {
    slug: 'general-handyman-services',
    title: 'General Handyman Services',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request a Punch-List Quote',
    seoTitle: 'General Handyman Services in Katy, TX | Elevate Your Space',
    metaDescription: 'Bundled punch-list handyman service in Katy and West Houston. Multiple repairs handled in one efficient visit.',
    heroTitle: 'General Handyman & Punch-List Services',
    summary: 'Multiple small repairs and upgrades handled in one coordinated visit — the efficient choice for busy homeowners.',
    included: ['Bundled punch-list visits', 'Drywall patch and touch-up coordination', 'Door adjustment and hardware fixes', 'Picture, mirror, and shelf hanging', 'Minor carpentry and trim touch-ups'],
    priceFactors: ['Number of items on the list', 'Materials needed', 'Complexity of individual tasks', 'Same-day vs scheduled visit'],
    process: ['Send your full punch list with photos', 'Receive an itemized estimate', 'Schedule one visit for multiple tasks', 'Complete the list and clean up'],
    faqs: [
      { q: 'How many items can you handle in one visit?', a: 'Most punch lists of 5–15 items can be handled in a single visit, depending on scope. Send your list and we will confirm.' },
      { q: 'Do you do electrical or plumbing work?', a: 'We handle light fixture swaps and minor tasks. Licensed trade support is coordinated when required.' },
      { q: 'Is there a minimum charge?', a: 'Contact us with your list for a clear estimate based on your specific projects.' },
    ],
    body: 'Stop juggling multiple contractors for small jobs. EYS punch-list service is built for Katy-area homeowners who want several items done right in one visit.',
  },
  {
    slug: 'furniture-assembly',
    title: 'Furniture Assembly',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Assembly Quote',
    seoTitle: 'Furniture Assembly in Katy, TX | Elevate Your Space',
    metaDescription: 'Professional furniture assembly in Katy and West Houston. Beds, desks, patio sets, and IKEA-style furniture assembled correctly.',
    heroTitle: 'Professional Furniture Assembly',
    summary: 'Expert assembly of bedroom sets, office furniture, patio sets, and flat-pack furniture — structurally sound and done right.',
    included: ['Bedroom and dining set assembly', 'Office desk and shelving assembly', 'Outdoor patio furniture setup', 'Wall anchoring for tall units when needed', 'Packaging removal and area cleanup'],
    priceFactors: ['Number of pieces', 'Complexity of assembly', 'Brand and item type', 'Same-day scheduling'],
    process: ['Tell us what needs assembling', 'Get a clear estimate', 'Schedule assembly time', 'Assemble, secure, and clean up'],
    faqs: [
      { q: 'Do you assemble IKEA and flat-pack furniture?', a: 'Yes. We assemble flat-pack and RTA furniture from all major retailers.' },
      { q: 'Can you assemble patio furniture?', a: 'Absolutely. Outdoor dining sets, sectionals, and rocking chairs are common requests.' },
      { q: 'Will you haul away boxes?', a: 'We break down packaging and leave your space tidy. Haul-away can be discussed on request.' },
    ],
    body: 'Skip the frustration of confusing instructions and missing hardware. EYS assembles furniture quickly so you can enjoy your new home — especially popular for move-in weekends in master-planned communities.',
  },
  {
    slug: 'drywall-repair',
    title: 'Drywall Repair',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Drywall Repair Quote',
    seoTitle: 'Drywall Repair in Katy, TX | Elevate Your Space',
    metaDescription: 'Drywall repair and patch work in Katy and West Houston. Holes, cracks, and texture matching for a seamless finish.',
    heroTitle: 'Drywall Repair & Patch Work',
    summary: 'Holes, cracks, dents, and nail pops repaired with careful blending for a smooth, paint-ready finish.',
    included: ['Hole and crack patching', 'Nail pop repair', 'Texture matching where possible', 'Small-area skim coat', 'Paint touch-up coordination'],
    priceFactors: ['Size and number of repairs', 'Texture matching complexity', 'Ceiling vs wall repairs', 'Paint finish required'],
    process: ['Send photos of damaged areas', 'Receive an estimate', 'Schedule repair visit', 'Patch, blend, and clean up'],
    faqs: [
      { q: 'Can you match existing texture?', a: 'We match common orange peel and knockdown textures. Complex textures are assessed case by case.' },
      { q: 'Do you paint after repair?', a: 'We offer paint touch-ups. Full-room painting can be quoted separately.' },
      { q: 'How long until I can paint?', a: 'Most patches are paint-ready within 24 hours depending on compound dry time.' },
    ],
    body: 'From doorknob holes to settling cracks, EYS restores your walls to a clean, seamless finish — popular in established Katy and Cinco Ranch homes.',
  },
  {
    slug: 'painting',
    title: 'Painting',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Painting Quote',
    seoTitle: 'Interior Painting in Katy, TX | Elevate Your Space',
    metaDescription: 'Interior painting and accent walls in Katy and West Houston. Clean, precise paint work with full protection of your floors and furniture.',
    heroTitle: 'Interior Painting & Accent Walls',
    summary: 'Accent walls, touch-ups, and interior painting with careful prep, clean lines, and full floor protection.',
    included: ['Accent wall painting', 'Room touch-ups and spot repair', 'Trim and door painting', 'Full floor and furniture protection', 'Clean, dust-minimized work'],
    priceFactors: ['Room size and ceiling height', 'Number of coats', 'Surface prep required', 'Trim and detail work'],
    process: ['Share photos and color choices', 'Get a detailed estimate', 'Schedule painting dates', 'Prep, paint, and clean up'],
    faqs: [
      { q: 'Do you supply paint?', a: 'We can work with your paint or recommend products. Material costs are itemized separately.' },
      { q: 'Do you paint cabinets?', a: 'Cabinet painting is quoted separately. Contact us with photos for scope review.' },
      { q: 'How do you protect floors?', a: 'We use drop cloths, tape, and shoe covers on every painting project.' },
    ],
    body: 'A fresh accent wall or touch-up makes a room feel new. EYS delivers precise, clean painting work for Katy-area homeowners preparing to sell or personalize their space.',
  },
  {
    slug: 'door-repair-installation',
    title: 'Door Repair & Installation',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Door Service Quote',
    seoTitle: 'Door Repair & Installation in Katy, TX | Elevate Your Space',
    metaDescription: 'Door repair and installation in Katy and West Houston. Interior doors, hardware, alignment, and pre-hung door swaps.',
    heroTitle: 'Door Repair & Installation',
    summary: 'Sticky doors, misaligned hardware, and new pre-hung door installation — adjusted and hung correctly.',
    included: ['Interior door adjustment and re-hanging', 'Pre-hung door installation', 'Hardware and hinge replacement', 'Strike plate and latch alignment', 'Weatherstripping touch-ups'],
    priceFactors: ['Door type and quantity', 'New vs adjustment work', 'Hardware upgrades', 'Frame condition'],
    process: ['Describe the door issue or send photos', 'Receive an estimate', 'Schedule the visit', 'Repair or install and test operation'],
    faqs: [
      { q: "Can you fix doors that won't latch?", a: 'Yes. Misaligned latches, swollen doors, and hinge issues are common fixes we handle in one visit.' },
      { q: 'Do you install new interior doors?', a: 'We install pre-hung interior doors and adjust existing doors for smooth operation.' },
      { q: 'Do you do exterior front doors?', a: 'Exterior door work is assessed case by case. Contact us with details.' },
    ],
    body: "Doors that stick, squeak, or won't close properly are everyday annoyances EYS fixes quickly — common in aging Katy and Cinco Ranch homes.",
  },
  {
    slug: 'electrical-services',
    title: 'Electrical Services',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Electrical Service Quote',
    seoTitle: 'Electrical Services in Katy, TX | Elevate Your Space',
    metaDescription:
      'Light electrical work in Katy and West Houston. Fixture swaps, outlets, switches, ceiling fans, and licensed coordination when required.',
    heroTitle: 'Electrical Services in Katy & West Houston',
    summary:
      'Light electrical work including fixtures, outlets, switches, fans, and related repairs, with licensed support when required.',
    included: [
      'Light fixture and ceiling fan installation',
      'Outlet and switch replacement',
      'Dimmer and smart switch setup',
      'Fixture swaps on existing boxes',
      'Licensed electrician coordination when needed',
    ],
    priceFactors: ['Number of fixtures or devices', 'Ceiling height and access', 'New wiring requirements', 'Smart home device complexity'],
    process: ['Describe the electrical work or send photos', 'Receive a clear scope and estimate', 'Schedule the visit', 'Complete work safely and clean up'],
    faqs: [
      { q: 'Do you handle new wiring or panel work?', a: 'We coordinate licensed electricians for new circuits, panel upgrades, and code-required work.' },
      { q: 'Can you install ceiling fans and light fixtures?', a: 'Yes. Fixture and fan installation on existing boxes is one of our most common requests.' },
      { q: 'Are you licensed electricians?', a: 'We handle light electrical tasks and partner with licensed electricians when the project requires it.' },
    ],
    body: 'From builder pre-wires to dated fixtures, EYS helps Katy-area homeowners upgrade lighting and electrical details safely — with licensed support when the job demands it.',
  },
  {
    slug: 'cabinet-installation',
    title: 'Cabinet Installation',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Cabinet Installation Quote',
    seoTitle: 'Cabinet Installation in Katy, TX | Elevate Your Space',
    metaDescription:
      'Cabinet installation in Katy and West Houston. Vanities, shelving, built-ins, and store-bought cabinetry installed level and secure.',
    heroTitle: 'Cabinet Installation in Katy & West Houston',
    summary:
      'Installation of cabinets, vanities, shelving, and built-ins with precise fit, level placement, and durable finishing.',
    included: [
      'Vanity and wall cabinet installation',
      'Shelving and closet system setup',
      'Leveling, shimming, and secure fastening',
      'Hardware and hinge adjustment',
      'Finish trim and scribe coordination',
    ],
    priceFactors: ['Cabinet type and quantity', 'Wall type and stud access', 'Custom vs pre-built units', 'Countertop or plumbing coordination'],
    process: ['Share cabinet specs and room photos', 'Receive an itemized estimate', 'Schedule installation', 'Install, level, adjust, and clean up'],
    faqs: [
      { q: 'Do you install IKEA and store-bought cabinets?', a: 'Yes. We install RTA and pre-built cabinetry with careful leveling and secure wall fastening.' },
      { q: 'Can you install bathroom vanities?', a: 'Absolutely. Vanity installation including leveling and securing to studs is a common request.' },
      { q: 'Do you build custom cabinets from scratch?', a: 'We install and finish cabinetry and built-ins. Full custom fabrication is scoped on request.' },
    ],
    body: 'Whether it is a new vanity, laundry room storage, or built-in shelving, EYS installs cabinets with precise fit and a finished look — popular in Katy-area move-in and refresh projects.',
  },
  {
    slug: 'bathroom-remodeling',
    title: 'Bathroom Remodeling',
    published: true,
    bookingType: 'assessment',
    primaryCTA: 'Request Bathroom Remodel Consultation',
    seoTitle: 'Bathroom Remodeling in Katy, TX | Elevate Your Space',
    metaDescription:
      'Bathroom remodeling and upgrades in Katy and West Houston. Layout improvements, fixtures, storage, and clean finished results.',
    heroTitle: 'Bathroom Remodeling & Upgrades',
    summary:
      'Bathroom upgrades for improved function, comfort, layout, storage, and a clean finished appearance.',
    included: [
      'Fixture and vanity upgrades',
      'Hardware and accessory installation',
      'Storage and shelving improvements',
      'Tile and finish coordination',
      'Punch-list and refresh work',
    ],
    priceFactors: ['Scope of demolition and rebuild', 'Fixture and material selections', 'Plumbing and electrical coordination', 'Timeline and phasing'],
    process: ['Share goals and photos of your bathroom', 'Walk through scope and options', 'Receive a detailed proposal', 'Execute remodel phases with clean job sites'],
    faqs: [
      { q: 'Do you handle full gut bathroom remodels?', a: 'Yes. We scope full remodels and coordinate licensed trades for plumbing, electrical, and tile as needed.' },
      { q: 'Can you do smaller bathroom refreshes?', a: 'Absolutely. Vanity swaps, hardware updates, and fixture upgrades are common starting points.' },
      { q: 'How long does a bathroom remodel take?', a: 'Timeline depends on scope. We provide a clear schedule during the assessment phase.' },
    ],
    body: 'From a dated guest bath to a primary suite upgrade, EYS helps Katy homeowners improve bathroom function and finish quality with careful planning and professional execution.',
  },
  {
    slug: 'kitchen-remodeling',
    title: 'Kitchen Remodeling',
    published: true,
    bookingType: 'assessment',
    primaryCTA: 'Request Kitchen Remodel Consultation',
    seoTitle: 'Kitchen Remodeling in Katy, TX | Elevate Your Space',
    metaDescription:
      'Kitchen remodeling in Katy and West Houston. Cabinets, counters, backsplashes, fixtures, and layout upgrades done right.',
    heroTitle: 'Kitchen Remodeling & Improvements',
    summary:
      'Kitchen improvements including cabinets, counters, fixtures, backsplashes, layout upgrades, and finish work.',
    included: [
      'Cabinet installation and hardware upgrades',
      'Backsplash and tile coordination',
      'Fixture and appliance placement support',
      'Trim, paint, and finish carpentry',
      'Phased remodel planning',
    ],
    priceFactors: ['Cabinet and countertop selections', 'Layout changes and structural work', 'Appliance and plumbing coordination', 'Project phasing and timeline'],
    process: ['Discuss your kitchen goals and send photos', 'Review layout and material options', 'Receive a detailed proposal', 'Execute remodel work with minimal disruption'],
    faqs: [
      { q: 'Do you do full kitchen remodels?', a: 'Yes. We handle full kitchen projects and coordinate licensed trades when plumbing, electrical, or structural work is required.' },
      { q: 'Can you refresh cabinets without a full remodel?', a: 'Hardware upgrades, crown molding, and selective cabinet work are popular mid-scope options.' },
      { q: 'Do you install countertops?', a: 'We coordinate countertop templating and installation with trusted partners as part of remodel scope.' },
    ],
    body: 'Kitchens are the heart of Katy homes. EYS delivers thoughtful kitchen upgrades — from cabinet refreshes to full remodels — with finish quality that matches the way you live.',
  },
  {
    slug: 'flooring-and-decor',
    title: 'Flooring & Décor',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Flooring & Décor Quote',
    seoTitle: 'Flooring & Décor in Katy, TX | Elevate Your Space',
    metaDescription:
      'Flooring, trim, wall accents, and décor upgrades in Katy and West Houston. Finish details that improve comfort and style.',
    heroTitle: 'Flooring & Décor Upgrades',
    summary:
      'Flooring, trim, wall accents, décor upgrades, and finish details that improve the look and feel of a space.',
    included: [
      'Hardwood, laminate, and LVP installation coordination',
      'Baseboard and trim upgrades',
      'Accent wall and board-and-batten details',
      'Shelving and décor mounting',
      'Transition and finish carpentry',
    ],
    priceFactors: ['Flooring material and square footage', 'Subfloor prep requirements', 'Trim and accent complexity', 'Furniture moving and protection'],
    process: ['Share room dimensions and inspiration photos', 'Review material and scope options', 'Receive an estimate', 'Install finishes with full area protection'],
    faqs: [
      { q: 'What flooring types do you install?', a: 'We install and coordinate LVP, laminate, engineered hardwood, and tile depending on room and subfloor conditions.' },
      { q: 'Do you handle baseboards and trim with flooring?', a: 'Yes. Trim removal, reinstall, and new baseboards are commonly bundled with flooring projects.' },
      { q: 'Can you add accent walls and décor details?', a: 'Absolutely. Board-and-batten, shiplap accents, and shelving are popular décor upgrades we handle.' },
    ],
    body: 'New flooring and thoughtful décor details transform how a room feels. EYS helps Katy homeowners upgrade floors, trim, and accents with clean installation and lasting finish quality.',
  },
  {
    slug: 'custom-carpentry',
    title: 'Custom Carpentry',
    published: true,
    bookingType: 'quote-request',
    primaryCTA: 'Request Custom Carpentry Quote',
    seoTitle: 'Custom Carpentry in Katy, TX | Elevate Your Space',
    metaDescription:
      'Custom carpentry in Katy and West Houston. Built-ins, accent walls, shelving, trim upgrades, and detail woodwork.',
    heroTitle: 'Custom Carpentry & Finish Woodwork',
    summary:
      'Custom woodwork, accent walls, shelving, built-ins, trim upgrades, and detail work that gives the home character.',
    included: [
      'Custom shelving and built-in units',
      'Accent walls and wainscoting',
      'Crown molding and trim upgrades',
      'Closet and mudroom woodwork',
      'Site-built finish carpentry',
    ],
    priceFactors: ['Design complexity and materials', 'Linear footage and unit count', 'Paint and finish requirements', 'Integration with existing trim profiles'],
    process: ['Share inspiration photos and measurements', 'Review design and material options', 'Receive a detailed estimate', 'Build, install, and finish on site'],
    faqs: [
      { q: 'Do you build custom closets and mudroom lockers?', a: 'Yes. Built-in storage and mudroom systems are popular requests in Katy master-planned homes.' },
      { q: 'Can you match existing trim profiles?', a: 'We work to match or complement existing trim and molding for a cohesive look.' },
      { q: 'Do you handle accent walls?', a: 'Board-and-batten, shiplap, and slat accent walls are common custom carpentry projects we deliver.' },
    ],
    body: 'Custom woodwork adds character that stock finishes cannot match. EYS builds shelving, built-ins, and accent details for Katy homeowners who want their home to feel intentionally designed.',
  },
];

function yaml(s) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

for (const s of services) {
  const content = `---
title: ${yaml(s.title)}
slug: ${yaml(s.slug)}
published: true
seoTitle: ${yaml(s.seoTitle)}
metaDescription: ${yaml(s.metaDescription)}
heroTitle: ${yaml(s.heroTitle)}
summary: ${yaml(s.summary)}
bookingType: ${yaml(s.bookingType)}
primaryCTA: ${yaml(s.primaryCTA)}
secondaryCTA: "Call Us"
includedServices:
${s.included.map((i) => `  - ${yaml(i)}`).join('\n')}
priceFactors:
${s.priceFactors.map((i) => `  - ${yaml(i)}`).join('\n')}
process:
${s.process.map((i) => `  - ${yaml(i)}`).join('\n')}
faqs:
${s.faqs.map((f) => `  - question: ${yaml(f.q)}\n    answer: ${yaml(f.a)}`).join('\n')}
---

${s.body}
`;
  writeFileSync(join(outDir, `${s.slug}.md`), content);
  console.log(`Wrote ${s.slug}.md`);
}
