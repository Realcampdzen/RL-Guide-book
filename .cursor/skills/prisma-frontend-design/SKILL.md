---
name: prisma-frontend-design
description: Drives premium frontend design and implementation for an antique furniture factory website (Next.js + Tailwind). Use when the user asks for design direction, UI kit, typography, color palette, page sections (hero, catalog, product cards, process, gallery), landing pages, Tailwind styling, or premium micro-interactions.
---

# Prisma furniture — Frontend design skill

## Quick start

When asked to design/build UI for this project:

1. Establish the **page goal** (lead gen, showcase, catalog browsing).
2. Pick/confirm the **section list** and content inventory (text, images, CTAs).
3. Use **tokens** only (colors/typography/radii/shadows), extend tokens if needed.
4. Produce an **editorial luxury** layout: strong hierarchy, whitespace, calm rhythm.
5. Validate **a11y + SEO + performance** at the end.

## Design principles (project-specific)

- **Antique luxury / editorial**: serif display headlines + modern sans body, warm neutrals, restrained accents.
- **Craft first**: craftsmanship, materials, and process are the primary storytelling device.
- **Subtle motion**: small fades/translates, respect reduced motion.
- **Consistency**: if it’s not a token, it’s not allowed.

## Component & section patterns

### Hero (homepage)

Required elements:
- H1 with a short craft-driven statement
- 1–2 supporting lines (materials/process)
- Primary CTA (request consultation / view collection)
- Hero image (workshop / product close-up) with reserved aspect ratio

Layout suggestion:
- Two-column on desktop (copy + image), stacked on mobile.

### Featured collection (teaser)

Elements:
- Section title + short intro
- 3–6 cards
- Secondary CTA to full catalog

Card template:
- Image, name, short descriptor, optional tag (e.g. “Hand-carved”, “Walnut”)
- Entire card clickable; focus visible.

### Craft process

Elements:
- 3–5 steps (design → carving → assembly → finishing → delivery)
- Each step: number, title, 1–2 lines
- Optional supporting image or subtle divider rhythm

### Gallery

Elements:
- Masonry-like feel without heavy JS; keep it simple and responsive
- Captions optional; never clutter the imagery

### CTA band

Elements:
- One clear ask
- Short reassurance line (timeline, custom orders, materials)
- Form link / phone / messenger entry point

## Typical pages

- **Home**: Hero → Featured collection → Process → Proof (materials/guarantee) → Gallery → CTA
- **Catalog**: filters (minimal) + grid + strong typography; fast images
- **Product**: large media, story, specs, finishes, CTA; accessible gallery
- **About/Factory**: story + process + workshop photos + trust signals
- **Contacts**: clear channels + map (optional), working hours

## Output templates (use these)

### Section spec (before coding)

Provide:
- Goal
- Audience intent
- Content blocks
- Interaction
- a11y notes
- Performance notes

### Implementation checklist (after coding)

- [ ] Uses tokens only
- [ ] Headings order correct
- [ ] Focus visible, keyboard works
- [ ] `next/image` with `sizes`
- [ ] Reduced motion supported

## Additional resources

- For references and concrete prompts, see [examples.md](examples.md)
- For palette/font pairing notes, see [reference.md](reference.md)

