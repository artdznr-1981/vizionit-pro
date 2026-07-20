<div align="center">

# VIZIONIT PRO

### AI-Powered Catalog Production Pipeline for Lighting Manufacturers

**One product photo → Complete marketing content library in under 4 minutes**

[![License](https://img.shields.io/badge/License-Proprietary-red)]()

---

*VizionIt Pro transforms how lighting manufacturers create product marketing content. Upload a single fixture photo and the AI handles everything — product analysis, creative naming with trademark verification, photorealistic room scene staging, SEO-optimized marketing copy, PDF catalog brochures, and social media posts — all in one automated pipeline.*

</div>

> **Related:** For the product overview, case study, and demo, see [vizionit-pro-showcase](https://github.com/artdznr-1981/vizionit-pro-showcase). This repo contains the public frontend source; the backend AI pipeline is proprietary.

---

## The Problem

Lighting manufacturers spend **$15K–$30K and weeks of production time** per product line on catalog photography, 3D room scene rendering, and marketing content.

## The Solution

VizionIt Pro replaces that entire workflow with a single product photo and AI.

---

## Demo

> 🎬 **[Watch the full demo HERE →]**
> 
https://github.com/user-attachments/assets/ae6fe7e1-1970-4e00-8e23-9af8c85438df

---

## Features

### Intelligent Product Analysis
Upload a product image and the AI instantly extracts 8 specifications — fixture type, dimensions, bulb info, finish color, shade, hanging height, ETL listing, and design style. It generates a creative product name and runs an automatic trademark verification against known lighting brands, flagging conflicts with an **AI Verified** or **AI Revised** badge.

### 12 Photorealistic Room Scenes
One click generates high-resolution staged images across 12 residential environments:

**Interior:** Kitchen · Bedroom · Living Room · Dining Room · Entry · Sunroom · Eat-in Dining Nook · Office

**Exterior:** Front Porch · Back Porch / Outdoor Living · Covered Patio / Pergola · Pool & Cabana

### Architecturally Correct Fixture Placement

This is VizionIt Pro's key differentiator. Generic AI tools default to "hero product in foreground" composition. VizionIt Pro uses a proprietary placement engine with **156 unique rules** (13 fixture categories × 12 rooms) built from real-world installation standards:

| Category | Placement Intelligence |
|---|---|
| Mini-Pendant | Quantity- and context-aware grouping (e.g. multi-fixture runs vs. balanced pairs) depending on room and surface |
| Bath Fixture | Light-count–driven layout, sized and centered to the vanity/mirror |
| Wall Sconce | Symmetrical pairing around architectural focal points |
| Chandelier | Centered over the primary surface with correct perspective alignment |
| Floor Lamp | Corner and surface-anchored positioning |
| Outdoor Post | Balanced, code-aware placement along entries and pathways |

*...and 150 more specific rules covering every fixture × room combination.*

### SEO-Optimized Marketing Copy
Every room scene gets a tailored product description with a unique bold tagline. Each description naturally incorporates the product name, fixture category, room type, design style, and interior design search terms — optimized for both luxury print catalogs and E-commerce product listings.

### Full Creative Control
- **Lighting Intensity** — adjustable from ambient to dramatic
- **Color Temperature** — warm (2700K) to cool (5000K)
- **Architectural Style** — Transitional, Modern, Contemporary, Industrial, Traditional, Art Deco, Sustainable Organic, Modern Farmhouse, Modern Retro

### Professional Exports
- **PDF Spec Catalog** — branded cover page, product specifications sheet, and 3-view room staging layouts per room
- **300ppi Image Bundle** — ZIP download of all 12 staged scenes in print-ready resolution
- **Marketing Copy** — downloadable text file with all room descriptions, plus per-room clipboard copy
- **Social Media Studio** — generate platform-specific posts for Instagram, Facebook, LinkedIn, and LinkedIn Carousel with one-click PNG/PDF download

### Spreadsheet Import
Import product specifications from `.xlsx` or `.csv` files — auto-maps columns to product fields.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Upload   │  │  Room    │  │  Social Media     │  │
│  │  + Specs  │  │  Tiles   │  │  Studio           │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │              │
└───────┼──────────────┼─────────────────┼──────────────┘
        │              │                 │
        ▼              ▼                 ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│                                                      │
│  Product Analysis  ·  Scene Rendering  ·  Social     │
│  + Trademark         + Marketing         Content     │
│  Verification        Copy Generation    Generation   │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │        PLACEMENT ENGINE (Proprietary)         │    │
│  │   13 fixture types × 12 rooms = 156 rules    │    │
│  │   Custom multi-step pipeline                  │    │
│  │   Separated image + copy architecture         │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Generative AI  │
              │   APIs           │
              └─────────────────┘
```

### Key Engineering Challenges Solved

**Precise Fixture Placement** — Generative image models default to "hero product" composition, placing fixtures in the foreground instead of their correct architectural position. VizionIt Pro uses a custom multi-step pipeline to achieve accurate placement that respects real-world installation standards.

**Consistent Marketing Copy** — A separated image + copy architecture ensures every room scene gets consistent, high-quality marketing descriptions regardless of the image generation model's text output variability.

**13 × 12 Placement Matrix** — Each fixture category behaves differently in each room, so a single "place the fixture" instruction doesn't work. The engine resolves the correct treatment for every fixture-category × room combination — reasoning over factors like quantity (single vs. paired vs. grouped), mounting height, focal-point alignment, surface anchoring, and framing. All 156 combinations are handled by proprietary rules in the backend.

---

## Fixture Categories

VizionIt Pro recognizes and correctly places all 13 standard lighting fixture categories:

`Pendant` · `Mini-Pendant` · `Chandelier` · `Linear Chandelier` · `Flush Mount` · `Semi-Flush Mount` · `Wall Sconce` · `Bath Fixture` · `Fan Light` · `Table Lamp` · `Floor Lamp` · `Outdoor Wall Fixture` · `Outdoor Post`

Each category has distinct placement logic — hanging heights, cord lengths, quantity rules (singles vs. pairs vs. trios), surface anchoring, and camera framing — all varying by room.

---

## Competitive Landscape

No AI tool exists that is specifically built for lighting manufacturers to produce product catalogs. VizionIt Pro fills this gap — combining fixture-type detection, architectural placement intelligence, spec sheet extraction, PDF catalog export, and social media content generation in a single pipeline.

---

## Status

🟢 **Active Development** — Testing and refinement phase. Core pipeline functional across all 13 fixture categories and 12 room scenes.

---

## Repository

This repository contains the frontend application code. The backend placement engine and AI pipeline are proprietary and not included.

---

## Contact

Built by **Susan McLean Nangle**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?logo=linkedin&logoColor=white)](www.linkedin.com/in/susanmcleandesign)

---

<div align="center">

*VizionIt Pro — From one product photo to client-ready content in under 4 minutes.*

</div>
