#!/usr/bin/env node
/**
 * Generates city-service landing pages at legacy WordPress URLs.
 * Run: node scripts/generate-city-services.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '../src/content/city-services');

const pages = [
  // Richmond
  {
    legacySlug: 'electricians-richmond',
    citySlug: 'richmond',
    serviceSlug: 'electrical-services',
    seoTitle: 'Electricians in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Light electrical work in Richmond, TX — fixtures, fans, outlets, and switches for Pecan Grove, Aliana, Harvest Green, and Fort Bend homes.',
    heroTitle: 'Electricians in Richmond, TX',
    summary:
      'Fixture swaps, ceiling fans, outlets, and dimmers for Richmond homes — from historic Pecan Grove properties to new builds in Aliana and Harvest Green.',
    localIntro:
      'Richmond homeowners need electrical help that respects both older wiring in established subdivisions and clean finishes in new Fort Bend construction. We handle light electrical tasks throughout Richmond and coordinate licensed electricians when code requires it.',
    neighborhoods: ['Pecan Grove', 'Aliana', 'Harvest Green', 'Veranda', 'Historic Richmond'],
    zipCodes: ['77406', '77407', '77469'],
    housingNotes:
      'Richmond spans 1980s–1990s homes needing fixture upgrades and brand-new builds with builder-grade lighting homeowners want to improve after move-in.',
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman', 'veranda-handyman'],
    faqs: [
      {
        question: 'Do you serve Pecan Grove and Aliana for electrical work?',
        answer:
          'Yes. We regularly install fixtures and ceiling fans in established Pecan Grove homes and new construction in Aliana, Harvest Green, and Veranda.',
      },
      {
        question: 'Can you replace dated light fixtures in older Richmond homes?',
        answer:
          'Absolutely. Fixture upgrades on existing boxes are one of our most common Richmond requests — especially in 1980s and 1990s interiors.',
      },
    ],
    body: `## Electrical services built for Richmond homes

Fort Bend County homes are not one-size-fits-all. A Pecan Grove ranch may need careful fixture swaps; a new Aliana build may need fans on pre-wires before furniture arrives.

### Common Richmond electrical requests

- Ceiling fan installation on existing or builder pre-wires  
- Chandelier and pendant swaps in entryways and dining rooms  
- Dimmer and smart-switch upgrades  
- Outlet and switch replacement in high-traffic areas  

We explain scope clearly, protect finishes, and bring licensed support when a project requires new circuits or panel work.`,
  },
  {
    legacySlug: 'house-painting-richmond',
    citySlug: 'richmond',
    serviceSlug: 'painting',
    seoTitle: 'House Painting in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Interior painting and touch-ups in Richmond, TX for Pecan Grove, Aliana, and Fort Bend homes — accent walls, trim, and room refreshes.',
    heroTitle: 'House Painting in Richmond, TX',
    summary:
      'Interior painting, accent walls, and trim touch-ups for Richmond homeowners modernizing established homes or finishing new construction details.',
    localIntro:
      'Whether you are refreshing a 1990s Pecan Grove interior or adding character to a new build in Harvest Green, we deliver clean lines, proper prep, and finishes that hold up in Fort Bend humidity.',
    neighborhoods: ['Pecan Grove', 'Aliana', 'Harvest Green', 'Veranda'],
    zipCodes: ['77406', '77407'],
    housingNotes:
      'Richmond painting projects often combine drywall repair with color updates — especially when homeowners are preparing an established home for sale or move-in.',
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman', 'veranda-handyman'],
    faqs: [
      {
        question: 'Do you paint single rooms or full interiors in Richmond?',
        answer: 'Both. Many Richmond homeowners start with a primary bedroom, office, or accent wall before expanding to additional rooms.',
      },
      {
        question: 'Can you repair drywall before painting?',
        answer: 'Yes. Drywall patch and paint touch-ups are commonly bundled in Richmond punch-list visits.',
      },
    ],
    body: `## Painting for Richmond's mixed housing stock

From historic downtown properties to master-planned newcomers, Richmond interiors benefit from **prep-first painting** — not rushed roller work.

### Typical Richmond painting scopes

- Accent walls and whole-room refreshes  
- Trim, doors, and baseboard touch-ups  
- Drywall repair before paint  
- Move-in color updates for new Fort Bend buyers`,
  },
  {
    legacySlug: 'drywall-repair-richmond',
    citySlug: 'richmond',
    serviceSlug: 'drywall-repair',
    seoTitle: 'Drywall Repair in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Drywall repair and texture matching in Richmond, TX — holes, cracks, water stains, and patch-and-paint for Fort Bend homes.',
    heroTitle: 'Drywall Repair in Richmond, TX',
    summary:
      'Patch holes, match texture, and restore walls and ceilings in Richmond homes — from older Pecan Grove interiors to new construction punch lists.',
    localIntro:
      'Door handle dents, settling cracks, and post-move damage show up in every Richmond neighborhood. We patch, texture-match, and coordinate paint so repairs disappear into the wall.',
    neighborhoods: ['Pecan Grove', 'Historic Richmond', 'Aliana'],
    zipCodes: ['77406', '77469'],
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman'],
    faqs: [
      {
        question: 'Can you match existing wall texture in older Richmond homes?',
        answer: 'Yes. Texture matching is standard on our Richmond drywall jobs — especially in established subdivisions with orange peel or knockdown finishes.',
      },
    ],
    body: `## Drywall repair across Richmond neighborhoods

Established Richmond homes see settling cracks and wear; new builds see nail pops and move-in accidents. We handle both with the same standard: invisible patches and clean job sites.`,
  },
  {
    legacySlug: 'kitchen-remodeling-richmond',
    citySlug: 'richmond',
    serviceSlug: 'kitchen-remodeling',
    seoTitle: 'Kitchen Remodeling in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Kitchen upgrades in Richmond, TX — backsplash, hardware, fixtures, and punch-list remodeling for Fort Bend homeowners.',
    heroTitle: 'Kitchen Remodeling in Richmond, TX',
    summary:
      'Practical kitchen upgrades in Richmond — backsplash, hardware, lighting, and coordinated punch-list work without a full GC overhaul.',
    localIntro:
      'Richmond homeowners often want a fresher kitchen without a six-month remodel. We focus on high-impact upgrades: backsplash, fixtures, hardware, and the finishing details that make a kitchen feel finished.',
    neighborhoods: ['Pecan Grove', 'Aliana', 'Harvest Green'],
    zipCodes: ['77406', '77407'],
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman'],
    faqs: [
      {
        question: 'Do you handle full kitchen gut remodels in Richmond?',
        answer:
          'We focus on upgrades and punch-list remodeling — backsplash, fixtures, hardware, and detail work. Major structural remodels may require a general contractor; we can discuss scope on a call.',
      },
    ],
    body: `## Kitchen upgrades for Richmond homeowners

A Richmond kitchen refresh might mean new backsplash in Pecan Grove, updated pendants in Aliana, or a move-in hardware swap in Harvest Green — each with different finishes and timelines.

### Common Richmond kitchen projects

- Backsplash installation and tile repair  
- Cabinet hardware and hinge upgrades  
- Pendant and under-cabinet lighting swaps  
- Faucet and fixture updates coordinated with your finish selections  

### Why Richmond homeowners call us

We focus on **high-impact upgrades** without a six-month GC remodel — clear scope, protected finishes, and scheduling that respects your household routine.`,
  },
  {
    legacySlug: 'bathroom-remodeling-richmond',
    citySlug: 'richmond',
    serviceSlug: 'bathroom-remodeling',
    seoTitle: 'Bathroom Remodeling in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Bathroom upgrades in Richmond, TX — fixtures, hardware, vanity installs, and punch-list remodeling for Fort Bend homes.',
    heroTitle: 'Bathroom Remodeling in Richmond, TX',
    summary:
      'Bathroom fixture swaps, vanity installation, hardware updates, and punch-list upgrades for Richmond homeowners.',
    localIntro:
      'From dated master baths in established Richmond subdivisions to builder-grade finishes in new Fort Bend communities, we help homeowners upgrade bathrooms with clear scope and reliable scheduling.',
    neighborhoods: ['Pecan Grove', 'Aliana', 'Veranda'],
    zipCodes: ['77406', '77407'],
    relatedCommunitySlugs: ['aliana-handyman', 'veranda-handyman'],
    faqs: [
      {
        question: 'Can you install a new vanity in my Richmond bathroom?',
        answer: 'Yes. Vanity installation, faucet swaps, mirror mounting, and hardware updates are common Richmond bathroom projects.',
      },
    ],
    body: `## Bathroom upgrades across Richmond

Richmond bathrooms range from aging tile and brass fixtures to brand-new builder packages homeowners want to personalize. We handle the upgrades that matter most day to day.`,
  },
  {
    legacySlug: 'door-installation-richmond',
    citySlug: 'richmond',
    serviceSlug: 'door-repair-installation',
    seoTitle: 'Door Installation in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Door repair and installation in Richmond, TX — interior, exterior, and hardware alignment for Pecan Grove and Fort Bend homes.',
    heroTitle: 'Door Installation in Richmond, TX',
    summary:
      'Interior and exterior door installation, hinge adjustment, and hardware upgrades for Richmond homeowners.',
    localIntro:
      'Sticky interior doors, misaligned exterior entries, and dated hardware are common in Richmond established homes. We install, adjust, and upgrade doors so they close cleanly and look intentional.',
    neighborhoods: ['Pecan Grove', 'Historic Richmond', 'Aliana'],
    zipCodes: ['77406', '77469'],
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman'],
    faqs: [
      {
        question: 'Do you replace interior doors in older Richmond homes?',
        answer: 'Yes. Interior door replacement, hinge shimming, and hardware upgrades are frequent requests in Pecan Grove and similar subdivisions.',
      },
    ],
    body: `## Door work for Richmond homes

Older Richmond homes often need hinge adjustment and hardware refresh; new builds may need pocket-door tuning or exterior hardware upgrades. We handle both with precise alignment and clean finishes.`,
  },
  {
    legacySlug: 'floor-and-decor-richmond',
    citySlug: 'richmond',
    serviceSlug: 'flooring-and-decor',
    seoTitle: 'Flooring & Decor in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Flooring transitions, trim, and decor installation in Richmond, TX for Fort Bend homeowners.',
    heroTitle: 'Flooring & Decor in Richmond, TX',
    summary:
      'Flooring transitions, baseboards, trim, and decor installation for Richmond homes — finishing details that tie a room together.',
    localIntro:
      'Richmond homeowners call us for transition strips, baseboard installs, accent trim, and decor mounting that completes a room after flooring or remodeling work.',
    neighborhoods: ['Aliana', 'Harvest Green', 'Pecan Grove'],
    zipCodes: ['77406', '77407'],
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman'],
    faqs: [
      {
        question: 'Do you install LVP or hardwood flooring in Richmond?',
        answer:
          'We handle trim, transitions, and finishing details around flooring projects. Full flooring installation scope depends on the product — contact us with your material and square footage.',
      },
    ],
    body: `## Flooring and decor finishing in Richmond

The last 10% of a flooring project — transitions, quarter-round, and trim — is where rooms look finished. We help Richmond homeowners close that gap.`,
  },
  {
    legacySlug: 'custom-cabinets-richmond',
    citySlug: 'richmond',
    serviceSlug: 'custom-carpentry',
    seoTitle: 'Custom Cabinets in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Custom cabinet and built-in carpentry in Richmond, TX — pantries, laundry built-ins, and storage for Fort Bend homes.',
    heroTitle: 'Custom Cabinets in Richmond, TX',
    summary:
      'Custom built-ins, pantry cabinets, and storage carpentry for Richmond homeowners who want tailored solutions beyond stock boxes.',
    localIntro:
      'Richmond homeowners in Pecan Grove, Aliana, and new Fort Bend communities often need storage that fits how they live — not just what came with the floor plan. We build custom cabinets and built-ins to match your space.',
    neighborhoods: ['Pecan Grove', 'Aliana', 'Harvest Green'],
    zipCodes: ['77406', '77407'],
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman'],
    faqs: [
      {
        question: 'Is custom cabinet work different from cabinet installation?',
        answer:
          'Yes. Custom cabinets and built-ins are designed and built for your space. We also install pre-built cabinets — see our cabinet installation service for stock unit installs.',
      },
    ],
    body: `## Custom cabinet work in Richmond

From laundry room built-ins in Aliana to pantry upgrades in Pecan Grove, Richmond homeowners use custom carpentry to add storage that stock cabinets cannot match.`,
  },
  {
    legacySlug: 'handyman-service-richmond',
    citySlug: 'richmond',
    serviceSlug: 'general-handyman-services',
    seoTitle: 'Handyman Service in Richmond, TX | Elevate Your Space Handyman',
    metaDescription:
      'Reliable handyman service in Richmond, TX — punch-list repairs, installations, and home upgrades for Fort Bend homeowners.',
    heroTitle: 'Handyman Service in Richmond, TX',
    summary:
      'Full-service handyman support in Richmond — multiple repairs, installations, and upgrades in one coordinated visit.',
    localIntro:
      'Richmond homeowners need a handyman who understands both historic properties and new master-planned builds. We bundle punch-list repairs, installations, and upgrades so you get more done in fewer visits.',
    neighborhoods: ['Pecan Grove', 'Aliana', 'Harvest Green', 'Veranda', 'Historic Richmond'],
    zipCodes: ['77406', '77407', '77469'],
    relatedCommunitySlugs: ['aliana-handyman', 'harvest-green-handyman', 'veranda-handyman'],
    faqs: [
      {
        question: 'Can I combine multiple small repairs in one Richmond visit?',
        answer: 'Yes. Bundled punch-list visits are one of our most popular Richmond services — ideal for move-in, move-out, or catch-up maintenance.',
      },
    ],
    body: `## Your Richmond handyman for repairs and upgrades

One call can cover TV mounting, drywall patches, door adjustments, fixture installs, and the dozen small items that never get done. We serve Richmond and surrounding Fort Bend communities with clear estimates and skilled work.`,
  },
  // Katy
  {
    legacySlug: 'electricians-katy',
    citySlug: 'katy',
    serviceSlug: 'electrical-services',
    seoTitle: 'Electricians in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Light electrical work in Katy, TX — ceiling fans, fixtures, outlets, and switches for established suburban homes and master-planned communities.',
    heroTitle: 'Electricians in Katy, TX',
    summary:
      'Fixture installation, ceiling fans, outlets, and dimmers for Katy homeowners in Cinco Ranch, Sunterra, Elyson, and surrounding neighborhoods.',
    localIntro:
      'Katy homes — especially 1990s and 2000s builds — often have dated fixtures and busy families who need electrical upgrades done right the first time. We handle light electrical work throughout Katy and coordinate licensed electricians when required.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Elyson', 'Cane Island', 'Tamarron'],
    zipCodes: ['77449', '77450', '77493', '77494'],
    housingNotes:
      'Many Katy homes have builder pre-wires for ceiling fans and standard-grade fixtures homeowners want to upgrade after move-in.',
    relatedCommunitySlugs: [
      'cinco-ranch-handyman',
      'sunterra-handyman',
      'elyson-handyman',
      'cane-island-handyman',
      'tamarron-handyman',
    ],
    faqs: [
      {
        question: 'Do you install ceiling fans in Katy homes with pre-wires?',
        answer: 'Yes. Ceiling fan installation on existing or builder pre-wires is one of our most common Katy requests.',
      },
    ],
    body: `## Electrical help for Katy homeowners

Katy families want safe, clean electrical upgrades without waiting weeks for a contractor. We install fans, swap fixtures, and upgrade switches across Katy ISD and surrounding communities.`,
  },
  {
    legacySlug: 'house-painting-katy',
    citySlug: 'katy',
    serviceSlug: 'painting',
    seoTitle: 'House Painting in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Interior painting in Katy, TX — room refreshes, accent walls, and trim touch-ups for established suburban homes.',
    heroTitle: 'House Painting in Katy, TX',
    summary:
      'Interior painting and touch-ups for Katy homeowners updating 1990s–2000s interiors or finishing new construction details.',
    localIntro:
      'Katy homeowners often refresh one room at a time — a primary suite, home office, or kids room — while living in the home. We prep properly, protect floors, and deliver clean lines.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Elyson', 'Old Katy'],
    zipCodes: ['77449', '77450', '77493'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman', 'elyson-handyman'],
    faqs: [
      {
        question: 'How long does a typical Katy room painting project take?',
        answer: 'Most single-room projects complete in one to two days depending on prep, repairs, and coat count.',
      },
    ],
    body: `## Painting for Katy suburban homes

Established Katy interiors benefit from accent walls, trim updates, and coordinated drywall repair before paint — especially when preparing a home for sale or refreshing after years of wear.`,
  },
  {
    legacySlug: 'drywall-repair-katy',
    citySlug: 'katy',
    serviceSlug: 'drywall-repair',
    seoTitle: 'Drywall Repair in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Drywall repair and texture matching in Katy, TX — holes, cracks, and patch-and-paint for suburban homes.',
    heroTitle: 'Drywall Repair in Katy, TX',
    summary:
      'Hole patches, crack repair, and texture matching for Katy walls and ceilings — often bundled with painting.',
    localIntro:
      'Kids, pets, furniture moves, and settling create drywall damage in every Katy neighborhood. We patch, match texture, and can coordinate paint so the repair disappears.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Cane Island'],
    zipCodes: ['77449', '77450', '77494'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman'],
    faqs: [
      {
        question: 'Can you repair drywall and paint in the same visit?',
        answer: 'Often yes. Many Katy homeowners bundle drywall repair with paint touch-ups in a single coordinated visit.',
      },
    ],
    body: `## Drywall repair across Katy

From nail pops in 1990s ceilings to door-handle holes in busy hallways, Katy drywall damage is routine — and fixable with proper texture matching and paint.`,
  },
  {
    legacySlug: 'kitchen-remodeling-katy',
    citySlug: 'katy',
    serviceSlug: 'kitchen-remodeling',
    seoTitle: 'Kitchen Remodeling in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Kitchen upgrades in Katy, TX — backsplash, hardware, fixtures, and punch-list remodeling for suburban families.',
    heroTitle: 'Kitchen Remodeling in Katy, TX',
    summary:
      'Kitchen backsplash, hardware, lighting, and punch-list upgrades for Katy homeowners who want impact without a full remodel timeline.',
    localIntro:
      'Katy families use their kitchens constantly. We focus on upgrades that improve daily life — backsplash, fixtures, hardware, and the finishing work that makes a kitchen feel complete.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Elyson'],
    zipCodes: ['77450', '77494', '77493'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman'],
    faqs: [
      {
        question: 'Can you install kitchen backsplash in Katy homes?',
        answer: 'Yes. Backsplash installation is a common Katy kitchen upgrade — especially in homes with dated 1990s and 2000s finishes.',
      },
    ],
    body: `## Kitchen upgrades for Katy families

A Katy kitchen project might be new backsplash before the holidays, updated pendants, or a move-in hardware refresh. We scope clearly and work around your schedule.`,
  },
  {
    legacySlug: 'bathroom-remodeling-services-katy',
    citySlug: 'katy',
    serviceSlug: 'bathroom-remodeling',
    seoTitle: 'Bathroom Remodeling in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Bathroom upgrades in Katy, TX — vanities, fixtures, hardware, and punch-list remodeling for suburban homes.',
    heroTitle: 'Bathroom Remodeling in Katy, TX',
    summary:
      'Vanity installs, fixture swaps, and bathroom punch-list upgrades for Katy homeowners.',
    localIntro:
      'Katy bathrooms in 1990s and 2000s homes often need vanity updates, faucet swaps, and hardware refreshes. We handle bathroom upgrades with clear estimates and clean workmanship.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Tamarron'],
    zipCodes: ['77450', '77494'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman', 'tamarron-handyman'],
    faqs: [
      {
        question: 'Do you replace bathroom vanities in Katy?',
        answer: 'Yes. Vanity installation, mirror mounting, and faucet upgrades are standard Katy bathroom projects.',
      },
    ],
    body: `## Bathroom upgrades in Katy

Busy Katy families want bathroom improvements done efficiently — one vanity swap, new fixtures, or a coordinated punch list without weeks of disruption.`,
  },
  {
    legacySlug: 'door-installation-services-katy',
    citySlug: 'katy',
    serviceSlug: 'door-repair-installation',
    seoTitle: 'Door Installation in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Door repair and installation in Katy, TX — interior, exterior, and hardware for established suburban homes.',
    heroTitle: 'Door Installation in Katy, TX',
    summary:
      'Interior and exterior door installation, hinge adjustment, and hardware upgrades throughout Katy.',
    localIntro:
      'Sticky doors, worn hardware, and misaligned entries are common in Katy 1990s and 2000s housing stock. We install and adjust doors so they operate smoothly and look updated.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Old Katy'],
    zipCodes: ['77449', '77450', '77493'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman'],
    faqs: [
      {
        question: 'Can you fix doors that stick or do not latch in Katy homes?',
        answer: 'Yes. Hinge adjustment, strike plate alignment, and hardware upgrades are frequent Katy door repairs.',
      },
    ],
    body: `## Door installation and repair in Katy

From interior slab replacements to exterior hardware upgrades, Katy homeowners rely on us for doors that close cleanly and look intentional.`,
  },
  {
    legacySlug: 'floor-and-decor-katy',
    citySlug: 'katy',
    serviceSlug: 'flooring-and-decor',
    seoTitle: 'Flooring & Decor in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Flooring transitions, trim, and decor installation in Katy, TX for suburban homeowners.',
    heroTitle: 'Flooring & Decor in Katy, TX',
    summary:
      'Transitions, baseboards, trim, and decor installation — finishing details for Katy flooring and remodeling projects.',
    localIntro:
      'After new flooring or a room refresh, Katy homeowners need transitions, trim, and decor mounted correctly. We handle those finishing details that make the project feel complete.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Elyson'],
    zipCodes: ['77450', '77494'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman'],
    faqs: [
      {
        question: 'Do you install baseboards and transition strips in Katy?',
        answer: 'Yes. Trim and transition work is a common follow-up to flooring projects in Katy homes.',
      },
    ],
    body: `## Flooring and decor in Katy

The details matter — quarter-round, transition strips, and accent trim turn a flooring install into a finished room. We help Katy homeowners close that gap.`,
  },
  {
    legacySlug: 'custom-cabinets-katy',
    citySlug: 'katy',
    serviceSlug: 'custom-carpentry',
    seoTitle: 'Custom Cabinets in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Custom cabinet and built-in carpentry in Katy, TX — pantries, laundry storage, and tailored built-ins.',
    heroTitle: 'Custom Cabinets in Katy, TX',
    summary:
      'Custom built-ins and storage carpentry for Katy homeowners who need solutions beyond stock cabinetry.',
    localIntro:
      'Katy families often need better pantry storage, laundry built-ins, and mudroom organization. We design and build custom cabinets that fit how you use your home.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Cane Island'],
    zipCodes: ['77450', '77494'],
    relatedCommunitySlugs: ['cinco-ranch-handyman', 'sunterra-handyman', 'cane-island-handyman'],
    faqs: [
      {
        question: 'What is the difference between custom cabinets and cabinet installation?',
        answer:
          'Custom cabinets are built for your space. Cabinet installation covers pre-built units. We offer both — this page focuses on custom carpentry work.',
      },
    ],
    body: `## Custom cabinets and built-ins in Katy

Laundry rooms, pantries, and under-stair storage are prime candidates for custom Katy carpentry — especially in 1990s and 2000s floor plans with limited storage.`,
  },
  {
    legacySlug: 'handyman-services-katy',
    citySlug: 'katy',
    serviceSlug: 'general-handyman-services',
    seoTitle: 'Handyman Services in Katy, TX | Elevate Your Space Handyman',
    metaDescription:
      'Professional handyman services in Katy, TX — punch-list repairs, installations, and home upgrades for busy families.',
    heroTitle: 'Handyman Services in Katy, TX',
    summary:
      'Reliable handyman services in Katy — multiple repairs and installations handled in one coordinated visit.',
    localIntro:
      'Katy homeowners need a handyman who shows up, communicates clearly, and finishes the punch list. We serve Katy and master-planned communities throughout the area with bundled repair and installation visits.',
    neighborhoods: ['Cinco Ranch', 'Sunterra', 'Elyson', 'Cane Island', 'Tamarron'],
    zipCodes: ['77449', '77450', '77493', '77494'],
    relatedCommunitySlugs: [
      'cinco-ranch-handyman',
      'sunterra-handyman',
      'elyson-handyman',
      'cane-island-handyman',
      'tamarron-handyman',
    ],
    faqs: [
      {
        question: 'What can I bundle in one Katy handyman visit?',
        answer:
          'TV mounting, drywall patches, door adjustments, fixture installs, furniture assembly, and more — send your list and we will confirm scope.',
      },
    ],
    body: `## Handyman services for Katy homeowners

Between school, work, and everything else, DIY slides to the bottom of the list. We help Katy families knock out repairs and upgrades efficiently — with honest estimates and work you do not have to revisit.`,
  },
];

function yamlList(key, items) {
  if (!items?.length) return '';
  return `${key}:\n${items.map((i) => `  - "${i.replace(/"/g, '\\"')}"`).join('\n')}\n`;
}

function yamlFaqs(faqs) {
  if (!faqs?.length) return '';
  const lines = faqs.flatMap((f) => [
    '  - question: "' + f.question.replace(/"/g, '\\"') + '"',
    '    answer: "' + f.answer.replace(/"/g, '\\"') + '"',
  ]);
  return `faqs:\n${lines.join('\n')}\n`;
}

await mkdir(OUT, { recursive: true });

for (const page of pages) {
  const frontmatter = `---
legacySlug: "${page.legacySlug}"
citySlug: "${page.citySlug}"
serviceSlug: "${page.serviceSlug}"
seoTitle: "${page.seoTitle.replace(/"/g, '\\"')}"
metaDescription: "${page.metaDescription.replace(/"/g, '\\"')}"
heroTitle: "${page.heroTitle.replace(/"/g, '\\"')}"
summary: "${page.summary.replace(/"/g, '\\"')}"
heroImage: "/images/services/${page.serviceSlug}.jpg"
heroImageAlt: "${page.heroTitle.replace(/"/g, '\\"')}"
localIntro: "${page.localIntro.replace(/"/g, '\\"')}"
${yamlList('neighborhoods', page.neighborhoods)}${yamlList('zipCodes', page.zipCodes)}${page.housingNotes ? `housingNotes: "${page.housingNotes.replace(/"/g, '\\"')}"\n` : ''}${yamlList('relatedCommunitySlugs', page.relatedCommunitySlugs)}${yamlFaqs(page.faqs)}published: true
---

${page.body}
`;

  await writeFile(join(OUT, `${page.legacySlug}.md`), frontmatter, 'utf8');
  console.log('Wrote', page.legacySlug);
}

console.log(`Done — ${pages.length} city-service pages.`);
