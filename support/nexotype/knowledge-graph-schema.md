# Nexotype — Knowledge Graph Schema

Full schema showing how node models (entities) connect through relation models (edges).

---

## Model Classification

### Node Models (Entities) — standalone records

| Domain | Model |
|--------|-------|
| 1: Standardization | OntologyTerm, UnitOfMeasure |
| 2: Omics Registry | Organism, Gene, Transcript, Exon, Protein, ProteinDomain, Variant, PeptideFragment |
| 3: Clinical & Phenotypic | Indication, Phenotype, Biomarker, Pathway |
| 4: Asset Management | TherapeuticAsset, SmallMolecule, Biologic, TherapeuticPeptide, Oligonucleotide |
| 5: R&D Engineering | Candidate, DesignMutation, Construct |
| 6: LIMS & Empirical | Subject, Biospecimen, AssayProtocol, AssayRun |
| 7: User Bridge | *(none — UserProfile is a relation)* |
| 8: Personalization & SaaS | DataSource, GenomicFile |
| 9: Knowledge Graph | Source, ContextAttribute |
| 10: Commercial Intelligence | MarketOrganization, Patent, TechnologyPlatform |

### Relation Models (Edges) — junction tables connecting nodes

| Domain | Model | Connects |
|--------|-------|----------|
| 9: Knowledge Graph | BioActivity | Asset → Pathway |
| 9: Knowledge Graph | TherapeuticEfficacy | Asset → Indication / Phenotype / Biomarker |
| 9: Knowledge Graph | DrugTargetMechanism | Asset → Protein |
| 9: Knowledge Graph | DrugInteraction | Asset ↔ Asset |
| 9: Knowledge Graph | BiomarkerAssociation | Biomarker → Indication / Phenotype |
| 9: Knowledge Graph | GenomicAssociation | Variant → Indication |
| 9: Knowledge Graph | VariantPhenotype | Variant → Phenotype |
| 9: Knowledge Graph | PathwayMembership | Protein → Pathway |
| 9: Knowledge Graph | BiologicalRelationship | Protein ↔ Protein |
| 9: Knowledge Graph | EvidenceAssertion | Any relation → Source |
| 1: Standardization | ExternalReference | Any Entity → External DB |
| 6: LIMS & Empirical | AssayReadout | AssayRun + Biospecimen + Asset |
| 7: User Bridge | UserProfile | User → Subject |
| 8: Personalization & SaaS | UserVariant | Subject → Variant |
| 8: Personalization & SaaS | UserBiomarkerReading | Subject → Biomarker |
| 8: Personalization & SaaS | UserTreatmentLog | Subject → Asset |
| 8: Personalization & SaaS | PathwayScore | Subject → Pathway |
| 8: Personalization & SaaS | Recommendation | UserProfile → Asset |
| 10: Commercial Intelligence | AssetOwnership | Organization → Asset |
| 10: Commercial Intelligence | PatentAssignee | Organization → Patent |
| 10: Commercial Intelligence | PatentClaim | Asset → Patent |
| 10: Commercial Intelligence | Transaction | Organization → Organization |
| 10: Commercial Intelligence | LicensingAgreement | Organization → Organization |
| 10: Commercial Intelligence | DevelopmentPipeline | Asset → Indication |
| 10: Commercial Intelligence | RegulatoryApproval | Asset → Indication |
| 10: Commercial Intelligence | AssetTechnologyPlatform | Asset → TechnologyPlatform |
| 10: Commercial Intelligence | OrganizationTechnologyPlatform | Organization → TechnologyPlatform |

---

## Node Models (Entities)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DOMAIN 10: COMMERCIAL INTELLIGENCE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MarketOrganization                       Patent                            │
│  ├── legal_name                           ├── jurisdiction                  │
│  ├── isin, ticker_symbol                  ├── patent_number                 │
│  ├── primary_exchange                     ├── title                         │
│  ├── org_type (Public/Private/Uni)        ├── status (Pending/Granted/...)  │
│  ├── status (Active/Inactive/...)         ├── filing_date                   │
│  ├── founded, headquarters                └── expiry_date                   │
│  ├── website, employee_count              │                                 │
│  └── revenue_usd                          TechnologyPlatform                │
│                                           ├── name                          │
│                                           ├── category                      │
│                                           ├── readiness_level (Integer 1-9) │
│                                           └── description                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN 4: ASSET MANAGEMENT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TherapeuticAsset (Base — polymorphic via asset_type)                       │
│  ├── uid, name, project_code, asset_type                                   │
│  │                                                                          │
│  ├── SmallMolecule         ├── Biologic                                    │
│  │   ├── smiles            │   ├── sequence_aa                             │
│  │   └── inchi_key         │   └── biologic_type                           │
│  │                                                                          │
│  ├── TherapeuticPeptide    ├── Oligonucleotide                             │
│  │   ├── sequence_aa       │   ├── sequence_na                             │
│  │   └── purity_grade      │   └── modification_type                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOMAIN 3: CLINICAL & PHENOTYPIC                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Indication              Phenotype            Biomarker                     │
│  ├── name                ├── name              ├── name                     │
│  ├── icd_10_code         └── hpo_id            └── loinc_code              │
│  └── meddra_id                                                              │
│                                                                             │
│  Pathway                                                                    │
│  ├── name                                                                   │
│  ├── kegg_id                                                                │
│  └── longevity_tier (S/A/B/C/D)                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       DOMAIN 2: OMICS REGISTRY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Organism                Gene                 Transcript                    │
│  ├── ncbi_taxonomy_id    ├── organism_id (FK)  ├── gene_id (FK)            │
│  ├── scientific_name     ├── hgnc_symbol       ├── ensembl_transcript_id   │
│  └── common_name         ├── ensembl_gene_id   └── is_canonical            │
│                          └── chromosome                                     │
│                                                                             │
│  Exon                    Protein              ProteinDomain                 │
│  ├── transcript_id (FK)  ├── transcript_id     ├── protein_id (FK)         │
│  ├── ensembl_exon_id     ├── uniprot_accession ├── pfam_id                 │
│  ├── start_position      └── sequence_aa       └── name                    │
│  └── end_position                                                           │
│                                                                             │
│  Variant                 PeptideFragment                                    │
│  ├── gene_id (FK)        ├── protein_id (FK)                               │
│  ├── db_snp_id           └── sequence                                      │
│  ├── hgvs_c                                                                 │
│  └── hgvs_p                                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Relation Models (Edges)

These are junction tables with edge properties. They connect the nodes above into a knowledge graph.

### Domain 9: Knowledge Graph Relations

```
TherapeuticAsset ──── BioActivity ────► Pathway
                      ├── activity_type: Activator | Inhibitor | Modulator

TherapeuticAsset ──── TherapeuticEfficacy ────► Indication | Phenotype | Biomarker
                      ├── direction: Increases | Decreases | Ameliorates
                      └── magnitude: "+50%", "-30%"

TherapeuticAsset ──── DrugTargetMechanism ────► Protein
                      ├── mechanism: Agonist | Inhibitor | Partial Agonist
                      └── affinity_value (Kd/Ki in nM)

TherapeuticAsset ──── DrugInteraction ────► TherapeuticAsset
                      └── interaction_type: Synergy | Contraindication | Additive

Biomarker ──── BiomarkerAssociation ────► Indication | Phenotype
               └── correlation

Variant ──── GenomicAssociation ────► Indication
             └── odds_ratio

Variant ──── VariantPhenotype ────► Phenotype
             └── effect_size

Protein ──── PathwayMembership ────► Pathway
             └── role

Protein ──── BiologicalRelationship ────► Protein
             └── interaction_type
```

### Domain 10: Commercial Intelligence Relations

```
MarketOrganization ──── AssetOwnership ────► TherapeuticAsset
                        └── ownership_type

MarketOrganization ──── PatentAssignee ────► Patent
                        └── assignment_date

TherapeuticAsset ──── PatentClaim ────► Patent
                      └── claim_type

MarketOrganization ──── Transaction ────► MarketOrganization
(buyer)                 ├── asset_id (FK, optional)
                        ├── patent_id (FK, optional)
                        ├── transaction_type
                        ├── value_usd
                        └── announced_date

MarketOrganization ──── LicensingAgreement ────► MarketOrganization
(licensor)              ├── asset_id (FK, optional)
(licensee)              ├── patent_id (FK, optional)
                        ├── agreement_type, territory
                        ├── value_usd
                        ├── start_date, end_date
                        └── status

TherapeuticAsset ──── DevelopmentPipeline ────► Indication
                      ├── phase (Preclinical/Phase1/Phase2/Phase3/Approved)
                      ├── status
                      └── nct_number

TherapeuticAsset ──── RegulatoryApproval ────► Indication
                      ├── agency (FDA/EMA/PMDA/...)
                      ├── approval_type
                      ├── approval_date
                      └── status

TherapeuticAsset ──── AssetTechnologyPlatform ────► TechnologyPlatform
                      └── role

MarketOrganization ──── OrganizationTechnologyPlatform ────► TechnologyPlatform
                        └── utilization_type
```

### Domain 9: Evidence & Provenance

```
Any Relation ──── EvidenceAssertion ────► Source
                  ├── relationship_table       ├── source_type
                  ├── relationship_id          ├── external_id
                  └── confidence_score         ├── title, authors
                                               ├── journal
                  EvidenceAssertion ──── ContextAttribute    ├── publication_date
                                        ├── key              └── url
                                        └── value
```

---

## Full Graph Visualization

```
                                    Source / Publication
                                           ▲
                                           │ EvidenceAssertion
                                           │ (confidence_score)
                                           │
Organism ── Gene ── Transcript ── Protein ─┼─── PathwayMembership ───► Pathway
              │                     │      │                            ▲
              │                     │      │                            │
           Variant            DrugTarget   │                       BioActivity
              │               Mechanism    │                            │
              │                     │      │                            │
     GenomicAssociation             │      │                            │
     VariantPhenotype               ▼      │                            │
              │           TherapeuticAsset ─┼─── TherapeuticEfficacy ──►┤
              │              │    │    │    │                            │
              │              │    │    │    │                      Indication
              │              │    │    │    │                      Phenotype
              ▼              │    │    │    │                      Biomarker
         Indication ◄────────┘    │    │    │                            ▲
         Phenotype                │    │    │                            │
                                  │    │    │               BiomarkerAssociation
                     PatentClaim──┘    │    │
                          │            │    │
                          ▼            │    │
                       Patent          │    DrugInteraction
                          ▲            │         │
                          │            │         ▼
                   PatentAssignee      │    TherapeuticAsset
                          │            │
                          │      AssetOwnership
                          │            │
                          ▼            ▼
                   MarketOrganization ──────► Transaction
                          │                  LicensingAgreement
                          │
                   OrganizationTechnologyPlatform
                          │
                          ▼
                   TechnologyPlatform
```

---

## Evolution: From Isolated Nodes to Connected Graph

### Stage 1 — Node Models Only (current state)

Four disconnected entities. Each has full CRUD but no relationships between them.
A user sees four separate lists with no way to navigate between them.

```
┌─────────────────────┐   ┌─────────────────────┐
│  MarketOrganization │   │  TherapeuticAsset    │
│                     │   │                      │
│  "Elysium Health"   │   │  "Basis (NR + Pter.)"│
│  Private, Active    │   │  small_molecule      │
│  New York           │   │  asset_elysium_001   │
└─────────────────────┘   └──────────────────────┘

        (no connection)          (no connection)

┌─────────────────────┐   ┌─────────────────────┐
│  Indication         │   │  Patent              │
│                     │   │                      │
│  "Age-related NAD+  │   │  "US 9,975,916"     │
│   Decline"          │   │  Granted             │
│  ICD-10: E88.9      │   │  Expires: 2034-03-15 │
└─────────────────────┘   └──────────────────────┘
```

**Problem:** You can see Elysium Health exists. You can see the patent exists.
But there's no way to know Elysium owns Basis, Basis treats NAD+ Decline,
or that patent protects Basis. The data is there but disconnected.

---

### Stage 2 — Add Pathway, Phenotype, Biomarker (next)

More node models fill out the biological layer. Still disconnected, but now
the building blocks are complete enough to start linking.

```
┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│  MarketOrganization │   │  TherapeuticAsset    │   │  Patent          │
│  "Elysium Health"   │   │  "Basis"             │   │  "US 9,975,916"  │
└─────────────────────┘   └──────────────────────┘   └──────────────────┘

┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│  Indication         │   │  Pathway             │   │  Biomarker       │
│  "Age-related NAD+  │   │  "NAD+ Biosynthesis" │   │  "NAD+/NADH      │
│   Decline"          │   │  kegg: hsa00760      │   │   Ratio"         │
│                     │   │  longevity_tier: S    │   │  loinc: 50123-4  │
└─────────────────────┘   └──────────────────────┘   └──────────────────┘

┌─────────────────────┐
│  Phenotype          │
│  "Cellular Energy   │
│   Decline"          │
│  hpo: HP:0003236    │
└─────────────────────┘
```

**Still isolated.** Seven entity types but no edges. You can browse each list
independently but can't answer: "What pathways does Basis activate?"

---

### Stage 3 — Add Relation Models (the graph comes alive)

Relation models connect the nodes. Each edge carries properties (type, magnitude, etc.).
Now you can traverse: Company → Asset → Pathway → back to competing companies.

```
MarketOrganization: "Elysium Health"
│
│   AssetOwnership
│   ownership_type: "Originator"
│
├──────────────────────────────────────────► TherapeuticAsset: "Basis"
│                                            │
│                                            ├── BioActivity ──────────► Pathway: "NAD+ Biosynthesis"
│                                            │   activity_type:           longevity_tier: S
│                                            │   "Activator"
│                                            │
│                                            ├── TherapeuticEfficacy ──► Indication: "NAD+ Decline"
│                                            │   direction: "Ameliorates"
│                                            │   magnitude: "+40%"
│                                            │
│                                            ├── TherapeuticEfficacy ──► Biomarker: "NAD+/NADH Ratio"
│                                            │   direction: "Increases"
│                                            │   magnitude: "+60%"
│                                            │
│                                            ├── TherapeuticEfficacy ──► Phenotype: "Cellular Energy Decline"
│                                            │   direction: "Ameliorates"
│                                            │
│                                            └── PatentClaim ──────────► Patent: "US 9,975,916"
│                                                claim_type:              status: Granted
│                                                "Composition"            expiry: 2034-03-15
│
├── PatentAssignee ────────────────────────► Patent: "US 9,975,916"
│   assignment_date: 2018-05-22              (same patent, two paths to reach it)
│
└── LicensingAgreement ───────────────────► MarketOrganization: "ChromaDex"
    agreement_type: "Supply"                 (NR ingredient supplier)
    territory: "Worldwide"
```

**Now you can answer:**
- "What does Elysium own?" → AssetOwnership → Basis
- "What pathways does Basis target?" → BioActivity → NAD+ Biosynthesis (Tier S)
- "What evidence supports Basis?" → TherapeuticEfficacy → NAD+/NADH Ratio +60%
- "What patents protect Basis?" → PatentClaim → US 9,975,916
- "Who supplies Elysium?" → LicensingAgreement → ChromaDex
- "Who else targets NAD+ Biosynthesis?" → BioActivity (reverse) → all other assets → AssetOwnership → their companies

That last query is the killer feature: **traverse the graph to find competitors
by biological target, not by company name or industry code.**

---

### Stage 4 — Full Graph (the competitive intelligence layer)

Add DevelopmentPipeline, RegulatoryApproval, Transaction, DrugInteraction.
Now you see clinical progress, regulatory status, M&A activity, and drug combos.

```
MarketOrganization: "Elysium Health"
│
├── AssetOwnership ──► TherapeuticAsset: "Basis"
│                       │
│                       ├── BioActivity ──► Pathway: "NAD+ Biosynthesis" (Tier S)
│                       │                    ▲
│                       │                    │ BioActivity
│                       │                    │
│                       │                   TherapeuticAsset: "NMN" (by "ProHealth Longevity")
│                       │                    │                         ▲
│                       │                    │                         │ AssetOwnership
│                       │                    │                         │
│                       │                    │              MarketOrganization: "ProHealth Longevity"
│                       │                    │              (COMPETITOR — same pathway, same tier)
│                       │
│                       ├── DevelopmentPipeline ──► Indication: "Aging"
│                       │   phase: "Phase 2"
│                       │   nct_number: NCT02689882
│                       │   status: "Recruiting"
│                       │
│                       ├── RegulatoryApproval ──► Indication: "Dietary Supplement"
│                       │   agency: "FDA"
│                       │   approval_type: "GRAS"
│                       │   status: "Approved"
│                       │
│                       ├── DrugInteraction ──► TherapeuticAsset: "Metformin"
│                       │   interaction_type: "Additive"
│                       │
│                       └── PatentClaim ──► Patent: "US 9,975,916"
│                                           │
│                                           │ (same patent also claimed by)
│                                           │
│                                           PatentClaim ◄── TherapeuticAsset: "Niagen" (ChromaDex)
│                                                           (PATENT OVERLAP — potential conflict)
│
└── Transaction ──► MarketOrganization: "Mirror Biosciences"
    transaction_type: "Acquisition"
    value_usd: 15000000
    announced_date: 2023-06-15
```

**New queries unlocked:**
- "Who competes with Basis on the NAD+ pathway?" → ProHealth Longevity (NMN)
- "What's the clinical status of Basis?" → Phase 2, recruiting
- "Any patent overlaps?" → ChromaDex's Niagen claims same patent
- "What M&A has Elysium done?" → Acquired Mirror Biosciences for $15M
- "What drugs work well with Basis?" → Additive interaction with Metformin

---

## Real-World Example: Elysium Health in the Graph

```
MarketOrganization: "Elysium Health"
│   org_type: Private, status: Active, headquarters: New York
│
├── AssetOwnership ──► TherapeuticAsset: "Basis (NR + Pterostilbene)"
│   ownership_type:       uid: asset_elysium_001, asset_type: small_molecule
│   "Originator"          │
│                         ├── BioActivity ──► Pathway: "NAD+ Biosynthesis"
│                         │   activity_type:    kegg_id: hsa00760
│                         │   "Activator"       longevity_tier: S
│                         │
│                         ├── TherapeuticEfficacy ──► Indication: "Age-related NAD+ Decline"
│                         │   direction: "Ameliorates"    icd_10_code: E88.9
│                         │   magnitude: "+40%"
│                         │
│                         ├── TherapeuticEfficacy ──► Biomarker: "NAD+/NADH Ratio"
│                         │   direction: "Increases"      loinc_code: 50123-4
│                         │   magnitude: "+60%"
│                         │
│                         ├── DrugTargetMechanism ──► Protein: "NMNAT1"
│                         │   mechanism: "Substrate"      uniprot_accession: Q9HAN9
│                         │   affinity_value: null
│                         │
│                         ├── PatentClaim ──► Patent: "US 9,975,916"
│                         │   claim_type:       jurisdiction: US, status: Granted
│                         │   "Composition"     expiry_date: 2034-03-15
│                         │
│                         ├── DevelopmentPipeline ──► Indication: "Aging"
│                         │   phase: "Phase 2"
│                         │   nct_number: NCT02689882
│                         │
│                         └── DrugInteraction ──► TherapeuticAsset: "Metformin"
│                             interaction_type: "Additive"
│
├── PatentAssignee ──► Patent: "US 9,975,916"
│   assignment_date: 2018-05-22
│
├── LicensingAgreement ──► MarketOrganization: "ChromaDex"
│   agreement_type: "Supply"   (licensor of NR ingredient)
│   territory: "Worldwide"
│
└── OrganizationTechnologyPlatform ──► TechnologyPlatform: "NAD+ Precursor Delivery"
    utilization_type: "Core"             category: "Drug Delivery"
                                         readiness_level: 9
```

---

## Implementation Status

### Node Models (Entities)

| Domain | Model | Frontend Status |
|--------|-------|----------------|
| 10 | MarketOrganization | Done |
| 4 | TherapeuticAsset | Done |
| 3 | Indication | Done |
| 10 | Patent | Done |
| 3 | Pathway | Next |
| 3 | Phenotype | Pending |
| 3 | Biomarker | Pending |
| 2 | Organism | Pending |
| 2 | Gene | Pending |
| 2 | Protein | Pending |
| 2 | Transcript | Pending |
| 2 | Exon | Pending |
| 2 | ProteinDomain | Pending |
| 2 | Variant | Pending |
| 2 | PeptideFragment | Pending |
| 4 | SmallMolecule | Pending |
| 4 | Biologic | Pending |
| 4 | TherapeuticPeptide | Pending |
| 4 | Oligonucleotide | Pending |
| 9 | Source | Pending |
| 9 | ContextAttribute | Pending |
| 10 | TechnologyPlatform | Pending |

### Relation Models (Edges)

| Domain | Model | Connects | Frontend Status |
|--------|-------|----------|----------------|
| 9 | BioActivity | Asset → Pathway | Pending |
| 9 | TherapeuticEfficacy | Asset → Indication/Phenotype/Biomarker | Pending |
| 9 | DrugTargetMechanism | Asset → Protein | Pending |
| 9 | DrugInteraction | Asset ↔ Asset | Pending |
| 9 | BiomarkerAssociation | Biomarker → Indication/Phenotype | Pending |
| 9 | GenomicAssociation | Variant → Indication | Pending |
| 9 | VariantPhenotype | Variant → Phenotype | Pending |
| 9 | PathwayMembership | Protein → Pathway | Pending |
| 9 | BiologicalRelationship | Protein ↔ Protein | Pending |
| 9 | EvidenceAssertion | Any relation → Source | Pending |
| 1 | ExternalReference | Any Entity → External DB | Pending |
| 6 | AssayReadout | AssayRun + Biospecimen + Asset | Pending |
| 7 | UserProfile | User → Subject | Pending |
| 8 | UserVariant | Subject → Variant | Pending |
| 8 | UserBiomarkerReading | Subject → Biomarker | Pending |
| 8 | UserTreatmentLog | Subject → Asset | Pending |
| 8 | PathwayScore | Subject → Pathway | Pending |
| 8 | Recommendation | UserProfile → Asset | Pending |
| 10 | AssetOwnership | Organization → Asset | Pending |
| 10 | PatentAssignee | Organization → Patent | Pending |
| 10 | PatentClaim | Asset → Patent | Pending |
| 10 | Transaction | Organization → Organization | Pending |
| 10 | LicensingAgreement | Organization → Organization | Pending |
| 10 | DevelopmentPipeline | Asset → Indication | Pending |
| 10 | RegulatoryApproval | Asset → Indication | Pending |
| 10 | AssetTechnologyPlatform | Asset → TechnologyPlatform | Pending |
| 10 | OrganizationTechnologyPlatform | Organization → TechnologyPlatform | Pending |

### Other Node Models (not yet in main Node table above)

| Domain | Model | Frontend Status |
|--------|-------|----------------|
| 1 | OntologyTerm | Pending |
| 1 | UnitOfMeasure | Pending |
| 5 | Candidate | Pending |
| 5 | DesignMutation | Pending |
| 5 | Construct | Pending |
| 6 | Subject | Pending |
| 6 | Biospecimen | Pending |
| 6 | AssayProtocol | Pending |
| 6 | AssayRun | Pending |
| 8 | DataSource | Pending |
| 8 | GenomicFile | Pending |

---

## Reference Documents

- `bpc157_tb500_example.md` — Practical SQL example with BPC-157 + TB-500 peptide combo
- `nexotype-product-strategy.md` — Product strategy (hybrid model, three data layers)
- `business-ideas-overview.md` — Initial brainstorm of 4 business ideas
