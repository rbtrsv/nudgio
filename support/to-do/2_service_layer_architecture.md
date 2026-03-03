# SERVICE LAYER ARCHITECTURE — WHEN & HOW

## WHAT IS A SERVICE

A service is a plain Python file with functions or a class. No `APIRouter`, no `@router.get()`,
no HTTP decorators, no request/response objects. Just logic.

The subrouter still owns the router. The subrouter still handles HTTP.
The only difference is: instead of doing the DB work + logic inline, it calls a service function.

```python
# service file — plain Python, no FastAPI, no HTTP
class CandidateService:
    @staticmethod
    async def create(db, data):
        # business logic here
        # SQLAlchemy queries here
        # return a model object
```

```python
# subrouter file — still owns the router, still handles HTTP
@router.post("/")
async def create_candidate(data, db):
    result = await CandidateService.create(db, data)   # call service
    return CandidateDetail.model_validate(result)       # format HTTP response
```

The service does NOT use `APIRouter`. It does NOT have endpoints. It's not a subrouter.
It's a helper that the subrouter calls.

---

## ARCHITECTURE PATTERNS (FROM SIMPLEST TO MOST COMPLEX)

### 1. Router-only (what nexotype has now)

```
subrouter (HTTP + logic + DB)
```

Everything in one file. The endpoint function receives the request, talks to the DB,
applies any rules, and returns the response. CRUD + business logic together.

**Used by:** most small FastAPI apps, Next.js server actions (v7capital), Django views for simple apps.

**Works when:** logic is simple, one table per endpoint, no cross-model coordination.

**Breaks when:** you need compound operations, cross-model validation, or shared logic
between multiple endpoints.

### 2. Service layer (industry standard)

```
subrouter → service → database
```

Router handles HTTP (request parsing, status codes, auth).
Service handles logic (validation rules, compound operations, cross-model coordination).
Database queries live inside the service.

**Used by:** Django (views → managers/services), Spring Boot (controllers → services),
.NET (controllers → services), NestJS (controllers → services), Laravel (controllers → services).

**This is the professional standard** because it separates "what comes in over the wire"
from "what the application actually does." If you move from REST to GraphQL or CLI,
the services stay the same — only the router layer changes.

### 3. Repository pattern (enterprise)

```
subrouter → service → repository → database
```

Adds an abstraction over the database so you can swap ORMs or databases without touching
business logic. The repository exposes methods like `find_by_id()`, `save()`, `delete()`
and hides whether it's using SQLAlchemy, raw SQL, or an API call.

**Used by:** Java/Spring, C#/.NET, large enterprise codebases.

**Overkill for Python.** SQLAlchemy already IS your repository. Wrapping
`db.execute(select(Gene).where(Gene.id == id))` inside a `GeneRepository.find_by_id(id)`
that does the exact same thing adds a layer with zero value.

### 4. Clean Architecture / DDD (over-engineered for 99% of apps)

```
subrouter → use case → domain entity → repository → database
```

Ports and adapters, dependency inversion, aggregate roots, value objects, domain events.
The domain layer has zero dependencies on any framework — no SQLAlchemy, no FastAPI, no Pydantic.
Everything is abstracted behind interfaces.

**Used by:** large enterprise consulting projects, banking systems, regulated industries
with dedicated architecture teams.

**You'll never need this.** The overhead of maintaining 4+ layers per model is only justified
when you have 50+ developers working on the same codebase and need strict isolation between teams.

### Recommendation

**Pattern 2 (service layer)** when you have business logic.
**Pattern 1 (router-only)** when it's pure CRUD.
Both can coexist in the same app — some subrouters call services, others don't.

---

## CURRENT STATE

```
subrouter (HTTP + logic + DB)
```

Every subrouter handles everything: request parsing, business rules, database queries, response formatting.
This is fine for pure CRUD. It stops being fine when business logic appears.

---

## TARGET STATE

```
subrouter → service → database
```

- **Subrouter**: HTTP concerns only — auth, request parsing, status codes, response format
- **Service**: Business logic — validation rules, compound operations, cross-model coordination
- **Database**: SQLAlchemy queries (stays in service, no separate repository layer needed)

---

## FOLDER STRUCTURE

```
server/apps/nexotype/
├── models.py
├── router.py
├── schemas/
│   ├── gene_schemas.py
│   ├── variant_schemas.py
│   └── ...
├── subrouters/
│   ├── gene_subrouter.py            ← HTTP layer (thin)
│   ├── variant_subrouter.py
│   └── ...
└── services/
    ├── __init__.py
    ├── gene_service.py              ← business logic (only if needed)
    ├── variant_service.py
    └── knowledge_graph_service.py   ← cross-model queries
```

Same pattern applies to assetmanager:

```
server/apps/assetmanager/
├── models/
├── schemas/
├── subrouters/
└── services/
    ├── __init__.py
    ├── captable_service.py          ← cap table computation logic
    ├── transaction_service.py       ← compound transaction patterns
    └── security_service.py
```

---

## FILE NAMING

| Layer | Pattern | Example |
|-------|---------|---------|
| Model | `models.py` or `{domain}_models.py` | `models.py`, `captable_models.py` |
| Schema | `{entity}_schemas.py` | `gene_schemas.py` |
| Subrouter | `{entity}_subrouter.py` | `gene_subrouter.py` |
| Service | `{entity}_service.py` | `gene_service.py` |

Cross-model services that don't map to a single entity:

| File | Purpose |
|------|---------|
| `knowledge_graph_service.py` | Graph traversal queries across Domain 9 models |
| `captable_service.py` | Cap table computation from transactions + securities |
| `pipeline_service.py` | Development pipeline aggregation across assets |

---

## WHAT GOES WHERE

### Subrouter (HTTP layer)
- `Depends(get_current_user)` — authentication
- `Depends(get_session)` — database session
- Request parsing (path params, query params, body)
- Status codes (`raise HTTPException(404)`, `raise HTTPException(409)`)
- Response formatting (`return detail_schema.model_validate(result)`)

### Service (business logic layer)
- Validation rules ("organism must exist before creating a gene")
- Compound operations ("creating a Candidate also creates a default Construct")
- Cross-model queries ("all variants for gene X with their phenotypes")
- Computed fields ("ownership percentage from transactions")
- Side effects ("log activity when asset status changes")

### What stays in subrouter (no service needed)
- Pure CRUD with no business rules
- Simple list/get/create/update/delete that just talks to one table
- No cross-model coordination, no computed fields, no side effects

---

## EXAMPLE: PURE CRUD (NO SERVICE)

gene_subrouter.py stays as-is. No gene_service.py needed.

```python
# gene_subrouter.py — handles everything directly
@router.post("/")
async def create_gene(data: GeneCreate, db: AsyncSession = Depends(get_session)):
    # duplicate check
    # insert
    # return
```

---

## EXAMPLE: WITH SERVICE

```python
# candidate_subrouter.py — thin, HTTP only
from ..services.candidate_service import CandidateService

@router.post("/", status_code=201)
async def create_candidate(
    data: CandidateCreate,
    db: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user)
):
    result = await CandidateService.create(db, data)
    return CandidateDetail.model_validate(result)
```

```python
# candidate_service.py — business logic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from ..models import Candidate, TherapeuticAsset, Construct

class CandidateService:

    @staticmethod
    async def create(db: AsyncSession, data: CandidateCreate) -> Candidate:
        # Rule: referenced TherapeuticAsset must exist
        asset = await db.execute(
            select(TherapeuticAsset).where(TherapeuticAsset.id == data.asset_id)
        )
        if not asset.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="TherapeuticAsset not found")

        # Rule: auto-create default Construct
        candidate = Candidate(**data.model_dump())
        db.add(candidate)
        await db.flush()  # get candidate.id without committing

        default_construct = Construct(
            candidate_id=candidate.id,
            name=f"{candidate.name}_default",
            construct_type="expression_vector"
        )
        db.add(default_construct)

        await db.commit()
        await db.refresh(candidate)
        return candidate
```

---

## WHEN TO CREATE A SERVICE FILE

Create `services/{entity}_service.py` when ANY of these are true:

- Creating entity X must also create/update entity Y
- Deleting entity X requires checking references in other tables
- An endpoint needs data from 2+ tables joined or aggregated
- There's a business rule beyond "does this field already exist"
- An operation has side effects (logging, notifications, cache invalidation)

Do NOT create a service file when:

- The endpoint is pure CRUD on a single table
- The only validation is "check unique field"
- There are no cross-model dependencies

---

## REALISTIC ESTIMATE FOR NEXOTYPE

Out of ~50 models, maybe 5-10 would eventually need service files:

| Service | Why |
|---------|-----|
| `candidate_service.py` | Compound creation (candidate + construct + design mutations) |
| `variant_service.py` | Cross-reference with gene, transcript, protein on create |
| `assay_readout_service.py` | Validation against assay_protocol, computed metrics |
| `knowledge_graph_service.py` | Graph traversal queries across all Domain 9 edge models |
| `user_variant_service.py` | Genomic file parsing, variant calling pipeline |
| `recommendation_service.py` | Computed recommendations from pathway scores + biomarker readings |
| `pipeline_service.py` | Aggregated development pipeline views across assets + indications |

The other ~40 models stay as pure CRUD subrouters with no service file.

---

## SUMMARY

- `services/` directory lives next to `subrouters/` and `schemas/`
- File naming: `{entity}_service.py` or `{domain}_service.py` for cross-model
- Only create service files when there's actual business logic
- Pure CRUD models don't need a service layer
- The subrouter imports the service, the service does the work
- Start with zero service files, add them as rules emerge
