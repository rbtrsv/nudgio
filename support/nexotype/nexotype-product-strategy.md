# Nexotype — Product Strategy

## Chosen Direction: Hybrid Intelligence Platform for Biotech

Nexotype is a market intelligence + pipeline management platform for biotech/longevity companies.

Biotech companies subscribe to:
1. **Manage their own pipeline** — therapeutic assets, patents, indications, clinical programs
2. **See the entire market** — platform-curated data on competitors, pathways, genes, proteins, patents, clinical trials
3. **Discover opportunities** — technologies to license, patents to acquire, collaboration targets, competitive threats

---

## Product Model: Three Data Layers

| Layer | Name | Who creates it | Who sees it | Permissions |
|-------|------|---------------|-------------|-------------|
| 1 | **Platform Data** | Nexotype (scrapers, AI agents, PubMed, FDA, ClinicalTrials.gov, patent DBs) | All subscribers | Read-only |
| 2 | **Organization Data** | The subscribing biotech company's team | Only their organization | Read/write |
| 3 | **Enriched View** | System merges both layers | The subscribing company | Their data enriched by platform context |

---

## Data Ownership Per Model

| Model | Organization Data (read/write) | Platform Data (read-only) |
|---|---|---|
| TherapeuticAsset | Their own pipeline assets | All known assets in the market |
| Patent | Their own patents | All patents in the space |
| Indication | Their own disease targets | All known indications |
| MarketOrganization | — | All companies (competitors, partners, targets) |
| Pathway | — | All biological pathways |
| Gene | — | All genes |
| Protein | — | All proteins |
| ClinicalTrial | Their own trials | All public trials (ClinicalTrials.gov) |
| Publication | — | PubMed publications |

Key: Organization = the biotech company with a subscription. They administer their own data AND browse all platform data.

---

## What a Biotech Company Sees

**Their pipeline page:**
- Their 12 therapeutic assets (read/write) alongside 5,000+ platform-curated assets (read-only)
- Filter by pathway, indication, asset type, status

**Their patents page:**
- Their 8 patents (read/write) alongside 3,400+ platform-curated patents (read-only)
- Filter by jurisdiction, pathway, indication, expiry

**Competitive landscape:**
- "Your lead asset targets mTOR pathway → here are 14 competitors also targeting mTOR → 3 have Phase 2 trials → 2 new patents filed this month"

**Discovery:**
- Browse pathways, find companies by target, see patent maps
- "Show me every company whose pipeline would be disrupted if this clinical trial fails"

**Alerts:**
- "New clinical trial registered targeting the same pathway as your portfolio company"
- "Competitor patent granted in your indication area"

---

## Why Hybrid Over Pure Models

### Why not pure Delphi (read-only intelligence)?
- Need massive data coverage before launch — you're one person
- No revenue during the 6-12 month data curation phase
- Enterprise sales cycle is slow
- Competing with Evaluate Pharma, Clarivate who have decades of data

### Why not pure SaaS (just a tool)?
- Without platform data, it's just a database UI — no moat
- Competes with Notion, Airtable, spreadsheets
- No unique value without the knowledge graph

### Why hybrid works:
- Tool value from day 1 (manage your pipeline) — revenue before full data coverage
- Platform data grows over time — value increases for existing subscribers
- Stickiness — their operational data lives in the platform, they don't leave
- The knowledge graph is the moat — nobody else connects biology to business this way
- Natural upsell: cheap tool tier → paid intelligence tier → enterprise

---

## Competitive Positioning

| Competitor | Focus | Weakness | Our edge |
|---|---|---|---|
| Evaluate Pharma | Drug pipeline valuations | No graph-based intelligence | Graph connects biology → business |
| Clarivate (Cortellis) | Drug pipeline + patents | Expensive, legacy UI | Modern stack, graph-native |
| PitchBook / CB Insights | VC/PE deal data | No biological data layer | Deep biological knowledge graph |
| GlobalData | Broad pharma intelligence | Generic, not graph-native | Longevity-focused, graph-native |
| Benchling | Lab/R&D workflow | No market intelligence layer | Pipeline management + market intelligence |

**Gap:** None of them combine a biological knowledge graph with company pipeline management and market intelligence in one platform.

---

## Initial Vertical: Longevity / Peptides

Start narrow and deep rather than wide and shallow.

**Why longevity:**
- Domain knowledge already exists (BPC-157/TB-500 work, pathway models)
- Smaller market to map deeply (~2,000 companies vs 50,000+ in all biotech)
- Growing investor interest (longevity VC funds expanding)
- Knowledge graph is most powerful here (pathways → treatments → companies)

**What "deep" means:**
- Every longevity company mapped
- Every longevity patent indexed
- Every clinical trial in longevity tracked
- All major pathways (mTOR, AMPK, NAD+, sirtuins, senolytics, etc.) fully connected
- A longevity biotech company sees their 12 patents next to 2,000 curated longevity patents — that's compelling

**Expand later to:** broader biotech, rare disease, oncology, neuroscience

---

## Platform Data Sources

| Source | Data type | Method |
|---|---|---|
| ClinicalTrials.gov | Clinical trials | API scraper |
| PubMed | Publications | API scraper |
| USPTO / EPO / WIPO | Patents | API scraper |
| FDA (Orange Book, approvals) | Drug approvals | API scraper |
| UniProt | Proteins | Bulk download |
| KEGG | Pathways | API / bulk |
| SEC / EDGAR | Company filings | API scraper |
| Crunchbase / PitchBook | Company funding | API (paid) or manual |
| Manual curation | Company pipelines, partnerships | Research + AI agents |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| Relational data | PostgreSQL (~84 models, nodes + relations) |
| Graph queries | SurrealDB (multi-hop traversals, pathway discovery) |
| Frontend | Next.js + shadcn/ui |
| Data pipeline | Python scrapers + Pydantic AI agents |
| Deployment | Coolify |

---

## Revenue Model

| Tier | What they get | Price |
|---|---|---|
| **Starter** | Pipeline management tool (Organization Data only) | Free or low |
| **Professional** | Tool + Platform Data (browse market, competitors, patents) | $X/mo |
| **Enterprise** | Full access + API + alerts + custom reports | $X/mo |

Exact pricing TBD after validating with potential users.

---

## Execution Phases

### Phase 1: Foundation (current)
- Backend models built (~84 models)
- Frontend CRUD for first 4 models (MarketOrganization, TherapeuticAsset, Indication, Patent)
- Sidebar with domain categories
- Organization/subscription system (accounts module)

### Phase 2: Data Pipeline
- Build scrapers for ClinicalTrials.gov, PubMed, USPTO
- Populate platform data for longevity vertical
- Add `data_source` / `data_layer` field to distinguish platform vs organization data
- Permission layer: organization sees own data (read/write) + platform data (read-only)

### Phase 3: Intelligence Layer
- Competitive landscape views (who targets the same pathway)
- Patent overlap detection
- Clinical trial tracking with alerts
- Graph-powered discovery queries via SurrealDB

### Phase 4: Validation
- Find 3-5 longevity biotech companies willing to beta test
- Validate willingness to pay
- Talk to Delphi friend for enterprise positioning advice
- Iterate based on feedback

### Phase 5: Launch
- Subscription tiers live
- Marketing: longevity biotech conferences, content, community
- Custom services (market reports, M&A screening) as additional revenue

---

## Key Risks

| Risk | Mitigation |
|---|---|
| Platform data coverage too thin at launch | Start narrow (longevity only), curate deeply |
| Enterprise sales cycle slow (6-12 months) | Tool tier provides revenue while building relationships |
| Incumbents have decades of data | Compete on connections (graph), not volume |
| Solo founder bandwidth | Automate data pipeline heavily (scrapers + AI agents) |
| Data quality / accuracy | Peer-reviewed sources, automated validation, manual spot-checks |

---

## Reference Documents

- `business-ideas-overview.md` — Initial brainstorm of 4 business ideas
- `bpc157_tb500_example.md` — Example of how the knowledge graph models work together
- `../tasks/product-names.md` — Brand architecture (Finpy, FIVE, Nexotype Intelligence, Nexotype Health)
