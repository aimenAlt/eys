import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(import.meta.dirname, '../src/content/communities');
mkdirSync(outDir, { recursive: true });

const promoOffer = '$25 off projects over $250';

const communities = [
  {
    title: 'Cinco Ranch',
    slug: 'cinco-ranch-handyman',
    citySlug: 'katy',
    promoCode: 'CINCO25',
    seoTitle: 'Premium Handyman Services in Cinco Ranch | Elevate Your Space',
    metaDescription:
      'Need a reliable handyman in Cinco Ranch? Elevate Your Space offers premium TV mounting, trim work, and home upgrades for Katy residents. Request an estimate!',
    heroTitle: 'Premium Handyman Services for Cinco Ranch Homeowners',
    summary:
      'Elevate Your Space Handyman delivers professional, meticulously clean, and reliable home improvement services tailored to the established, beautiful homes of Cinco Ranch.',
    localIntro:
      'From the mature, tree-lined streets of the original 77450 sections to the expansive modern layouts in Cinco Ranch Southwest, this community has defined upscale Katy living since the early 1990s. Because homes here were built anywhere from 1991 to 2015, property maintenance requires a nuanced, experienced approach. Whether you are modernizing a mid-90s kitchen to match the contemporary aesthetic of LaCenterra, repairing exterior patio structures worn by Gulf Coast humidity, or updating light fixtures prior to a real estate listing, Elevate Your Space serves as your trusted local partner.',
    faqs: [
      {
        question: 'Do you work in both the older (77450) and newer (77494) sections of Cinco Ranch?',
        answer:
          'Yes, we service all villages, adapting our installation and carpentry approaches whether we are dealing with 1990s construction or newer builds.',
      },
      {
        question: 'Can you assist with HOA compliance for exterior patio updates?',
        answer:
          'We strictly follow Cinco Ranch HOA and CIA Services guidelines for any exterior wood or trim replacements to ensure your home remains fully compliant.',
      },
      {
        question: 'Do you service the Heritage Grand 55+ community?',
        answer:
          'Absolutely. We provide respectful, quiet, and highly detailed service for active adults in Heritage Grand who are seeking a truly maintenance-free living experience.',
      },
      {
        question: 'What if my trim project requires plumbing or electrical adjustments?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'How quickly can you install garage storage?',
        answer:
          'Once the project is scoped and approved, our team can typically install robust garage storage solutions in a single afternoon.',
      },
    ],
    body: `## Handyman Services for Cinco Ranch Homes

As properties in Cinco Ranch mature, the necessity for detail-oriented upkeep naturally increases. EYS bridges the critical gap between a massive general contractor and an unpredictable neighborhood repairman, offering premium, white-glove execution.

### Common Projects We Help With

- **TV Mounting** — secure mounting for modern displays on aging 1990s drywall or custom stone fireplaces
- **Curtain Installation** — perfectly leveled heavy-duty hardware for custom drapery in high-ceiling living rooms
- **Wall-Mounted Shelving** — custom floating shelves for family photos in traditional floor plans
- **Cabinet Hardware** — instant modernization of 1990s and 2000s kitchen cabinets with precise pulls and knobs
- **Trim Work** — replacement of aging baseboards, crown molding, and window casings
- **Carpentry** — custom built-ins tailored to traditional suburban architecture in the 77450 zip code
- **Media Walls** — shiplap or wood-slat feature walls to elevate main living spaces
- **Painting** — precise touch-ups and accent walls without the mess
- **Light Fixture & Ceiling Fan Installation** — replacing dated brass fixtures with modern, energy-efficient designs
- **Garage Storage** — overhead racks and shelving for bikes, golf clubs, and seasonal decor
- **Furniture Assembly** — structurally sound assembly of patio sets and interior furniture
- **Outdoor/Patio Improvements** — patio trim and outdoor living upgrades with HOA compliance in mind

## Why Cinco Ranch Homeowners Call EYS

Inviting a contractor into your home requires immense trust. EYS is recognized throughout Katy for rigorous project scoping, immaculate workspaces, and profound respect for the home. We arrive strictly on time, communicate clearly throughout the project, and guarantee we will leave your home cleaner than we found it.

## Good Fit Projects

We excel at bundled punch-list work for homeowners preparing their properties for the resale market, or for new buyers wanting to customize a recently purchased resale home. From hanging heavy mirrors in formal dining rooms to installing overhead garage storage, we handle complex aesthetic details seamlessly.

## Local Lifestyle Angle

The Cinco Ranch lifestyle revolves around community engagement — summer weekends at the Beach Club, biking the interconnected trails, or evenings out at LaCenterra. Homeowners should not have to sacrifice their weekends wrestling with drywall anchors or replacing rotted patio trim. EYS takes the burden of home maintenance off your shoulders so you can return to the active lifestyle that drew you to Katy's most iconic neighborhood.

## How the Process Works

First, send photos and details of your project via our online form. Second, our team scopes the project and returns a transparent, detailed estimate. Third, we schedule a visit at a convenient time, arriving fully prepared. Finally, we execute the project meticulously and perform a comprehensive clean-up before we consider the job complete.`,
  },
  {
    title: 'Sunterra',
    slug: 'sunterra-handyman',
    citySlug: 'katy',
    promoCode: 'SUNTERRA25',
    seoTitle: 'Handyman for New Homes in Sunterra, Katy | Elevate Your Space',
    metaDescription:
      "Moving into Sunterra? Elevate Your Space offers premium TV mounting, ceiling fan installation, and move-in upgrades for Katy's newest resort community.",
    heroTitle: 'Premium Handyman & Move-In Services for Sunterra Homes',
    summary:
      'Elevate Your Space helps you transform your brand-new Sunterra house into a fully functional, customized home with premium installation and aesthetic upgrade services.',
    localIntro:
      'Sunterra is rapidly evolving into one of Katy\'s most exciting residential destinations, bringing a Crystal Lagoon and the Sol Club to the 77493 zip code. While your newly constructed home provides a beautiful blank canvas, making it truly yours requires critical finishing touches. From mounting heavy smart TVs and installing ceiling fans to setting up overhead garage storage, EYS specializes in post-closing upgrades with flawless precision.',
    faqs: [
      {
        question: 'Can you install hardware on my brand-new builder cabinets without damaging them?',
        answer:
          'Absolutely. We use advanced precision jigs to ensure every knob and pull is perfectly aligned with zero splintering or damage to the veneer.',
      },
      {
        question: 'Do you mount TVs on stone fireplaces in new builds?',
        answer:
          'Yes, we possess the proper masonry bits and heavy-duty anchoring systems to mount displays securely on stone or tile.',
      },
      {
        question: 'What if I want to swap a hardwired light fixture?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'Can you install ceiling fans in rooms that are only pre-wired?',
        answer:
          'Yes, we frequently install fans on pre-wired boxes left by builders like CastleRock and Colina Homes throughout Sunterra.',
      },
      {
        question: 'How soon after my closing date can you come?',
        answer:
          'We strongly recommend reaching out two to three weeks before your closing date to secure your preferred installation day on our schedule.',
      },
    ],
    body: `## Handyman Services for Sunterra Homes

Because new homes lack the wear-and-tear of older properties, our operational focus in Sunterra is strictly on enhancement, organization, and custom styling. EYS provides the white-glove touch your new real estate investment demands.

### Common Projects We Help With

- **TV Mounting** — perfect placement and secure mounting on fresh drywall or new fireplaces
- **Curtain Installation** — privacy and leveled, securely anchored hardware for new windows
- **Wall-Mounted Shelving** — structural display spaces in open-concept living areas
- **Cabinet Hardware** — high-end pulls and knobs on builder-grade kitchen cabinets
- **Trim Work** — accent walls, wainscoting, or crown molding for instant character
- **Carpentry** — custom drop-zones or mudroom benches for busy families
- **Media Walls** — slatted wood or shiplap walls for a statement living room
- **Painting** — accent colors to neutralize standard builder-beige or white walls
- **Light Fixture & Ceiling Fan Installation** — statement lighting in dining rooms and bedrooms
- **Garage Storage** — heavy-duty ceiling racks before the moving boxes are even unpacked
- **Furniture Assembly** — rapid assembly of bedroom sets, dining tables, and patio furniture
- **Move-In Upgrades** — comprehensive punch-list completion so you settle in faster

## Why Sunterra Homeowners Call EYS

Moving is stressful enough without assembling complex furniture or locating studs in brand-new walls. EYS brings a clean, highly organized, and professional approach. We wear shoe covers, protect your pristine new floors, and utilize dust-extraction tools to leave zero debris behind.

## Good Fit Projects

Our specialty in Sunterra is the comprehensive "Move-In Weekend Package." Send us your list — mounting TVs, assembling patio furniture, installing ceiling fans on builder pre-wires, hanging bedroom curtains — and our team executes every task seamlessly in a single visit.

## Local Lifestyle Angle

Life in Sunterra is designed to emulate a vacation. When you live near white sand beaches, a lazy river, and a tropical lagoon, your weekends should not be spent on Swedish furniture instructions or balancing on a ladder. Let EYS handle the technical home setup so you can grab your paddleboard and enjoy the Sol Club.

## How the Process Works

First, send photos and details via our online form. Second, EYS scopes the project and returns a clear, itemized estimate. Third, we schedule a visit aligned with your closing or move-in dates. Finally, we execute the work with white-glove care, ensuring your brand-new finishes remain pristine.`,
  },
  {
    title: 'Elyson',
    slug: 'elyson-handyman',
    citySlug: 'katy',
    promoCode: 'ELYSON25',
    seoTitle: 'Expert Handyman Services in Elyson, Katy | Elevate Your Space',
    metaDescription:
      'Need home upgrades in Elyson? Elevate Your Space provides premium carpentry, TV mounting, and garage storage for Elyson residents. Request an estimate!',
    heroTitle: 'Expert Handyman & Home Upgrade Services for Elyson',
    summary:
      'Elevate Your Space provides meticulous, premium home improvements and custom carpentry to tailor your beautiful Elyson home to your family\'s exact needs.',
    localIntro:
      'Elyson beautifully combines modern home designs with a profound appreciation for the outdoors, featuring miles of winding trails, community orchards, and the vibrant Elyson House. Because most homes here were constructed recently by premium builders, major structural repairs are rarely necessary. Instead, Elyson homeowners look to strategically elevate their spaces — custom mudrooms, covered patio upgrades, and robust garage storage for trail bikes.',
    faqs: [
      {
        question: 'Can you build custom mudroom benches to match my existing Elyson home trim?',
        answer:
          'Yes, our skilled carpentry team can seamlessly match modern prairie or traditional trim styles so built-ins look original to the home.',
      },
      {
        question: 'Do you install garage racks strong enough to hold camping gear and bikes?',
        answer:
          'Absolutely. We anchor heavy-duty racks directly into ceiling joists — perfect for gear used on Elyson\'s 30+ miles of trails.',
      },
      {
        question: 'Are you able to mount TVs on outdoor patios?',
        answer:
          'Yes, we can securely mount outdoor-rated TVs on your covered patio. We can help coordinate licensed trade support if new exterior outlets are needed.',
      },
      {
        question: 'Do you offer services in the newer Cy-Fair ISD sections of Elyson?',
        answer:
          'Yes, our service area encompasses all of Elyson, regardless of Katy ISD or CFISD zoning boundaries.',
      },
      {
        question: 'How do you protect my floors during carpentry work?',
        answer:
          'We use heavy-duty drop cloths, mandatory shoe covers, and specialized dust-extraction tools to keep your pristine floors protected.',
      },
    ],
    body: `## Handyman Services for Elyson Homes

We specialize in taking your beautiful production home and injecting the custom touches that make it entirely unique to your family. From precise cabinet hardware installation to custom architectural accent walls, EYS delivers with professionalism and care.

### Common Projects We Help With

- **TV Mounting** — clean, wire-concealed mounting for living rooms and game rooms
- **Curtain Installation** — heavy-duty anchoring for drapes that block intense Texas sun
- **Wall-Mounted Shelving** — floating shelves in open-concept kitchens
- **Cabinet Hardware** — premium pulls on modern prairie or traditional cabinetry
- **Trim Work & Carpentry** — wainscoting, mudroom benches, and crown molding
- **Media Walls** — high-end slatted wood feature walls for entertainment centers
- **Painting** — flawless accent walls in standard builder layouts
- **Light Fixture & Ceiling Fan Installation** — improved ambiance and airflow
- **Garage Storage** — ceiling racks and wall shelving for outdoor gear and bikes
- **Furniture Assembly** — secure assembly of complex indoor or outdoor furniture
- **Punch-List Work** — systematic completion of lingering home updates
- **Outdoor/Patio Improvements** — patio fan mounts and outdoor furniture assembly

## Why Elyson Homeowners Choose EYS

We deeply respect the investment you have made in your Elyson home. EYS stands out by providing highly accurate estimates, arriving strictly on schedule, and maintaining an exceptionally clean workspace with drop cloths and dust-extraction equipment.

## Good Fit Projects

A highly requested project is the "Family Organization Package": a custom drop-zone for Katy ISD or Cy-Fair ISD backpacks, heavy-duty garage racks for bikes used at Speedway Park, and a securely mounted TV in the family room.

## Local Lifestyle Angle

Elyson is built for active living — Adventure Point, Elyson House, and community events on the great lawn. You should not spend your Saturday frustrated with a tape measure and drywall anchors. EYS gives you your weekend back.

## How the Process Works

Send pictures and project details through our online form. EYS scopes the work with a transparent project outline, schedules a punctual visit, executes the job flawlessly, and cleans up completely before departure.`,
  },
  {
    title: 'Cane Island',
    slug: 'cane-island-handyman',
    citySlug: 'katy',
    promoCode: 'CANE25',
    seoTitle: 'Luxury Handyman & Carpentry in Cane Island | Elevate Your Space',
    metaDescription:
      'Elevate Your Space provides white-glove handyman services, custom carpentry, and premium home upgrades for Cane Island in Katy, TX. Request an estimate!',
    heroTitle: 'Luxury Handyman & Home Upgrades for Cane Island',
    summary:
      'Elevate Your Space provides white-glove home improvement, custom carpentry, and meticulous installations specifically tailored to the luxury estates of Cane Island.',
    localIntro:
      'Cane Island is famously "delightfully different," offering a resort-style luxury lifestyle set among 75-year-old oak trees just minutes from I-10. With high-end semi-custom builds and sprawling custom estates featuring premium finishes and tall ceilings, basic handyman services will not suffice. EYS brings the precision, professionalism, and high-end craftsmanship required to enhance your luxury property seamlessly and safely.',
    faqs: [
      {
        question: 'Can you safely mount a TV on a custom floor-to-ceiling stone fireplace?',
        answer:
          'Yes, we use specialized masonry tools and heavy-duty anchors for secure, damage-free mounting on custom stone without cracking the veneer.',
      },
      {
        question: 'Do you offer custom carpentry for luxury mudrooms or home offices?',
        answer:
          'Absolutely. We design and install custom built-ins that perfectly match the high-end trim of your Cane Island home.',
      },
      {
        question: 'What if my new chandelier requires scaffolding or complex wiring?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'How do you protect my home during messy projects like trim work?',
        answer:
          'We use extensive drop cloths, zip-wall dust barriers when necessary, and HEPA-filtered vacuums to protect your luxury finishes.',
      },
      {
        question: 'Are you able to install ceiling racks in a garage with oversized ceilings?',
        answer:
          'Yes, we easily accommodate the tall ceiling heights common in custom homes to maximize vertical storage space.',
      },
    ],
    body: `## Premium Projects We Execute in Cane Island

We specialize exclusively in aesthetic enhancements that elevate your interior spaces without disrupting your home's refined design or risking damage to premium finishes.

### Common Projects We Help With

- **TV Mounting** — flawless mounting on custom stone, tile, or shiplap fireplaces
- **Curtain Installation** — heavy custom drapery at exact heights for oversized windows
- **Wall-Mounted Shelving** — custom wood or glass floating shelves for executive home offices
- **Cabinet Hardware** — precision installation of designer pulls on high-end cabinetry
- **Trim Work & Carpentry** — wainscoting, crown molding, and custom architectural details
- **Media Walls** — bespoke wood-slat or shiplap feature walls for luxury entertainment spaces
- **Painting** — impeccable touch-ups and sophisticated accent walls
- **Light Fixture & Ceiling Fan Installation** — careful hanging of heavy chandeliers and premium fans
- **Garage Storage** — commercial-grade ceiling racks for immaculate luxury garages
- **Furniture Assembly** — white-glove assembly of high-end designer furniture
- **Move-In Upgrades** — final details of new custom or semi-custom builds
- **Outdoor/Patio Improvements** — outdoor kitchen and patio enhancements for evening entertaining

## Why Cane Island Homeowners Require EYS

Luxury homes demand a significantly higher standard of care. EYS utilizes rigorous project scoping, aggressively protects hardwood and stone floors, uses HEPA dust-extraction during carpentry, and conducts ourselves with absolute professionalism.

## Good Fit Projects

We excel at high-end visual centerpieces: a custom slatted-wood media wall, an 85-inch TV securely mounted above the fireplace, and a heavy statement chandelier in the dining room — all delivered flawlessly.

## Local Lifestyle Angle

Cane Island is designed for leisure — dining at The Oaks Kitchen, enjoying Cane Quarter, or admiring the Ambassador Suite treehouse. Let EYS handle the intricate technical details so you can fully enjoy the sophisticated lifestyle Cane Island offers.

## How the Process Works

Provide details and photos through our secure form. EYS scopes the work with a transparent estimate, arrives punctually and fully prepared, executes with precision, and performs a meticulous cleanup.`,
  },
  {
    title: 'Tamarron',
    slug: 'tamarron-handyman',
    citySlug: 'katy',
    promoCode: 'TAMARRON25',
    seoTitle: 'Handyman & New Home Upgrades in Tamarron | EYS',
    metaDescription:
      'Elevate Your Space provides premium TV mounting, ceiling fan installation, and new home upgrades for Tamarron residents in Katy and Fulshear. Request an estimate!',
    heroTitle: 'Premium Handyman & Move-In Upgrades for Tamarron',
    summary:
      'Elevate Your Space provides the premium finishing touches, custom installations, and upgrades needed to personalize your new Tamarron home.',
    localIntro:
      'Spanning Katy and Fulshear, Tamarron is one of the largest and most exciting master-planned communities in the area. With thousands of new D.R. Horton homes and the exclusive Wellspring 55+ neighborhood, residents enjoy amenities like Club Tamarron. Production homes often require a personal touch — hardware on builder-grade cabinets, securely mounted TVs, and organized garages. EYS specializes in essential post-closing upgrades.',
    faqs: [
      {
        question: 'Can you install cabinet hardware on my new D.R. Horton cabinets without damaging them?',
        answer:
          'Absolutely. We use specialized drilling jigs to ensure flawless, perfectly aligned holes every time, instantly transforming builder-grade cabinets.',
      },
      {
        question: 'Do you provide services in the Wellspring 55+ neighborhood?',
        answer:
          'Yes, we frequently work in Wellspring, providing quiet, respectful, and highly detailed service for active adults.',
      },
      {
        question: 'Do you install ceiling fans where the builder only left a pre-wired cap?',
        answer: 'Yes, we routinely and safely install fans on builder pre-wires in new Tamarron homes.',
      },
      {
        question: 'What if I want to add new recessed lighting?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'How soon before closing should I book your services?',
        answer:
          'We highly recommend contacting us two to three weeks before your closing date to ensure we can arrive shortly after you move in.',
      },
    ],
    body: `## Handyman Services for Tamarron Homes

We focus on precision installations and premium enhancements for new properties, treating your fresh drywall and unblemished floors with the utmost respect.

### Common Projects We Help With

- **TV Mounting** — clean, perfectly leveled mounting in living rooms and bedrooms
- **Curtain Installation** — level rods and heavy drapes for immediate privacy
- **Wall-Mounted Shelving** — custom floating shelves for instant character
- **Cabinet Hardware** — premium hardware on builder-grade kitchen and bathroom cabinets
- **Trim Work & Carpentry** — drop-zones, wainscoting, or crown molding
- **Media Walls** — custom slatted wood walls for a modern focal point
- **Painting** — rich accent colors to replace standard builder paint
- **Light Fixture & Ceiling Fan Installation** — fans in pre-wired rooms
- **Garage Storage** — overhead racks for tools and moving boxes
- **Furniture Assembly** — beds, dining tables, and patio sets
- **Move-In Upgrades** — entire post-closing punch list in one visit
- **Outdoor/Patio Improvements** — covered patio upgrades for outdoor entertaining

## Why Tamarron Homeowners Call EYS

Moving into a new home is a massive undertaking. EYS relieves the stress by arriving on time, working efficiently, wearing shoe covers, and using precision tools like custom drilling jigs for cabinets.

## Good Fit Projects

We excel at whole-home move-in packages: assemble furniture, mount TVs, install ceiling fans, and put up overhead garage storage so you can settle in comfortably and quickly.

## Local Lifestyle Angle

Life in Tamarron is built around recreation — Club Tamarron, miles of trails, and active social clubs in Wellspring. EYS handles the technical setup so you can enjoy your new community from day one.

## How the Process Works

Tell us what your new home needs via our online photo form. EYS scopes the project with a transparent estimate, coordinates with your move-in schedule, executes flawlessly, and cleans up entirely.`,
  },
  {
    title: 'Bridgeland',
    slug: 'bridgeland-handyman',
    citySlug: 'cypress',
    promoCode: 'BRIDGELAND25',
    seoTitle: 'Premium Handyman & Carpentry in Bridgeland | Elevate Your Space',
    metaDescription:
      'Elevate Your Space offers premium handyman services, custom carpentry, and home upgrades for Bridgeland residents in Cypress, TX. Request an estimate!',
    heroTitle: 'Premium Handyman & Home Upgrades for Bridgeland',
    summary:
      'Elevate Your Space delivers meticulous, high-end home improvements that meet the exacting standards of Bridgeland\'s beautiful homes and strict architectural guidelines.',
    localIntro:
      'Bridgeland is a visionary Howard Hughes community where stunning architecture and preserved nature intertwine across 11,500 acres. From Prairie School-inspired designs in Parkland Village to the scenic waterfronts of Josey Lake, homes here are constructed with exceptional quality. When homeowners require upgrades, they cannot settle for a standard repairman. EYS provides the premium, detail-obsessed service required to enhance your luxury property safely.',
    faqs: [
      {
        question: 'Are you familiar with the strict Architectural Review Committee (ARC) guidelines in Bridgeland?',
        answer:
          'Yes, we understand that exterior modifications require strict adherence to Bridgeland\'s ACC/ARC standards regarding materials and aesthetics.',
      },
      {
        question: 'Do you build custom mudrooms or drop-zones?',
        answer:
          'Absolutely. Custom carpentry is one of our core specialties, perfect for keeping kids\' gear organized after a day at the park.',
      },
      {
        question: 'Can you install heavy chandeliers in two-story entryways?',
        answer:
          'We can help coordinate appropriate licensed trade support when the project requires scaffolding or complex high-voltage electrical work.',
      },
      {
        question: 'Do you service all the villages in Bridgeland?',
        answer: 'Yes, we serve Lakeland, Parkland, Prairieland, and the rapidly growing Creekland Village.',
      },
      {
        question: 'How do you handle TV mounting on custom stone fireplaces?',
        answer:
          'We utilize specialized masonry bits and heavy-duty anchors to ensure a completely secure and damage-free mount on custom stone or tile.',
      },
    ],
    body: `## Handyman Services for Bridgeland Homes

We focus exclusively on high-quality aesthetic and functional upgrades, deeply respecting your home's luxury finishes and the strict guidelines enforced by the Bridgeland HOA.

### Common Projects We Help With

- **TV Mounting** — flawless mounting on high-end drywall, shiplap, or luxury stone fireplaces
- **Curtain Installation** — precise installation of heavy luxury window treatments
- **Wall-Mounted Shelving** — custom floating shelves for home offices and living areas
- **Cabinet Hardware** — premium pulls to elevate upscale kitchen design
- **Trim Work & Carpentry** — crown molding, substantial baseboards, and custom built-ins
- **Media Walls** — architectural feature walls as the visual focal point of your home
- **Painting** — crisp touch-ups and sophisticated accent walls
- **Light Fixture & Ceiling Fan Installation** — heavy chandeliers and modern fans
- **Garage Storage** — industrial-grade overhead racks for pristine garages
- **Furniture Assembly** — white-glove assembly of high-value furniture
- **Move-In Upgrades** — finishing touches for new builds in Prairieland or Creekland Villages
- **Outdoor/Patio Improvements** — covered spaces for lakeside entertaining

## Why Bridgeland Homeowners Trust EYS

Our commitment to excellence aligns with the Bridgeland ethos. We utilize rigorous project scoping, courteous technicians, protective gear for expensive floors, and HEPA vacuums for meticulous cleanup.

## Good Fit Projects

We excel at high-impact visual upgrades: a custom media wall, heavy-duty TV mounting, and precise installation of a heavy statement chandelier in a two-story dining room.

## Local Lifestyle Angle

Bridgeland offers 250 miles of trails, kayaking on Josey Lake, and recreation at Dragonfly Park. Let EYS handle the heavy lifting so you can grab your bike or kayak and enjoy the true Bridgeland experience.

## How the Process Works

Send photos of your vision through our online portal. EYS scopes the work with a detailed estimate, arrives exactly when promised, executes flawlessly, and leaves your home spotless.`,
  },
  {
    title: 'Towne Lake',
    slug: 'towne-lake-handyman',
    citySlug: 'cypress',
    promoCode: 'TOWNELAKE25',
    seoTitle: 'Towne Lake Handyman & Home Upgrades | Elevate Your Space',
    metaDescription:
      'Enjoy the lake life while we handle your home. Elevate Your Space provides premium handyman, carpentry, and outdoor upgrades for Towne Lake in Cypress, TX.',
    heroTitle: 'Premium Handyman Services for Towne Lake Homeowners',
    summary:
      'Elevate Your Space provides top-tier home improvements and meticulous maintenance, ensuring your Towne Lake home remains as stunning as its waterfront views.',
    localIntro:
      'Towne Lake, masterfully developed by Caldwell Communities, offers an unmatched lifestyle centered around a spectacular 300-acre private recreational lake — the largest in the Houston area. Homes here, especially custom waterfront lots, require a meticulous approach to maintenance and upgrades. Whether you are updating a covered patio, adding custom interior woodwork, or modernizing hardware, EYS delivers the premium craftsmanship your property demands.',
    faqs: [
      {
        question: 'Can you install heavy-duty storage for my boating gear?',
        answer:
          'Yes, we install industrial-strength overhead garage racks perfect for life jackets, wakeboards, and lake toys safely off the floor.',
      },
      {
        question: 'Do you install outdoor fans and TVs on waterfront patios?',
        answer:
          'Absolutely. We ensure secure, perfectly leveled mounting for outdoor entertainment spaces exposed to the elements.',
      },
      {
        question: 'Are you familiar with the Towne Lake HOA guidelines?',
        answer:
          'Yes, we understand that exterior modifications visible from the water or docks require strict adherence to CCMC and Towne Lake HOA architectural standards.',
      },
      {
        question: 'What if my outdoor kitchen needs plumbing adjustments?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'How do you protect my home during interior carpentry?',
        answer:
          'We utilize extensive floor protection, HEPA dust-containment systems, and mandatory daily cleanups.',
      },
    ],
    body: `## Handyman Services for Towne Lake Homes

We specialize in aesthetic enhancements and precise installations specifically tailored for luxury properties.

### Common Projects We Help With

- **TV Mounting** — indoor theaters or outdoor covered patios facing the lake
- **Curtain Installation** — drapes that perfectly frame waterfront views
- **Wall-Mounted Shelving** — elegant floating shelves for custom home designs
- **Cabinet Hardware** — premium upgrades for kitchens and outdoor cooking spaces
- **Trim Work & Carpentry** — wainscoting, crown molding, and architectural details
- **Media Walls** — shiplap or wood-slat walls for modern luxury living rooms
- **Painting** — crisp accent wall painting to refresh your space
- **Light Fixture & Ceiling Fan Installation** — statement fixtures and outdoor-rated patio fans
- **Garage Storage** — overhead racks for wakeboards, life jackets, and boating gear
- **Furniture Assembly** — premium patio furniture for your lakeside deck
- **Punch-List Work** — accumulated minor repairs with white-glove service
- **Outdoor/Patio Improvements** — covered spaces for lakeside entertaining

## Why Towne Lake Residents Choose EYS

We understand the high expectations of Towne Lake residents. EYS protects flooring with drop cloths, uses precision tools, and guarantees a spotless cleanup.

## Good Fit Projects

We are ideal for outdoor living enhancements: outdoor-rated TV mounting, exterior ceiling fans, and premium patio furniture assembly before a sunset gathering — all in one seamless visit.

## Local Lifestyle Angle

Towne Lake is famous for its "boat to dinner" lifestyle at The Boardwalk. When you could be cruising the lake or listening to live music by the water, you should not be indoors fighting with drywall anchors. EYS frees you up to live the #TowneLakeLife.

## How the Process Works

Send details and photos online. EYS scopes the work with a precise estimate, schedules a convenient visit, executes with total respect for your property, and ensures complete satisfaction.`,
  },
  {
    title: 'Cross Creek Ranch',
    slug: 'cross-creek-ranch-handyman',
    citySlug: 'fulshear',
    promoCode: 'CCR25',
    seoTitle: 'Premium Handyman in Cross Creek Ranch | Elevate Your Space',
    metaDescription:
      'Elevate Your Space provides premium carpentry, garage storage, and home upgrades for Cross Creek Ranch in Fulshear, TX. Request an estimate!',
    heroTitle: 'Premium Handyman & Home Upgrades for Cross Creek Ranch',
    summary:
      'Elevate Your Space delivers precise, premium home improvements designed to enhance your beautiful Cross Creek Ranch home in Fulshear.',
    localIntro:
      'Cross Creek Ranch is celebrated for its deep integration with nature — the restored Flewellen Creek, expansive native landscaping, and over 60 miles of winding trails. Homes here range from large family estates to peaceful retreats in the 55+ Bonterra neighborhood. Whether you need to organize your garage for hiking and biking gear or add custom woodwork to elevate your living room, EYS provides meticulous craftsmanship that respects the quality of your home.',
    faqs: [
      {
        question: 'Do you provide services in the Bonterra 55+ section?',
        answer:
          'Yes, we frequently work in Bonterra, providing respectful, quiet, and highly detailed service for active adults seeking a maintenance-free lifestyle.',
      },
      {
        question: 'Can you install storage racks strong enough for kayaks?',
        answer:
          'Absolutely. Our overhead garage racks are anchored directly into ceiling joists and are perfect for storing heavy kayaks used on community lakes.',
      },
      {
        question: 'Do you install ceiling fans on high outdoor patios?',
        answer:
          'Yes, we safely install outdoor-rated fans to keep your covered patio cool during intense Texas summers.',
      },
      {
        question: 'What if I need a new electrical outlet for a wall-mounted TV?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'Can you build a custom drop-zone for my entryway?',
        answer:
          'Yes, custom carpentry is our specialty — perfect for organizing gear, shoes, and backpacks after a long hike on the trails.',
      },
    ],
    body: `## Handyman Services for Cross Creek Ranch Homes

We bridge the gap between massive general contractors and basic repairmen, focusing entirely on premium installations and aesthetic upgrades.

### Common Projects We Help With

- **TV Mounting** — secure, perfectly leveled mounting in living rooms and covered patios
- **Curtain Installation** — elegant installation of heavy window treatments
- **Wall-Mounted Shelving** — custom shelving for art and family photos
- **Cabinet Hardware** — modern, high-end pulls for kitchens and bathrooms
- **Trim Work & Carpentry** — crown molding, wainscoting, and mudroom benches
- **Media Walls** — shiplap or wood-slat focal points for entertainment spaces
- **Painting** — clean, precise accent wall painting
- **Light Fixture & Ceiling Fan Installation** — modern fixtures and energy-efficient fans
- **Garage Storage** — heavy-duty overhead racks for kayaks, bikes, and outdoor equipment
- **Furniture Assembly** — interior and patio furniture
- **Move-In Upgrades** — punch-list completion for newly constructed homes
- **Outdoor/Patio Improvements** — patio upgrades for beautiful Fulshear evenings

## Why Cross Creek Ranch Homeowners Trust EYS

Our core values are extreme organization, clean execution, and profound respect for your home. We use dust-extraction tools, wear shoe covers at all times, and communicate clearly from estimate to final walk-through.

## Good Fit Projects

We are highly sought after for the "Active Family Garage Upgrade" — ceiling racks to clear floor space for cars while safely storing bikes and gear for the Flewellen Creek trails.

## Local Lifestyle Angle

Life in Cross Creek Ranch means swimming at Adventure Island, disc golf, or a casual bite at the Italian Maid Café. Let EYS handle the heavy lifting so you can enjoy the trails, lakes, and nature that make this Fulshear community special.

## How the Process Works

Submit details and photos through our online form. EYS scopes the work with a clear estimate, books a convenient time, executes perfectly, and leaves your home spotless.`,
  },
  {
    title: 'Jordan Ranch',
    slug: 'jordan-ranch-handyman',
    citySlug: 'fulshear',
    promoCode: 'JORDAN25',
    seoTitle: 'Handyman & New Home Upgrades in Jordan Ranch | EYS',
    metaDescription:
      'Moving to Jordan Ranch? Elevate Your Space provides premium TV mounting, ceiling fan installation, and move-in upgrades in Fulshear, TX. Request an estimate!',
    heroTitle: 'Premium Handyman & Move-In Upgrades for Jordan Ranch',
    summary:
      'Elevate Your Space provides the premium finishing touches, custom installations, and aesthetic upgrades needed to make your new Jordan Ranch house a home.',
    localIntro:
      'Jordan Ranch beautifully combines a rich historic heritage with modern, resort-style living, featuring the working Sunset Farm and the famous lazy river at The Shed. Because this is a rapidly growing Johnson Development community, most residents are moving into brand-new construction. While builders provide a beautiful foundation, your home needs vital customization — mounting flat screens, installing ceiling fans, and setting up garage storage for gardening tools.',
    faqs: [
      {
        question: 'Can you install cabinet hardware on my new kitchen cabinets without splintering the wood?',
        answer:
          'Absolutely. We use specialized drilling jigs to ensure flawless, perfectly aligned holes every time, protecting your new veneer.',
      },
      {
        question: 'Do you install ceiling fans where the builder only left a pre-wired cap?',
        answer: 'Yes, we frequently and safely install fans on builder pre-wires in new Jordan Ranch homes.',
      },
      {
        question: 'What if I want to change a hardwired chandelier?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'Can you install garage racks to hold my gardening supplies for Sunset Farm?',
        answer:
          'Yes! Our heavy-duty ceiling racks are perfect for getting tools, soil, and agricultural gear off the floor.',
      },
      {
        question: 'How soon before closing should I book your services?',
        answer:
          'We highly recommend contacting us two to three weeks before your closing date to ensure we can arrive shortly after you receive your keys.',
      },
    ],
    body: `## Handyman Services for Jordan Ranch Homes

We focus strictly on precision installations and premium enhancements for new properties, treating your fresh drywall and unblemished floors with the utmost respect.

### Common Projects We Help With

- **TV Mounting** — perfectly centered mounting on new drywall or masonry fireplaces
- **Curtain Installation** — level rods and heavy drapes for newly constructed rooms
- **Wall-Mounted Shelving** — floating shelves for instant character on blank walls
- **Cabinet Hardware** — premium hardware on builder-grade kitchen cabinets
- **Trim Work & Carpentry** — drop-zones, wainscoting, or shiplap
- **Media Walls** — custom slatted wood walls for a sophisticated focal point
- **Painting** — rich accent colors to replace standard builder paint
- **Light Fixture & Ceiling Fan Installation** — fans in pre-wired bedrooms and living spaces
- **Garage Storage** — overhead racks for gardening tools, boxes, and seasonal decor
- **Furniture Assembly** — beds, dining tables, and outdoor patio sets
- **Move-In Upgrades** — entire post-closing to-do list in one visit
- **Outdoor/Patio Improvements** — covered patio upgrades for Fulshear entertaining

## Why Jordan Ranch Homeowners Call EYS

Moving into a new home is exhausting. EYS relieves the stress by arriving on time, working efficiently, wearing shoe covers, and using precision tools like custom jigs for hardware.

## Good Fit Projects

We excel at whole-home move-in packages: assemble furniture, mount TVs, install ceiling fans, and put up overhead garage storage so you can park your cars right away.

## Local Lifestyle Angle

Life in Jordan Ranch is about community connection — fresh produce at Sunset Farm, the lazy river at The Shed, or events planned by the Director of Fun. EYS handles the setup tasks so you can enjoy Fulshear's most vibrant neighborhood.

## How the Process Works

Tell us what your new home needs via our online photo form. EYS scopes the project with a transparent estimate, coordinates with your move-in schedule, executes flawlessly, and cleans up entirely.`,
  },
  {
    title: 'Aliana',
    slug: 'aliana-handyman',
    citySlug: 'richmond',
    promoCode: 'ALIANA25',
    seoTitle: 'Expert Handyman Services in Aliana, Richmond | EYS',
    metaDescription:
      'Elevate Your Space provides premium handyman services, TV mounting, and home upgrades for Aliana residents in Richmond, TX. Request an estimate!',
    heroTitle: 'Premium Handyman Services for Aliana Homeowners',
    summary:
      'Elevate Your Space provides professional, meticulously clean, and highly reliable home improvements for the beautiful homes of Aliana in Richmond.',
    localIntro:
      'Aliana is celebrated for its resort-style amenities, from The Club at Aliana to scenic trail systems woven throughout the 77407 zip code. With homes primarily built over the last decade by top builders, properties here are modern but often ready for personalized upgrades or routine upkeep. Whether you need heavy patio furniture assembled, TVs mounted in the game room, or your garage organized, EYS delivers the professionalism your home deserves.',
    faqs: [
      {
        question: 'Do you service the 55+ community, The Lagos at Aliana?',
        answer:
          'Yes, we frequently work in The Lagos, providing quiet, respectful, and highly detailed service for active adults wanting a maintenance-free lifestyle.',
      },
      {
        question: 'Can you assemble large patio furniture sets for outdoor entertaining?',
        answer:
          'Absolutely. We assemble heavy, complex furniture quickly and ensure it is structurally sound and safe.',
      },
      {
        question: 'Will you help me hide the wires when mounting my TV?',
        answer:
          'We provide clean wire concealment options. We can help coordinate licensed trade support if new in-wall electrical outlets are required.',
      },
      {
        question: 'Can you install ceiling fans on high ceilings?',
        answer:
          'Yes, we have the proper equipment to safely install fixtures and fans in rooms with elevated ceilings common in Aliana homes.',
      },
      {
        question: 'Do your garage storage racks hold heavy items?',
        answer:
          'Yes, our overhead racks are anchored deeply into ceiling joists and are rated to hold hundreds of pounds of storage safely.',
      },
    ],
    body: `## Handyman Services for Aliana Homes

We specialize in aesthetic and functional projects that bridge the gap between basic repairs and major renovations.

### Common Projects We Help With

- **TV Mounting** — perfectly leveled mounting for living rooms and game rooms
- **Curtain Installation** — heavy drapes and robust curtain rods
- **Wall-Mounted Shelving** — functional floating shelves for kitchens and offices
- **Cabinet Hardware** — modern premium hardware for kitchens and bathrooms
- **Trim Work & Carpentry** — wainscoting, baseboards, and architectural details
- **Media Walls** — shiplap or wood-slat feature walls for entertainment areas
- **Painting** — flawless touch-ups and crisp accent walls
- **Light Fixture & Ceiling Fan Installation** — statement lighting replacing builder-grade fixtures
- **Garage Storage** — heavy-duty ceiling racks to deeply organize your garage
- **Furniture Assembly** — complex indoor or outdoor patio furniture
- **Punch-List Work** — bundled list of lingering maintenance tasks
- **Outdoor/Patio Improvements** — covered spaces for Richmond's warm evenings

## Why Aliana Residents Trust EYS

EYS stands out by offering transparent scoping, arriving exactly on time, and showing profound respect for your home with shoe covers, floor protection, and thorough cleanup.

## Good Fit Projects

Our "Garage Organization Package" is incredibly popular in Aliana — heavy-duty overhead racks for seasonal items and bikes, giving you back the floor space to park out of the Texas heat.

## Local Lifestyle Angle

Life in Aliana is designed for connection and recreation — The Westmoor Club, tennis courts, and greenbelt walks. Let EYS handle the home improvements so you can enjoy everything this vibrant Richmond community offers.

## How the Process Works

Share your project details via our online photo form. EYS scopes the work with a clear estimate, coordinates a convenient time, completes the job flawlessly, and cleans up completely.`,
  },
  {
    title: 'Harvest Green',
    slug: 'harvest-green-handyman',
    citySlug: 'richmond',
    promoCode: 'HARVEST25',
    seoTitle: 'Handyman & Carpentry in Harvest Green | Elevate Your Space',
    metaDescription:
      'Elevate Your Space offers premium handyman services, custom carpentry, and garage storage for Harvest Green in Richmond, TX. Request an estimate!',
    heroTitle: 'Premium Handyman & Home Upgrades for Harvest Green',
    summary:
      'Elevate Your Space provides the premium carpentry, meticulous installations, and upgrades needed to deeply enhance your Harvest Green home in Richmond.',
    localIntro:
      'Harvest Green offers a unique lifestyle centered around sustainable living, the 12-acre Village Farm, and the stunning Farmhouse amenity center. Homes here often reflect a beautiful modern farmhouse or contemporary aesthetic. Whether you want authentic shiplap in your living room, a custom mudroom for gardening gear, or a deeply organized garage, EYS provides the meticulous craftsmanship your home deserves.',
    faqs: [
      {
        question: 'Can you build a custom mudroom to store my gear from the Village Farm?',
        answer:
          'Yes! Custom carpentry is a specialty of ours, and a drop-zone is perfect for keeping muddy shoes and garden tools organized.',
      },
      {
        question: 'Do you install garage storage strong enough for heavy landscaping equipment?',
        answer:
          'Absolutely. Our overhead racks are anchored securely into ceiling joists to hold heavy items safely.',
      },
      {
        question: 'Can you install shiplap or board-and-batten walls?',
        answer:
          'Yes, we excel at modern farmhouse trim work and can create stunning accent walls that fit the neighborhood aesthetic.',
      },
      {
        question: 'What if my new light fixture requires complex wiring?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'Do you mount TVs on outdoor patios?',
        answer: 'Yes, we provide secure mounting for outdoor-rated TVs so you can entertain on your patio.',
      },
    ],
    body: `## Handyman Services for Harvest Green Homes

We specialize in high-quality visual and functional upgrades that align perfectly with the character of your neighborhood.

### Common Projects We Help With

- **TV Mounting** — secure, perfectly level mounting on drywall or custom fireplaces
- **Curtain Installation** — heavy drapes and level rods for a finished look
- **Wall-Mounted Shelving** — rustic wood floating shelves matching the farmhouse aesthetic
- **Cabinet Hardware** — premium pulls and knobs with total precision
- **Trim Work & Carpentry** — shiplap walls, board-and-batten, and mudroom drop-zones
- **Media Walls** — custom architectural feature walls for main living spaces
- **Painting** — crisp accent wall painting
- **Light Fixture & Ceiling Fan Installation** — modern farmhouse lighting
- **Garage Storage** — heavy-duty ceiling racks for gardening tools and outdoor gear
- **Furniture Assembly** — indoor furniture and outdoor patio sets
- **Punch-List Work** — accumulated minor repairs and updates
- **Outdoor/Patio Improvements** — covered patio upgrades after a day at the Farm Club

## Why Harvest Green Residents Choose EYS

We share your community's appreciation for quality and care. EYS operates with total transparency, clear estimates, punctual arrival, dust-extraction during carpentry, and spotless cleanup.

## Good Fit Projects

We are the perfect partner for the "Modern Farmhouse Upgrade" — shiplap accent wall, mudroom bench by the garage entry, and mounted TVs for a clean, finished look.

## Local Lifestyle Angle

Life in Harvest Green is about the Village Farm, the Farmers Market, and relaxing by the pools at The Farmhouse. Let EYS handle home improvement with precision so you can spend your weekends enjoying Houston's premier agri-hood.

## How the Process Works

Detail your project needs through our online photo form. EYS scopes the work with a transparent estimate, coordinates a convenient time, completes the work flawlessly, and cleans up thoroughly.`,
  },
  {
    title: 'Veranda',
    slug: 'veranda-handyman',
    citySlug: 'richmond',
    promoCode: 'VERANDA25',
    seoTitle: 'Handyman & Home Upgrades in Veranda | Elevate Your Space',
    metaDescription:
      'Elevate Your Space offers premium handyman services, patio upgrades, and custom carpentry for Veranda residents in Richmond, TX. Request an estimate!',
    heroTitle: 'Premium Handyman & Home Upgrades for Veranda',
    summary:
      'Elevate Your Space provides the meticulous, high-quality home improvements needed to enhance your beautiful Veranda home in Richmond.',
    localIntro:
      'Veranda is beautifully designed around connection, historical Southern charm, and the iconic front porch lifestyle. With a vibrant social scene centered around The Cottage House, residents take immense pride in their homes. Whether you want outdoor ceiling fans on your porch, a custom mudroom for the kids, or a TV for family movie nights, EYS provides the premium, detail-oriented service your property deserves.',
    faqs: [
      {
        question: 'Can you install ceiling fans on my front porch?',
        answer:
          'Yes, installing outdoor-rated fans is one of our most requested services to help you comfortably enjoy Veranda\'s porch lifestyle.',
      },
      {
        question: 'Do you build custom built-ins or mudrooms?',
        answer:
          'Absolutely. We provide premium carpentry services that look original to your home\'s design.',
      },
      {
        question: 'What if my patio TV installation requires a new electrical outlet?',
        answer: 'We can help coordinate appropriate licensed trade support when the project requires it.',
      },
      {
        question: 'Do you assemble large outdoor patio furniture sets?',
        answer:
          'Yes, we provide fast, structurally sound assembly for all types of indoor and outdoor furniture.',
      },
      {
        question: 'How do you keep my home clean during messy carpentry work?',
        answer:
          'We use dust-extraction tools, zip-wall barriers if needed, and perform a meticulous cleanup daily.',
      },
    ],
    body: `## Handyman Services for Veranda Homes

We focus exclusively on aesthetic and functional enhancements that match the welcoming, high-quality vibe of Veranda.

### Common Projects We Help With

- **TV Mounting** — clean, level mounting for living rooms and covered patios
- **Curtain Installation** — proper anchoring for drapes to enhance your interior
- **Wall-Mounted Shelving** — floating shelves for character and display space
- **Cabinet Hardware** — premium pulls and knobs for kitchens and bathrooms
- **Trim Work & Carpentry** — wainscoting, crown molding, and custom drop-zones
- **Media Walls** — architectural feature walls for a stunning focal point
- **Painting** — crisp accent walls and flawless touch-ups
- **Light Fixture & Ceiling Fan Installation** — statement lighting and essential porch fans
- **Garage Storage** — overhead racks for outdoor gear and seasonal decorations
- **Furniture Assembly** — patio rocking chairs and indoor furniture
- **Punch-List Work** — lingering home to-dos completed efficiently
- **Outdoor/Patio Improvements** — front porch and back patio upgrades for entertaining

## Why Veranda Residents Trust EYS

Veranda is a tight-knit community where a contractor's reputation is everything. EYS arrives on time, uses drop cloths and shoe covers, communicates clearly, and leaves your home cleaner than we found it.

## Good Fit Projects

We excel at the "Outdoor Living Upgrade" — outdoor-rated ceiling fans on your porch, patio furniture assembly, and a mounted TV for relaxing outside on a warm Richmond evening.

## Local Lifestyle Angle

Living in Veranda means events on the event lawn, relaxing at The Cottage House, or photos at the giant rocking chair. Let EYS handle the drill and tape measure so you can pour a glass of iced tea and enjoy your front porch.

## How the Process Works

Provide project details via our online photo form. EYS scopes the work with a clear estimate, coordinates a convenient time, completes the job flawlessly, and cleans up thoroughly.`,
  },
];

function yamlString(value) {
  if (value.includes('\n') || value.includes(':') || value.includes('"')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `"${value}"`;
}

function faqsToYaml(faqs) {
  return faqs
    .map(
      (faq) => `  - question: ${yamlString(faq.question)}
    answer: ${yamlString(faq.answer)}`,
    )
    .join('\n');
}

function parseBody(body) {
  const servicesIntroMatch = body.match(/^## [^\n]+\n\n([\s\S]*?)\n\n### Common Projects/m);
  const projectsBlockMatch = body.match(/### Common Projects[^\n]*\n\n([\s\S]*?)\n\n## /);
  const whyMatch = body.match(/## Why[^\n]*\n\n([\s\S]*?)\n\n## Good Fit/m);
  const goodFitMatch = body.match(/## Good Fit[^\n]*\n\n([\s\S]*?)\n\n## Local Lifestyle/m);
  const lifestyleMatch = body.match(/## Local Lifestyle[^\n]*\n\n([\s\S]*?)\n\n## How the Process/m);
  const processMatch = body.match(/## How the Process[^\n]*\n\n([\s\S]*?)$/);

  const commonProjects = [];
  if (projectsBlockMatch) {
    for (const line of projectsBlockMatch[1].trim().split('\n')) {
      const match = line.match(/^- \*\*([^*]+)\*\* — (.+)$/);
      if (match) {
        commonProjects.push({ name: match[1], description: match[2] });
      }
    }
  }

  return {
    servicesIntro: servicesIntroMatch?.[1]?.trim() ?? '',
    commonProjects,
    whyChoose: whyMatch?.[1]?.trim() ?? '',
    goodFit: goodFitMatch?.[1]?.trim() ?? '',
    localLifestyle: lifestyleMatch?.[1]?.trim() ?? '',
    process: processMatch?.[1]?.trim() ?? '',
  };
}

function commonProjectsToYaml(projects) {
  return projects
    .map(
      (project) => `  - name: ${yamlString(project.name)}
    description: ${yamlString(project.description)}`,
    )
    .join('\n');
}

for (const c of communities) {
  const parsed = parseBody(c.body);
  const content = `---
title: ${yamlString(c.title)}
slug: ${yamlString(c.slug)}
citySlug: ${yamlString(c.citySlug)}
published: true
seoTitle: ${yamlString(c.seoTitle)}
metaDescription: ${yamlString(c.metaDescription)}
heroTitle: ${yamlString(c.heroTitle)}
summary: ${yamlString(c.summary)}
promoCode: ${yamlString(c.promoCode)}
promoOffer: ${yamlString(promoOffer)}
localIntro: ${yamlString(c.localIntro)}
servicesIntro: ${yamlString(parsed.servicesIntro)}
commonProjects:
${commonProjectsToYaml(parsed.commonProjects)}
whyChoose: ${yamlString(parsed.whyChoose)}
goodFit: ${yamlString(parsed.goodFit)}
localLifestyle: ${yamlString(parsed.localLifestyle)}
process: ${yamlString(parsed.process)}
faqs:
${faqsToYaml(c.faqs)}
---
`;

  writeFileSync(join(outDir, `${c.slug}.md`), content, 'utf8');
  console.log(`Wrote ${c.slug}.md`);
}

console.log(`Generated ${communities.length} community pages.`);
