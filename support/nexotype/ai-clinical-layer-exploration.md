# AI Clinical Layer — Exploration Doc

Status: Exploratory. No decisions made. Documenting angles worth investigating.

Inspired by PostVisit.ai (patient-facing AI that translates medical visits into plain language).
Nexotype's knowledge graph already has the data backbone — the question is what AI layer sits on top and for whom.

---

## Existing Data That Enables This

Already built in V1 (60 entities):

**Patient/User data:** user-profile, user-variant, user-biomarker-reading, user-treatment-log, pathway-score, recommendation

**Clinical knowledge:** biomarker, indication, phenotype, pathway, drug-interaction, therapeutic-efficacy, biomarker-association, genomic-association, variant-phenotype

**Treatment data:** therapeutic-asset, small-molecule, biologic, therapeutic-peptide, oligonucleotide, development-pipeline, regulatory-approval

The knowledge graph connects all of these. An AI layer queries across them.

---

## Three Possible Angles

### Angle 1: Genomic Interpretation (Patient-Facing)

**What:** Patient uploads genomic data (23andMe, whole genome sequencing). AI explains what their variants mean using the knowledge graph.

**Flow:**
1. Patient uploads raw genomic file
2. System maps variants to `user-variant` records
3. AI queries `variant-phenotype`, `genomic-association`, `biomarker-association` to find relevant connections
4. Generates plain-language explanation: "Your MTHFR variant is associated with reduced folate metabolism. This has a moderate effect size."
5. Links to relevant pathways, biomarkers, and available therapeutics from the knowledge graph

**Who pays:** Direct-to-consumer or clinic licenses it for their patients

**Differentiator vs 23andMe reports:** Nexotype's knowledge graph is continuously updated and connects genomic data to the full drug/pathway/biomarker landscape, not just static risk scores

---

### Angle 2: Clinical Decision Support (Clinician-Facing)

**What:** Clinician queries the knowledge graph for a specific patient scenario. AI returns actionable clinical intelligence.

**Flow:**
1. Clinician enters patient context: "62yo male, BRCA2 variant, elevated PSA, currently on metformin"
2. AI queries across entities: drug-interactions (metformin interactions), genomic-associations (BRCA2 + prostate cancer), therapeutic-efficacies (treatments for this profile), development-pipeline (what's in clinical trials)
3. Returns structured clinical summary with citations to knowledge graph entities
4. Flags relevant drug interactions, biomarker thresholds, treatment options

**Who pays:** Clinics, hospitals, or integrated into EHR systems

**Differentiator:** Not just a drug interaction checker — connects genomic profile + biomarkers + drug interactions + clinical pipeline in one query

---

### Angle 3: Both — Patient Gets Plain Language, Clinician Gets Clinical Intelligence

**What:** Same knowledge graph, two interfaces. Patient sees simplified version, clinician sees full clinical detail.

**Flow:**
1. Clinic onboards patient, uploads their genomic data + biomarker readings
2. **Patient portal:** "Here's what your results mean" in plain language, ongoing personalized guidance, answers to common questions
3. **Clinician dashboard:** Full knowledge graph query interface, drug interaction checks, treatment pathway analysis, clinical trial matching
4. Both views powered by the same underlying data and AI layer

**Who pays:** Clinic subscribes (B2B), patient access included

**Differentiator:** PostVisit.ai translates visit transcripts. This translates an entire genomic + biomarker profile through a knowledge graph — deeper and ongoing, not one-off.

---

## Open Questions

- Does this cannibalize or complement the B2B biotech intelligence product?
- Is the clinic vertical a separate product (Nexotype Health) or a feature tier?
- Privacy/compliance: HIPAA (US), GDPR (EU) — what's the minimum viable compliance?
- Does the AI layer need its own models or can it query the existing knowledge graph directly?
- What's the minimum data coverage needed for the AI to be useful? (e.g., how many variant-phenotype associations before genomic interpretation is credible?)
- Regulatory: is this a medical device? Does it need FDA clearance depending on what claims it makes?

---

## Relationship to Current Product Strategy

From `nexotype-product-strategy.md`:
- Phase 1 (Foundation) — DONE
- Phase 2 (Data Pipeline) — next priority for the B2B product
- Phase 3 (Intelligence Layer) — the AI clinical layer could be a vertical extension of this

The clinic angle does NOT replace the biotech intelligence product. It's a second vertical that reuses the same knowledge graph. The biotech companies populate and enrich the graph; the clinics consume it for patient care. Both pay.

---

## Next Steps (When Ready)

1. Talk to 2-3 clinicians about what they actually need (not what sounds cool)
2. Identify minimum viable knowledge graph coverage for a useful AI query
3. Decide: same product with role-based views, or separate product?
4. Privacy/compliance research before writing any code
