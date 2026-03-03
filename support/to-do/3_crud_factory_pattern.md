# CRUD FACTORY PATTERN — REFERENCE

## PROBLEM

50+ subrouter files, each ~280 lines, all doing the same 5 endpoints (list, get, create, update, delete).
The only differences between files are: model, schemas, tag name, order_by field, unique fields, delete label.

## SOLUTION

A `create_crud_router()` factory function that generates all 5 endpoints from configuration.
Each subrouter file shrinks from ~280 lines to ~15 lines.

Reference implementation: `server/apps/nexotype/support/crud_factory_example.py`

## DECISION

**Not implementing this.** The subrouters are already written and working.
The factory saves lines but adds indirection. For a fixed set of ~50 models it's over-engineering.

The better wins (without a factory) are:
1. Replace manual constructors with `model_validate()` (~100 lines saved per file)
2. Fix HTTP semantics (proper status codes instead of 200-with-error)
3. Wire auth into all endpoints

All three are bulk find-and-replace across existing files. No new abstraction needed.

---

## HOW IT WORKS (for reference)

### Factory Parameters

| Parameter | What it does | Example |
|-----------|-------------|---------|
| `model` | SQLAlchemy model class | `Gene` |
| `create_schema` | Pydantic create schema | `GeneCreate` |
| `update_schema` | Pydantic update schema | `GeneUpdate` |
| `detail_schema` | Pydantic detail schema (must have `from_attributes=True`) | `GeneDetail` |
| `list_response_schema` | Pydantic list response | `GeneListResponse` |
| `single_response_schema` | Pydantic single response | `GeneResponse` |
| `tag` | OpenAPI tag | `"Genes"` |
| `entity_name` | Human-readable name for error messages | `"Gene"` |
| `order_by` | Default ordering field | `"hgnc_symbol"` |
| `unique_fields` | Fields forming unique constraint, or None | `["ensembl_gene_id"]` |
| `delete_label_field` | Field used in delete success message | `"hgnc_symbol"` |

### Unique Field Patterns

```
None                                        → no duplicate check (Transaction)
["ensembl_gene_id"]                         → single field check (Gene)
["asset_id", "indication_id", "agency"]     → composite check (RegulatoryApproval)
```

### Key Trick: model_validate()

Detail schemas already have `model_config = ConfigDict(from_attributes=True)`.

Before (7+ lines per call, 5 calls per file = 35+ lines):
```python
GeneDetail(
    id=g.id,
    organism_id=g.organism_id,
    hgnc_symbol=g.hgnc_symbol,
    ensembl_gene_id=g.ensembl_gene_id,
    chromosome=g.chromosome,
    created_at=g.created_at,
    updated_at=g.updated_at
)
```

After (1 line):
```python
GeneDetail.model_validate(g)
```

This works without the factory. Can be applied to existing subrouters directly.

---

## USAGE EXAMPLES

### Single unique field (Gene)

```python
# gene_subrouter.py — entire file
from ..models import Gene
from ..schemas.gene_schemas import (
    GeneCreate, GeneUpdate, GeneDetail,
    GeneListResponse, GeneResponse
)
from .crud_factory import create_crud_router

router = create_crud_router(
    model=Gene,
    create_schema=GeneCreate,
    update_schema=GeneUpdate,
    detail_schema=GeneDetail,
    list_response_schema=GeneListResponse,
    single_response_schema=GeneResponse,
    tag="Genes",
    entity_name="Gene",
    order_by="hgnc_symbol",
    unique_fields=["ensembl_gene_id"],
    delete_label_field="hgnc_symbol",
)
```

### Composite unique (RegulatoryApproval)

```python
# regulatory_approval_subrouter.py — entire file
from ..models import RegulatoryApproval
from ..schemas.regulatory_approval_schemas import (
    RegulatoryApprovalCreate, RegulatoryApprovalUpdate, RegulatoryApprovalDetail,
    RegulatoryApprovalListResponse, RegulatoryApprovalResponse
)
from .crud_factory import create_crud_router

router = create_crud_router(
    model=RegulatoryApproval,
    create_schema=RegulatoryApprovalCreate,
    update_schema=RegulatoryApprovalUpdate,
    detail_schema=RegulatoryApprovalDetail,
    list_response_schema=RegulatoryApprovalListResponse,
    single_response_schema=RegulatoryApprovalResponse,
    tag="RegulatoryApprovals",
    entity_name="Regulatory approval",
    order_by="approval_date",
    unique_fields=["asset_id", "indication_id", "agency"],
    delete_label_field="id",
)
```

### No unique fields (Transaction)

```python
# transaction_subrouter.py — entire file
from ..models import Transaction
from ..schemas.transaction_schemas import (
    TransactionCreate, TransactionUpdate, TransactionDetail,
    TransactionListResponse, TransactionResponse
)
from .crud_factory import create_crud_router

router = create_crud_router(
    model=Transaction,
    create_schema=TransactionCreate,
    update_schema=TransactionUpdate,
    detail_schema=TransactionDetail,
    list_response_schema=TransactionListResponse,
    single_response_schema=TransactionResponse,
    tag="Transactions",
    entity_name="Transaction",
    order_by="effective_date",
    delete_label_field="id",
)
```

---

## WHERE THE FACTORY FILE WOULD LIVE

```
server/apps/nexotype/
├── subrouters/
│   ├── crud_factory.py              ← the factory function
│   ├── gene_subrouter.py            ← 15 lines (config call)
│   ├── variant_subrouter.py         ← 15 lines (config call)
│   └── ...
```

`router.py` stays unchanged — it still imports `router` from each subrouter file.
