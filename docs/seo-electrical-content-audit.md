# Electrical Content Forensics

Generated: 2026-07-21T16:45:57.612498+00:00  
Scope: case-insensitive scan of built HTML for the specified electrical term list.  
**Objective:** map relevance and identity risk — not to strip legitimate electrical offerings.

## Summary counts

| Metric | Value |
|--------|------:|
| Total term hits (deduped by path/term/element/snippet) | 648 |
| Unique pages with at least 1 hit | 76 |
| Hits recommended investigate/clarify | 115 |
| Hits recommended clarify | 144 |
| Hits recommended remain unchanged | 389 |

### Hits by term

| Term | Hits |
|------|-----:|
| ceiling fan | 247 |
| electrical services | 147 |
| chandelier | 54 |
| electrician | 42 |
| light fixture | 39 |
| electricians | 37 |
| outlet | 29 |
| switch | 22 |
| wiring | 16 |
| licensed electrician | 14 |
| breaker | 1 |

### Pages with most electrical hits

| Path | Hits |
|------|-----:|
| `/services/electrical-services/` | 71 |
| `/electricians-katy/` | 56 |
| `/electricians-richmond/` | 53 |
| `/services/ceiling-fan-installation/` | 27 |
| `/our-work/vaulted-crystal-chandelier/` | 26 |
| `/service-areas/katy/sunterra-handyman/` | 18 |
| `/service-areas/fulshear/jordan-ranch-handyman/` | 18 |
| `/service-areas/richmond/veranda-handyman/` | 16 |
| `/service-areas/katy/cane-island-handyman/` | 16 |
| `/sitemap/` | 16 |
| `/service-areas/katy/tamarron-handyman/` | 15 |
| `/service-areas/cypress/bridgeland-handyman/` | 14 |
| `/service-areas/richmond/aliana-handyman/` | 14 |
| `/service-areas/richmond/harvest-green-handyman/` | 14 |
| `/service-areas/fulshear/cross-creek-ranch-handyman/` | 14 |

## Highest-risk identity signals (FACT)

These use the broad identity noun **Electricians** in URL/title/H1 while the brand suffix remains Handyman:

| URL | Title | H1 |
|-----|-------|----|
| `/electricians-katy/` | Electricians in Katy, TX / Elevate Your Space Handyman | Electricians in Katy, TX |
| `/electricians-richmond/` | Electricians in Richmond, TX / Elevate Your Space Handyman | Electricians in Richmond, TX |

Source: `src/content/city-services/electricians-katy.md` / `electricians-richmond.md` via `src/pages/[legacySlug].astro`.

### Clarifying body language (same Katy page — FACT)

From `electricians-katy.md`:
> We handle light electrical work throughout Katy and coordinate licensed electricians when required.

From `electrical-services.md` FAQ:
> Are you licensed electricians? → We handle light electrical tasks and partner with licensed electricians when the project requires it.

**Tension:** Title/H1/slug assert Electricians; body asserts handyman-scope + coordination. This is the core forensic finding for electrician-query relevance.

## Occurrence ledger (top priority rows)

| Path | Source | Term | Element | Surrounding | Broad/task | Implies electrician? | Subcontract OK? | Query relevance | Recommendation |
|------|--------|------|---------|-------------|------------|----------------------|-----------------|-----------------|----------------|
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrician | title | Electricians in Katy, TX / Elevate Your Space Handyman | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrician | heading-h1 | Electricians in Katy, TX | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrician | url | /electricians-katy/ | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electricians | title | Electricians in Katy, TX / Elevate Your Space Handyman | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electricians | heading-h1 | Electricians in Katy, TX | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electricians | url | /electricians-katy/ | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrician | title | Electricians in Richmond, TX / Elevate Your Space Handyman | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrician | heading-h1 | Electricians in Richmond, TX | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrician | url | /electricians-richmond/ | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electricians | title | Electricians in Richmond, TX / Elevate Your Space Handyman | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electricians | heading-h1 | Electricians in Richmond, TX | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electricians | url | /electricians-richmond/ | broad-identity | yes-risk | no | high | investigate/clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | electrical services | title | Electrical Services in Katy & West Houston / Elevate Your Space | broad-identity | ambiguous | partial/unclear | high | investigate/clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | electrical services | heading-h1 | Electrical Services in Katy & West Houston | broad-identity | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | outlet | meta | Light electrical work in Katy, TX — ceiling fans, fixtures, outlets, and switches for established suburban homes and master-planned communit | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | switch | meta | Light electrical work in Katy, TX — ceiling fans, fixtures, outlets, and switches for established suburban homes and master-planned communit | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | ceiling fan | meta | Light electrical work in Katy, TX — ceiling fans, fixtures, outlets, and switches for established suburban homes and master-pla | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/our-work/vaulted-crystal-chandelier/` | `src/content/projects/vaulted-crystal-chandelier.md + src/pages/our-work/[slug].astro` | chandelier | title | Vaulted Ceiling Crystal Chandelier / EYS Handyman | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/our-work/vaulted-crystal-chandelier/` | `src/content/projects/vaulted-crystal-chandelier.md + src/pages/our-work/[slug].astro` | chandelier | heading-h1 | Vaulted Ceiling Crystal Chandelier | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | outlet | meta | Light electrical work in Richmond, TX — fixtures, fans, outlets, and switches for Pecan Grove, Aliana, Harvest Green, and Fort Bend homes. | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | switch | meta | Light electrical work in Richmond, TX — fixtures, fans, outlets, and switches for Pecan Grove, Aliana, Harvest Green, and Fort Bend homes. | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/services/ceiling-fan-installation/` | `src/content/services/ceiling-fan-installation.md + src/pages/services/[slug].astro` | ceiling fan | title | Ceiling Fan Installation / Katy & West Houston / EYS | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/services/ceiling-fan-installation/` | `src/content/services/ceiling-fan-installation.md + src/pages/services/[slug].astro` | ceiling fan | heading-h1 | Ceiling Fan Installation in Katy & West Houston | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/our-work/vaulted-crystal-chandelier/` | `src/content/projects/vaulted-crystal-chandelier.md + src/pages/our-work/[slug].astro` | chandelier | url | /our-work/vaulted-crystal-chandelier/ | task-specific | ambiguous | partial/unclear | high | remain unchanged |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrician | alt | / Electricians in Katy, TX / | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrician | schema | [{"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "name": "Electricians in Katy, TX", "url": "https://www.eyshandyman.com/ | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrician | body | Home / Service Areas / Katy, TX / Electricians in Katy, TX Katy, TX Electricians in Katy, TX Fixture installation, ceiling fa | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electricians | alt | / Electricians in Katy, TX / | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electricians | schema | [{"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "name": "Electricians in Katy, TX", "url": "https://www.eyshandyman.com/ | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electricians | body | Home / Service Areas / Katy, TX / Electricians in Katy, TX Katy, TX Electricians in Katy, TX Fixture installation, ceiling fan | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrician | alt | / Electricians in Richmond, TX / | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrician | schema | [{"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "name": "Electricians in Richmond, TX", "url": "https://www.eyshandyman. | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrician | body | Home / Service Areas / Richmond, TX / Electricians in Richmond, TX Richmond, TX Electricians in Richmond, TX Fixture swaps, ceili | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electricians | alt | / Electricians in Richmond, TX / | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electricians | schema | [{"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "name": "Electricians in Richmond, TX", "url": "https://www.eyshandyman. | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electricians | body | Home / Service Areas / Richmond, TX / Electricians in Richmond, TX Richmond, TX Electricians in Richmond, TX Fixture swaps, ceilin | broad-identity | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | outlet | body | Katy, TX Katy, TX Electricians in Katy, TX Fixture installation, ceiling fans, outlets, and dimmers for Katy homeowners in Cinco Ranch, Sunt | task-specific | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | switch | body | ure and ceiling fan installation Outlet and switch replacement Dimmer and smart switch setup Fixture swaps on existing boxes Licensed electr | task-specific | yes-risk | no | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | ceiling fan | body | lectricians in Katy, TX Katy, TX Electricians in Katy, TX Fixture installation, ceiling fans, outlets, and dimmers for Katy homeowners in Ci | task-specific | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | outlet | body | mond, TX Richmond, TX Electricians in Richmond, TX Fixture swaps, ceiling fans, outlets, and dimmers for Richmond homes — from historic Peca | task-specific | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | switch | body | ure and ceiling fan installation Outlet and switch replacement Dimmer and smart switch setup Fixture swaps on existing boxes Licensed electr | task-specific | yes-risk | no | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | ceiling fan | body | icians in Richmond, TX Richmond, TX Electricians in Richmond, TX Fixture swaps, ceiling fans, outlets, and dimmers for Richmond homes — from | task-specific | yes-risk | no | high | investigate/clarify |
| `/services/repairs-and-maintenance/` | `src/pages/services/repairs-and-maintenance/index.astro` | electrical services | meta | General handyman repairs, drywall repair, interior painting, and electrical services in Katy and West Houston. | broad-identity | ambiguous | partial/unclear | medium | clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | licensed electrician | body | the first time. We handle light electrical work throughout Katy and coordinate licensed electricians when required. Many Katy homes have bui | broad-identity | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | electrical services | body | oors and finishes the way Katy’s more established homes deserve. Regional page: electrical services . Also see ceiling fan installation . Wh | broad-identity | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | licensed electrician | body | nstruction. We handle light electrical tasks throughout Richmond and coordinate licensed electricians when code requires it. Richmond spans  | broad-identity | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | electrical services | body | complex wiring, we help coordinate appropriate licensed trade support. Related: electrical services and ceiling fan installation . Communiti | broad-identity | clarified-subcontract | yes | high | investigate/clarify |
| `/service-areas/katy/sunterra-handyman/` | `src/content/communities/sunterra-handyman.md + src/pages/service-areas/[city]/[community].astro` | ceiling fan | meta | Moving into Sunterra? Elevate Your Space offers premium TV mounting, ceiling fan installation, and move-in upgrades for Katy | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/service-areas/katy/tamarron-handyman/` | `src/content/communities/tamarron-handyman.md + src/pages/service-areas/[city]/[community].astro` | ceiling fan | meta | TV mounting, ceiling fans, and move-in upgrades for Tamarron residents in Katy and Fulshear. Request an | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/service-areas/fulshear/` | `src/content/service-areas/fulshear.md + src/pages/service-areas/[city]/index.astro` | ceiling fan | meta | ndyman for new construction and move-in upgrades — TV mounting, garage storage, ceiling fans, and finishing in Cross Creek Ranch. | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/service-areas/fulshear/jordan-ranch-handyman/` | `src/content/communities/jordan-ranch-handyman.md + src/pages/service-areas/[city]/[community].astro` | ceiling fan | meta | Moving to Jordan Ranch? Elevate Your Space provides premium TV mounting, ceiling fan installation, and move-in upgrades in Fulshear, TX. Req | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/our-work/vaulted-crystal-chandelier/` | `src/content/projects/vaulted-crystal-chandelier.md + src/pages/our-work/[slug].astro` | chandelier | meta | Statement crystal chandelier installed and leveled on a vaulted living-room ceiling in Katy and West Houston | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | outlet | meta | Light electrical work in Katy and West Houston. Fixture swaps, outlets, switches, ceiling fans, and licensed coordination when required. | task-specific | clarified-subcontract | yes | medium | remain unchanged |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | switch | meta | Light electrical work in Katy and West Houston. Fixture swaps, outlets, switches, ceiling fans, and licensed coordination when required. | task-specific | clarified-subcontract | yes | medium | remain unchanged |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | ceiling fan | meta | ght electrical work in Katy and West Houston. Fixture swaps, outlets, switches, ceiling fans, and licensed coordination when required. | task-specific | clarified-subcontract | yes | medium | remain unchanged |
| `/services/ceiling-fan-installation/` | `src/content/services/ceiling-fan-installation.md + src/pages/services/[slug].astro` | ceiling fan | meta | Ceiling fan installation in Katy and West Houston. Pre-wired rooms, patio fans, and fixture | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/services/installation-and-assembly/` | `src/pages/services/installation-and-assembly/index.astro` | ceiling fan | meta | Door installation, furniture assembly, TV mounting, ceiling fans, curtains, and cabinet installation in Katy and West Houston. | task-specific | ambiguous | partial/unclear | medium | remain unchanged |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | wiring | body | dinate licensed electrical support when a project needs new circuits or complex wiring. Send photos of the fixture location and the existing | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | outlet | schema | description": "Light electrical work in Katy, TX \u2014 ceiling fans, fixtures, outlets, and switches for established suburban homes and mas | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | switch | schema | "Light electrical work in Katy, TX \u2014 ceiling fans, fixtures, outlets, and switches for established suburban homes and master-planned co | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | ceiling fan | schema | m/electricians-katy/", "description": "Light electrical work in Katy, TX \u2014 ceiling fans, fixtures, outlets, and switches for establishe | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | ceiling fan | link | pair & Installation / Furniture Assembly / TV Mounting / Cabinet Installation / Ceiling Fan Installation / Curtain Installation / Remodeling | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-katy/` | `src/content/city-services/electricians-katy.md + src/pages/[legacySlug].astro` | light fixture | body | rical services . Also see ceiling fan installation . What we handle in Katy, TX Light fixture and ceiling fan installation Outlet and switch | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | wiring | body | rvice details Richmond homeowners need electrical help that respects both older wiring in established subdivisions and clean finishes in new | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | outlet | schema | ", "description": "Light electrical work in Richmond, TX \u2014 fixtures, fans, outlets, and switches for Pecan Grove, Aliana, Harvest Green | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | switch | schema | on": "Light electrical work in Richmond, TX \u2014 fixtures, fans, outlets, and switches for Pecan Grove, Aliana, Harvest Green, and Fort Be | task-specific | clarified-subcontract | yes | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | ceiling fan | schema | tedAnswer": {"@type": "Answer", "text": "Yes. We regularly install fixtures and ceiling fans in established Pecan Grove homes and new constr | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | ceiling fan | link | pair & Installation / Furniture Assembly / TV Mounting / Cabinet Installation / Ceiling Fan Installation / Curtain Installation / Remodeling | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | light fixture | schema | st Green, and Veranda."}}, {"@type": "Question", "name": "Can you replace dated light fixtures in older Richmond homes?", "acceptedAnswer":  | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/electricians-richmond/` | `src/content/city-services/electricians-richmond.md + src/pages/[legacySlug].astro` | light fixture | body | n installation . Communities: Veranda , Aliana . What we handle in Richmond, TX Light fixture and ceiling fan installation Outlet and switch | task-specific | ambiguous | partial/unclear | high | investigate/clarify |
| `/sitemap/` | `src/pages/sitemap.astro` | electrician | link | in Richmond, TX / Drywall Repair in Katy, TX / Drywall Repair in Richmond, TX / Electricians in Katy, TX / Electricians in Richmond, TX / Fl | broad-identity | yes-risk | no | low-moderate | clarify |
| `/sitemap/` | `src/pages/sitemap.astro` | electrician | body | ation in Richmond, TX Drywall Repair in Katy, TX Drywall Repair in Richmond, TX Electricians in Katy, TX Electricians in Richmond, TX Floori | broad-identity | yes-risk | no | low-moderate | clarify |
| `/sitemap/` | `src/pages/sitemap.astro` | electricians | link | in Richmond, TX / Drywall Repair in Katy, TX / Drywall Repair in Richmond, TX / Electricians in Katy, TX / Electricians in Richmond, TX / Fl | broad-identity | yes-risk | no | low-moderate | clarify |
| `/sitemap/` | `src/pages/sitemap.astro` | electricians | body | ation in Richmond, TX Drywall Repair in Katy, TX Drywall Repair in Richmond, TX Electricians in Katy, TX Electricians in Richmond, TX Floori | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | electrician | link | arron / Jordan Ranch / vaulted crystal chandelier / installation and assembly / electricians in Katy / Richmond / all services / service are | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | electrician | body | before we start. New circuits, service upgrades, and work requiring a licensed electrician are scoped honestly with coordination support — w | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | electricians | link | arron / Jordan Ranch / vaulted crystal chandelier / installation and assembly / electricians in Katy / Richmond / all services / service are | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | electricians | body | box help. Electrical work pairs with installation and assembly . City landings: electricians in Katy and Richmond . Prefer to browse first?  | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | licensed electrician | body | onditions before we start. New circuits, service upgrades, and work requiring a licensed electrician are scoped honestly with coordination s | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/ceiling-fan-installation/` | `src/content/services/ceiling-fan-installation.md + src/pages/services/[slug].astro` | electrician | body | lain what we can complete in one visit, and flag anything that needs a licensed electrician. Communities we serve This service is available  | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/ceiling-fan-installation/` | `src/content/services/ceiling-fan-installation.md + src/pages/services/[slug].astro` | licensed electrician | body | mate, explain what we can complete in one visit, and flag anything that needs a licensed electrician. Communities we serve This service is a | broad-identity | yes-risk | no | low-moderate | clarify |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | wiring | body | dinate licensed electricians when a project needs circuits, permits, or complex wiring. That honesty protects your home and keeps expectatio | task-specific | yes-risk | no | low-moderate | remain unchanged |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | switch | body | ure and ceiling fan installation Outlet and switch replacement Dimmer and smart switch setup Fixture swaps on existing boxes Licensed electr | task-specific | yes-risk | no | low-moderate | remain unchanged |
| `/services/electrical-services/` | `src/content/services/electrical-services.md + src/pages/services/[slug].astro` | chandelier | link | installation / Bridgeland / Veranda / Tamarron / Jordan Ranch / vaulted crystal chandelier / installation and assembly / electricians in Kat | task-specific | yes-risk | no | low-moderate | remain unchanged |
| `/` | `src/pages/index.astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/` | `src/pages/index.astro` | electrical services | body | yman To-Do List Visit General Handyman Repairs Drywall Repair Interior Painting Electrical Services View Repair Services Installation & Asse | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/kitchen-remodeling-richmond/` | `src/content/city-services/kitchen-remodeling-richmond.md + src/pages/[legacySlug].astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/house-painting-katy/` | `src/content/city-services/house-painting-katy.md + src/pages/[legacySlug].astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/contact/` | `src/pages/contact.astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/` | `src/pages/service-areas/index.astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/cypress/` | `src/content/service-areas/cypress.md + src/pages/service-areas/[city]/index.astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/cypress/` | `src/content/service-areas/cypress.md + src/pages/service-areas/[city]/index.astro` | electrical services | body | → Furniture Assembly → Drywall Repair → Painting → Door Repair & Installation → Electrical Services → Cabinet Installation → Bathroom Remode | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/cypress/bridgeland-handyman/` | `src/content/communities/bridgeland-handyman.md + src/pages/service-areas/[city]/[community].astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/cypress/bridgeland-handyman/` | `src/content/communities/bridgeland-handyman.md + src/pages/service-areas/[city]/[community].astro` | electrical services | body | Installation → Custom Carpentry → Door Repair & Installation → Drywall Repair → Electrical Services → Flooring & Décor → Furniture Assembly  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/cypress/towne-lake-handyman/` | `src/content/communities/towne-lake-handyman.md + src/pages/service-areas/[city]/[community].astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/cypress/towne-lake-handyman/` | `src/content/communities/towne-lake-handyman.md + src/pages/service-areas/[city]/[community].astro` | electrical services | body | Installation → Custom Carpentry → Door Repair & Installation → Drywall Repair → Electrical Services → Flooring & Décor → Furniture Assembly  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/richmond/` | `src/content/service-areas/richmond.md + src/pages/service-areas/[city]/index.astro` | electrical services | link | yman To-Do List Visit / General Handyman Services / Drywall Repair / Painting / Electrical Services / Installation & Assembly / Door Repair  | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |
| `/service-areas/richmond/` | `src/content/service-areas/richmond.md + src/pages/service-areas/[city]/index.astro` | electrical services | body | → Furniture Assembly → Drywall Repair → Painting → Door Repair & Installation → Electrical Services → Cabinet Installation → Bathroom Remode | broad-identity | ambiguous | partial/unclear | low-moderate | clarify |

### Full machine-readable dump

Intermediate file used for this report: `/tmp/eys-seo-electrical-hits.json` (648 rows). Not a site change.

## Terms with zero hits in built HTML

| Term | Result |
|------|--------|
| electrical contractor(s) | 0 in built pages |
| certified electrician | 0 |
| residential electrician | 0 |
| commercial electrician | 0 |
| electrical repair | 0 |
| rewiring | 0 |
| electrical panel | 0 |
| panel replacement | 0 |
| generator | 0 |
| EV charger | 0 |

`breaker` appears rarely (safety procedure context on electrical service page).

## Interpretation

1. Task-specific electrical content is legitimate and common (ceiling fans, fixtures, outlets) — keep.
2. Identity phrasing Electricians in City is the main contributor to electrician-query targeting on the current site.
3. Most body copy already describes subcontract/coordination correctly — do not blanket-remove.
4. Ceiling-fan volume is high because it is both a dedicated service and cross-linked — expected for a handyman business.

## Recommendations posture (no changes made)

| Action class | When |
|--------------|------|
| remain unchanged | Accurate task descriptions; clarified licensed coordination |
| clarify | Broad electrical services wording in non-electrical pages if it over-implies license |
| investigate/clarify | `/electricians-*` title/H1/slug vs body honesty; owner must decide positioning before edits |
| reduce | Only if owner confirms they do not want electrician-category demand |

## Facts vs hypotheses

- **Fact:** Current site contains strong electrician-intent landings.
- **Hypothesis:** These pages (plus GBP categories / historical WP) explain GSC electrician impressions more than the homepage.
