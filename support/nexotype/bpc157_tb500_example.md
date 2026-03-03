# BPC-157 + TB-500 Practical Example

This document demonstrates how the Nexotype PostgreSQL models work together to represent peptide combinations, their effects, and relationships.

---

## Models Schema Overview

### NODE Models (Entities)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THERAPEUTIC ASSETS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  TherapeuticAsset (Base)                                                    │
│  ├── id, uid, name, project_code, asset_type                                │
│  │                                                                          │
│  └── TherapeuticPeptide (Child)                                             │
│      ├── sequence_aa                                                        │
│      └── purity_grade                                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PHENOTYPE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  id, name, hpo_id                                                           │
│  Examples: "Tissue Healing", "Muscle Recovery", "Inflammation Reduction"    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PATHWAY                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  id, name, kegg_id, longevity_tier                                          │
│  Examples: "VEGF Signaling", "Actin Polymerization", "GH/IGF-1 Axis"        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROTEIN                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  id, uniprot_accession, sequence_aa, transcript_id                          │
│  Examples: "GHR (Growth Hormone Receptor)", "VEGFA"                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RELATION Models (Edges)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DRUG INTERACTION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Connects: Asset ↔ Asset                                                    │
│  Fields:                                                                    │
│    - asset_a_id (FK)                                                        │
│    - asset_b_id (FK)                                                        │
│    - interaction_type: "Synergy", "Contraindication", "Additive"            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        THERAPEUTIC EFFICACY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Connects: Asset → Indication | Phenotype | Biomarker                       │
│  Fields:                                                                    │
│    - asset_id (FK)                                                          │
│    - indication_id (FK, nullable)                                           │
│    - phenotype_id (FK, nullable)                                            │
│    - biomarker_id (FK, nullable)                                            │
│    - direction: "Increases", "Decreases", "Ameliorates"                     │
│    - magnitude: "+50%", "-30%"                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           BIO ACTIVITY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Connects: Asset → Pathway                                                  │
│  Fields:                                                                    │
│    - asset_id (FK)                                                          │
│    - pathway_id (FK)                                                        │
│    - activity_type: "Activator", "Inhibitor", "Modulator"                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       DRUG TARGET MECHANISM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Connects: Asset → Protein                                                  │
│  Fields:                                                                    │
│    - asset_id (FK)                                                          │
│    - protein_id (FK)                                                        │
│    - mechanism: "Agonist", "Inhibitor", "Partial Agonist"                   │
│    - affinity_value (Kd/Ki in nM)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Visual Graph: BPC-157 + TB-500 Combo

```
                                    ┌──────────────────┐
                                    │   VEGF Pathway   │
                                    │    (Pathway)     │
                                    │ longevity_tier:A │
                                    └────────▲─────────┘
                                             │
                                      BioActivity
                                   activity_type: "Activator"
                                             │
┌──────────────────┐               ┌─────────┴──────────┐               ┌──────────────────┐
│  Tissue Healing  │◄──────────────│      BPC-157       │──────────────►│   GHR Protein    │
│   (Phenotype)    │               │ (TherapeuticPep.)  │               │    (Protein)     │
└──────────────────┘               │                    │               └──────────────────┘
        ▲                          │ sequence_aa:       │                        ▲
        │                          │ GEPPPGKPADDAGLV    │                        │
 TherapeuticEfficacy               └─────────┬──────────┘               DrugTargetMechanism
 direction: "Increases"                      │                          mechanism: "Agonist"
 magnitude: "+60%"                           │
                                    DrugInteraction
                                interaction_type: "Synergy"
                                             │
┌──────────────────┐               ┌─────────┴──────────┐               ┌──────────────────┐
│ Muscle Recovery  │◄──────────────│      TB-500        │──────────────►│  Actin Pathway   │
│   (Phenotype)    │               │ (TherapeuticPep.)  │               │    (Pathway)     │
└──────────────────┘               │                    │               │ longevity_tier:B │
        ▲                          │ sequence_aa:       │               └──────────────────┘
        │                          │ SDKPDMAEIEKFDK...  │                        ▲
 TherapeuticEfficacy               └────────────────────┘                        │
 direction: "Increases"                                                   BioActivity
 magnitude: "+45%"                                                  activity_type: "Activator"
```

---

## SQL: Create the Data

### Step 1: Create NODE records

```sql
-- Create Pathways
INSERT INTO pathways (id, name, kegg_id, longevity_tier) VALUES
(1, 'VEGF Signaling Pathway', 'hsa04370', 'A'),
(2, 'Actin Polymerization Pathway', 'hsa04810', 'B');

-- Create Phenotypes
INSERT INTO phenotypes (id, name, hpo_id) VALUES
(1, 'Tissue Healing', 'HP:0001058'),
(2, 'Muscle Recovery', 'HP:0003236'),
(3, 'Inflammation Reduction', 'HP:0012649');

-- Create Proteins (simplified - normally needs transcript_id)
-- For this example, we assume proteins exist with these IDs
-- INSERT INTO proteins (id, uniprot_accession, sequence_aa) VALUES
-- (1, 'P10912', '...'),  -- GHR
-- (2, 'P15692', '...');  -- VEGFA

-- Create TherapeuticAssets (parent records)
INSERT INTO therapeutic_assets (id, uid, name, asset_type) VALUES
(1, 'pep_bpc157_001', 'BPC-157', 'therapeutic_peptide'),
(2, 'pep_tb500_001', 'TB-500 (Thymosin Beta-4)', 'therapeutic_peptide');

-- Create TherapeuticPeptides (child records)
INSERT INTO therapeutic_peptides (id, sequence_aa, purity_grade) VALUES
(1, 'GEPPPGKPADDAGLV', '99%'),
(2, 'SDKPDMAEIEKFDKSKLKKTETQEKNPLPSKETIEQEKQAGES', '99%');
```

### Step 2: Create RELATION records (Edges)

```sql
-- DrugInteraction: BPC-157 synergizes with TB-500
-- Note: asset_a_id < asset_b_id (enforced by check constraint)
INSERT INTO drug_interactions (asset_a_id, asset_b_id, interaction_type) VALUES
(1, 2, 'Synergy');

-- TherapeuticEfficacy: Link peptides to phenotypes
INSERT INTO therapeutic_efficacies (asset_id, phenotype_id, direction, magnitude) VALUES
(1, 1, 'Increases', '+60%'),   -- BPC-157 → Tissue Healing
(1, 3, 'Decreases', '-40%'),   -- BPC-157 → Inflammation
(2, 2, 'Increases', '+45%'),   -- TB-500 → Muscle Recovery
(2, 1, 'Increases', '+30%');   -- TB-500 → Tissue Healing (also helps)

-- BioActivity: Link peptides to pathways
INSERT INTO bio_activities (asset_id, pathway_id, activity_type) VALUES
(1, 1, 'Activator'),  -- BPC-157 activates VEGF
(2, 2, 'Activator');  -- TB-500 activates Actin Polymerization

-- DrugTargetMechanism: Link to proteins (if proteins exist)
-- INSERT INTO drug_target_mechanisms (asset_id, protein_id, mechanism, affinity_value) VALUES
-- (1, 1, 'Agonist', 150.0),  -- BPC-157 → GHR
-- (2, 2, 'Modulator', 85.0); -- TB-500 → Actin
```

---

## SQL: Query Examples

### Query 1: What does BPC-157 improve?

```sql
SELECT
    p.name AS phenotype,
    te.direction,
    te.magnitude
FROM therapeutic_efficacies te
JOIN therapeutic_assets ta ON te.asset_id = ta.id
JOIN phenotypes p ON te.phenotype_id = p.id
WHERE ta.name = 'BPC-157';
```

**Result:**
| phenotype | direction | magnitude |
|-----------|-----------|-----------|
| Tissue Healing | Increases | +60% |
| Inflammation Reduction | Decreases | -40% |

---

### Query 2: What synergizes with BPC-157?

```sql
SELECT
    ta2.name AS synergy_partner,
    di.interaction_type
FROM drug_interactions di
JOIN therapeutic_assets ta1 ON di.asset_a_id = ta1.id
JOIN therapeutic_assets ta2 ON di.asset_b_id = ta2.id
WHERE ta1.name = 'BPC-157'
  AND di.interaction_type = 'Synergy';
```

**Result:**
| synergy_partner | interaction_type |
|-----------------|------------------|
| TB-500 (Thymosin Beta-4) | Synergy |

---

### Query 3: Combined effects of BPC-157 + TB-500 combo

```sql
SELECT
    ta.name AS peptide,
    p.name AS phenotype,
    te.direction,
    te.magnitude
FROM drug_interactions di
JOIN therapeutic_assets ta1 ON di.asset_a_id = ta1.id
JOIN therapeutic_assets ta2 ON di.asset_b_id = ta2.id
JOIN therapeutic_efficacies te ON te.asset_id IN (ta1.id, ta2.id)
JOIN phenotypes p ON te.phenotype_id = p.id
JOIN therapeutic_assets ta ON te.asset_id = ta.id
WHERE di.interaction_type = 'Synergy'
  AND (ta1.name = 'BPC-157' OR ta2.name = 'BPC-157')
ORDER BY p.name, ta.name;
```

**Result:**
| peptide | phenotype | direction | magnitude |
|---------|-----------|-----------|-----------|
| TB-500 | Muscle Recovery | Increases | +45% |
| BPC-157 | Tissue Healing | Increases | +60% |
| TB-500 | Tissue Healing | Increases | +30% |
| BPC-157 | Inflammation Reduction | Decreases | -40% |

---

### Query 4: What pathways does the combo activate?

```sql
SELECT
    ta.name AS peptide,
    pw.name AS pathway,
    pw.longevity_tier,
    ba.activity_type
FROM drug_interactions di
JOIN therapeutic_assets ta1 ON di.asset_a_id = ta1.id
JOIN therapeutic_assets ta2 ON di.asset_b_id = ta2.id
JOIN bio_activities ba ON ba.asset_id IN (ta1.id, ta2.id)
JOIN pathways pw ON ba.pathway_id = pw.id
JOIN therapeutic_assets ta ON ba.asset_id = ta.id
WHERE di.interaction_type = 'Synergy'
  AND ta1.name = 'BPC-157';
```

**Result:**
| peptide | pathway | longevity_tier | activity_type |
|---------|---------|----------------|---------------|
| BPC-157 | VEGF Signaling Pathway | A | Activator |
| TB-500 | Actin Polymerization Pathway | B | Activator |

---

### Query 5: Find all peptides that improve Tissue Healing

```sql
SELECT
    ta.name AS peptide,
    te.direction,
    te.magnitude
FROM therapeutic_efficacies te
JOIN therapeutic_assets ta ON te.asset_id = ta.id
JOIN phenotypes p ON te.phenotype_id = p.id
WHERE p.name = 'Tissue Healing'
  AND ta.asset_type = 'therapeutic_peptide'
ORDER BY te.magnitude DESC;
```

**Result:**
| peptide | direction | magnitude |
|---------|-----------|-----------|
| BPC-157 | Increases | +60% |
| TB-500 | Increases | +30% |

---

## Model Relationships Summary

```
TherapeuticPeptide (NODE)
    │
    ├── DrugInteraction (RELATION) ──► TherapeuticPeptide (NODE)
    │   └── interaction_type: Synergy, Contraindication
    │
    ├── TherapeuticEfficacy (RELATION) ──► Phenotype (NODE)
    │   └── direction: Increases, Decreases
    │   └── magnitude: +60%, -40%
    │
    ├── BioActivity (RELATION) ──► Pathway (NODE)
    │   └── activity_type: Activator, Inhibitor
    │
    └── DrugTargetMechanism (RELATION) ──► Protein (NODE)
        └── mechanism: Agonist, Inhibitor
        └── affinity_value: Kd in nM
```

---

## Key Takeaways

1. **NODEs** = Standalone entities (peptides, phenotypes, pathways, proteins)
2. **RELATIONs** = Junction tables with ForeignKeys + edge properties
3. **Edge types** are defined by field values (e.g., `interaction_type = 'Synergy'`)
4. **Graph queries** = SQL JOINs on RELATION tables
5. **No graph database required** - PostgreSQL handles it with proper schema design
