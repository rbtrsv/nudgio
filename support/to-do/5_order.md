# Frontend Implementation Checklist

---

## V1 — COMPLETE

All 60 entities fully implemented across all layers:

- **Backend subrouters**: 60/60 (crud_utils pattern, auth + ownership + soft delete + audit)
- **Schemas**: 60/60
- **Services**: 60/60
- **Stores**: 60/60
- **Hooks**: 60/60
- **Providers**: 60/60 (wired in nexotype-providers.tsx)
- **API Endpoints**: 60/60 (api.endpoints.ts)
- **Pages**: 60/60 (180 page files: list + create + detail per entity)
- **Sidebar**: 60/60 navigation entries
- **TypeScript**: 0 errors (npx tsc --noEmit clean)

### V1 Entity Breakdown by Domain

**Standardization (3):** ontology-term, unit-of-measure, external-reference
**Omics (8):** organism, gene, transcript, exon, protein, protein-domain, peptide-fragment, variant
**Clinical (4):** biomarker, indication, pathway, phenotype
**Asset (5):** therapeutic-asset, small-molecule, biologic, oligonucleotide, therapeutic-peptide
**Engineering (3):** candidate, construct, design-mutation
**LIMS (5):** subject, biospecimen, assay-protocol, assay-run, assay-readout
**User (8):** user-profile, data-source, genomic-file, user-variant, user-biomarker-reading, user-treatment-log, pathway-score, recommendation
**Knowledge Graph (12):** pathway-membership, biological-relationship, source, evidence-assertion, context-attribute, drug-target-mechanism, bioactivity, therapeutic-efficacy, drug-interaction, biomarker-association, genomic-association, variant-phenotype
**Commercial (12):** market-organization, patent, patent-claim, patent-assignee, asset-ownership, transaction, licensing-agreement, development-pipeline, regulatory-approval, technology-platform, asset-technology-platform, organization-technology-platform

---

## V2 — COMPLETE

Seven upgrades applied across all 60 entities:

### ✅ Step 1: Form Lockup Bug Fix

**Problem:** In every create page's `onSubmit`, when Zod `safeParse` fails OR the
`await createEntity()` call throws, TanStack Form's `isSubmitting` stays `true`
forever — all fields become permanently disabled. User must reload.

**Root cause:** The `onSubmit` is an `async` function. If it throws (unhandled
promise rejection), TanStack Form never resets `isSubmitting`. The Zod early
`return;` itself is safe (resolves the promise), but if the store call after it
throws unexpectedly, the async function rejects and isSubmitting stays stuck.

**Fix:** Wrapped the entire `onSubmit` body in `try { ... } catch { // Swallow }`
in all 61 `new/page.tsx` files. This guarantees the async function always resolves,
so TanStack always resets `isSubmitting`. The store's own try/catch handles error
display via `storeError`.

**Files:** All 61 `client/src/app/(nexotype)/**/new/page.tsx`

### ✅ Step 2: Per-Model Enum Constants

**Problem:** ~35 fields across models have known value sets (mechanism, asset_type,
phase, status, agency, etc.) but no shared constants exist. Frontend accepts any
string via `<Input>`.

**Fix:** Added `z.enum()` declarations + `OPTIONS` arrays (label + value pairs)
directly inside each model's schema file. Per-model approach chosen because zero
cross-model sharing exists — every option array belongs to exactly one model's one
field. This matches the market-organization.schemas.ts pattern already in place.

**Approach change:** Initially created shared files (single root-level, then 7
domain-level). Deleted all shared files and moved constants inline per model.

### ✅ Step 3: Update Zod Schemas to Use z.enum()

**What:** For each enum-like field, changed the Zod schema from
`z.string().min(1).max(50)` to `z.enum([...values])`. This gives runtime
validation AND TypeScript type safety — a `phase` field typed as
`'Preclinical' | 'Phase I' | 'Phase II' | 'Phase III' | 'Commercial'`
instead of `string`.

**Files:** 28 schema files updated across asset, clinical, lims, user,
knowledge_graph, standardization, and commercial domains. Engineering and omics
domains have zero enum-like fields (only FKs, identifiers, numbers, sequences).

### ✅ Step 4: Replace Text Inputs with Select Dropdowns (enum fields)

**What:** For every enum-like field from Step 2, replaced `<Input>` with
`<Select>` + `<SelectItem>` using the per-model option constants. Applied to
create forms AND detail/settings edit forms.

**Scope:** 27 entities across all 6 domains (54 page files: new + detail each).
Nullable enum fields (territory, sex, longevity_tier) use `__none__` sentinel
pattern with "— None —" option.

**Pattern for create pages:** Import OPTIONS from schema, replace Input with
Select, change `createXxx(payload)` → `createXxx(validation.data)` for type safety.

**Pattern for detail pages:** Import OPTIONS + type from schema, replace Input
with Select, remove `.trim()` guards, add `as EnumType` cast in update call.

### ✅ Step 5: Replace Raw ID Inputs with Searchable Comboboxes (FK fields)

**What:** For every FK field, replaced `<Input type="number">` with Popover +
Command searchable combobox. Import the referenced entity's hook to populate
the dropdown with actual entity names.

**Scope:** All entities with FK fields — create pages AND detail/settings edit forms.
Entities with no FK fields (organism, ontology-term, unit-of-measure,
external-reference, therapeutic-asset, subject, assay-protocol, user-profile,
data-source, genomic-file, source, market-organization, patent, technology-platform)
were skipped (N/A).

**FK → hook → display field mapping:**

| Referenced Entity (Hook) | Display Field | Used By |
|---|---|---|
| useOrganisms | scientific_name | gene, subject |
| useGenes | hgnc_symbol | transcript, variant, pathway-membership |
| useTranscripts | ensembl_transcript_id | protein, exon |
| useProteins | uniprot_accession | protein-domain, peptide-fragment, pathway-membership, biological-relationship, drug-target-mechanism |
| useTherapeuticAssets | name | candidate, user-treatment-log, recommendation, drug-target-mechanism, bioactivity, therapeutic-efficacy, drug-interaction, patent-claim, asset-ownership, transaction, licensing-agreement, development-pipeline, regulatory-approval, asset-technology-platform, assay-readout |
| usePathways | name | bioactivity, pathway-score |
| useIndications | name | therapeutic-efficacy, genomic-association, biomarker-association, development-pipeline, regulatory-approval |
| usePhenotypes | name | therapeutic-efficacy, variant-phenotype, biomarker-association |
| useBiomarkers | name | therapeutic-efficacy, user-biomarker-reading, biomarker-association |
| useVariants | db_snp_id | user-variant, genomic-association, variant-phenotype |
| useCandidates | version_number | construct, design-mutation, candidate (parent) |
| useSubjects | subject_identifier | biospecimen, genomic-file, user-variant, user-biomarker-reading, user-treatment-log, pathway-score |
| useUserProfiles | (subject_id→name) | recommendation |
| useAssayProtocols | name | assay-run |
| useAssayRuns | id | assay-readout |
| useBiospecimens | barcode | assay-readout |
| useDataSources | name | user-biomarker-reading |
| useUnitsOfMeasure | symbol | user-biomarker-reading, assay-readout |
| useSources | external_id | evidence-assertion |
| useEvidenceAssertions | id | context-attribute |
| useMarketOrganizations | legal_name | patent-assignee, asset-ownership, transaction, licensing-agreement, org-technology-platform |
| usePatents | patent_number | patent-claim, patent-assignee, transaction, licensing-agreement |
| useTechnologyPlatforms | name | asset-technology-platform, org-technology-platform |

### ✅ Step 6: Sorting + Multi-Filter Bars (17 batch entities)

**What:** The 17 knowledge graph + commercial entities created in batch only
had a single search input. Added: SortField/SortDirection types + handleSort() +
SortIndicator, FK combobox filters in the list page filter bar.

**Entities updated:** bioactivity, therapeutic-efficacy, drug-interaction,
biomarker-association, genomic-association, variant-phenotype, patent-claim,
patent-assignee, asset-ownership, transaction, licensing-agreement,
development-pipeline, regulatory-approval, technology-platform,
asset-technology-platform, organization-technology-platform
(drug-target-mechanism was already done as the reference pattern)

**Pattern per list page:**
- SortField union type + SortDirection + handleSort cycling (asc → desc → none)
- SortIndicator component (ChevronUp/ChevronDown)
- FK combobox filters (Popover + Command) with useMemo-built options
- Responsive filter grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (or lg:grid-cols-4)
- FK name resolution in table cells via getXxxName() helpers
- overflow-x-auto table wrapper for mobile scroll

### ✅ Step 7: Responsive Design (all 60 entities, 180 pages)

**What:** Applied consistent responsive breakpoints to all 180 page files.

**List pages (60):** Already responsive from Step 6 upgrades + original V1 implementation.
- Header: `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
- Title: `text-2xl sm:text-3xl`
- Create button: `w-full sm:w-auto`
- Filter grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Table: `overflow-x-auto -mx-4 sm:mx-0` scroll wrapper

**Create pages (61):**
- Container: `px-4 sm:px-0`
- Title: `text-2xl sm:text-3xl`
- Form buttons: `flex flex-col-reverse gap-3 pt-4 sm:flex-row`

**Detail pages (61):**
- Container: `px-4 sm:px-0`
- Title: `text-2xl sm:text-3xl`
- Header icon: `hidden sm:block`
- Edit grid: `grid-cols-1 sm:grid-cols-2`
- Full-width fields: `sm:col-span-2`

**TSC result:** 0 errors after all steps.

---

## Wiring Files (reference)

- `client/src/modules/nexotype/utils/api.endpoints.ts`
- `client/src/modules/nexotype/providers/nexotype-providers.tsx`
- `client/src/modules/nexotype/components/nexotype-sidebar.tsx`

---

## V3 — COMPLETE

Utility functions for human-readable labels and badge variant centralization.

### ✅ Label Utilities

**`getAssetTypeLabel()`** — Converts snake_case asset_type values (e.g.,
`small_molecule`, `therapeutic_peptide`) to human-readable labels
(e.g., "Small Molecule", "Therapeutic Peptide").

**`getEntityTypeLabel()`** — Converts snake_case entity_type values to
human-readable labels. Used across knowledge graph and standardization
entities where entity_type is stored as snake_case in the DB.

### ✅ Badge Variant Centralization

**`getPatentStatusVariant()`** — Maps patent status values to consistent
badge color variants (e.g., "Granted" → success, "Pending" → warning,
"Expired" → destructive).

**`getOrgStatusVariant()`** — Maps market organization status values to
badge color variants.

**`getOrgTypeVariant()`** — Maps market organization type values to
badge color variants.

---

## Bug Fix — COMPLETE

### ✅ Audit Log datetime Serialization

**Problem:** `create_with_audit` and `create_or_restore_with_audit` in
`crud_utils.py` passed `new_data=payload` to `log_audit()`. The payload
dict contains raw Python `datetime.date` objects from Pydantic parsing,
which are not JSON serializable — causing 500 errors on INSERT audit writes.

**Fix:** Changed `new_data=payload` → `new_data=model_to_dict(item)` in both
functions. `model_to_dict()` reads from the SQLAlchemy model instance after
flush, where dates are already stored as strings by the DB layer.

**File:** `server/apps/nexotype/utils/crud_utils.py`

---

## Current Status — V1–V3 + Subscription Hardening Complete

All V1–V3 entity work is done. Subscription hardening (webhook dedupe,
secret enforcement, checkout duplicate prevention, SameSite cookie fix,
Switch Plan via Billing Portal) is done in both nexotype and finpy.

---

# ============================================================
# V4 — Subscription & Pricing Strategy (PLANNING)
# ============================================================

## What exists now

**accounts module (shared, both nexotype + finpy):**
- `stripe_utils.py` — checkout, portal, webhook handling, plans/products fetch
- `dependency_utils.py` — `require_subscription_tier()`, `require_organization_role()`,
  `require_organization_role_and_subscription()` (FastAPI dependency factories)
- Subscription model in DB (stripe_customer_id, stripe_subscription_id, plan_name, status)
- Stripe products: Pro ($120/mo) + Enterprise ($360/mo) with tier metadata

**nexotype module:**
- 0 subscription checks on any of the 60 entity subrouters
- Anyone logged in can CRUD everything regardless of subscription tier
- No usage tracking, no write locks, no seat limits

**finpy (reference implementation):**
- `assetmanager/utils/subscription_utils.py` — entity count, Stripe quantity sync, write lock
- `assetmanager/utils/dependency_utils.py` — `require_active_subscription` (router-level)
- Quantity-based billing per entity (FREE_ENTITY_LIMIT = 1)
- Confirmation dialog on billable entity creation

## Decisions needed before implementation

### 1. Pricing model
- **Plan-based flat** (Pro/Enterprise, fixed price, no usage metering)
- **Per seat** (charge per user in org — sync quantity on invite/remove)
- **Per record** (charge per total records across entities — sync on create/delete)
- **Hybrid** (flat plan + usage add-on, like Anthropic: plan sets limits, overages billed)

### 2. What does each tier unlock?
- Which of the 60 entities are free vs Pro vs Enterprise?
- Or: all entities available, but limits on record count / users / API calls?
- Free tier: what's included? Read-only? Limited entities? Limited records?

### 3. Enforcement mechanism
- Router-level dependency (like finpy — GET always allowed, POST/PUT/DELETE gated)?
- Per-subrouter granular gating (some entities free, some Pro, some Enterprise)?
- Write lock (read-only when subscription lapses) vs hard lock (no access at all)?

### 4. Implementation scope
- Need `nexotype/utils/subscription_utils.py`? (only if usage-based / per-seat / per-record)
- Need router-level dependency? (yes, regardless of model)
- Need frontend changes? (subscription status indicators, upgrade prompts, confirmation dialogs)

## Next steps
1. Decide pricing model
2. Define tier boundaries (what's free, what's Pro, what's Enterprise)
3. Implement backend gating
4. Implement frontend enforcement (upgrade prompts, write lock UI)
