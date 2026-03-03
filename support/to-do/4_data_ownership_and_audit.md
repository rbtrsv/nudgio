# DATA OWNERSHIP, AUDIT TRAIL & SOFT DELETE

## THE PROBLEM

Current models have only `created_at` and `updated_at`. No way to know:
- Who created a record (which user)
- Who owns a record (which organization)
- Whether it's platform-curated or org-specific data
- Whether a record is deleted (hard delete only, no recovery)
- What changes were made and by whom (no history)

---

## ISSUE 1: Which Models Need Ownership Fields?

### Initial (Wrong) Assessment

I initially said Section 1 (OntologyTerm, UnitOfMeasure) and Section 2 (Organism, Gene, Protein, etc.)
don't need ownership because they're "reference biology, one truth."

### Why That's Wrong

If a researcher at org X discovers a new gene or wants to add a custom ontology term, they can't.
They'd have to wait for a platform admin to add it. That blocks users and creates a bottleneck.

With ownership fields:
- Nexotype curates the baseline knowledge graph (`is_curated = TRUE`, `organization_id = NULL`)
- Any org can add their own records (`is_curated = FALSE`, `organization_id = their_org`)
- If org data is good enough, Nexotype can promote it (`is_curated = TRUE`, `organization_id = their_org` — credit preserved)

### Conclusion: ALL Models Get Ownership Fields

No exceptions to remember. One pattern everywhere. Every model across all 10 sections.

The only models where it's somewhat redundant are Section 7-8 (UserProfile, UserVariant,
UserBiomarkerReading, etc.) because they're already user-scoped via `subject_id`. But even these
benefit from `organization_id` for multi-org users. Consistency > special cases.

---

## ISSUE 2: How Many Fields For Data Ownership?

### Two Fields: `is_curated` + `organization_id`

These are two independent dimensions:

| `is_curated` | `organization_id` | Meaning |
|---|---|---|
| `TRUE` | `NULL` | Platform-curated from the start (seeded/imported) |
| `TRUE` | `NULL` + `created_by = 12` | Platform admin user 12 curated it manually |
| `FALSE` | `5` | Org 5's private data |
| `TRUE` | `5` | Org 5 created it, Nexotype promoted it to curated |

### Why Two Fields, Not One

With only `organization_id` (NULL = curated, SET = org):
- Can't promote org data to curated without losing who created it
- NULL means "platform" by implicit convention, not explicit intent

With only `is_curated` boolean:
- Can't tell which org owns the private data

Two fields = two independent concerns (visibility + ownership). Can't be reduced to one.

### Field Definitions

```python
is_curated: Mapped[bool] = mapped_column(Boolean, default=False)
# TRUE = visible to all subscribers (platform-quality data)
# FALSE = visible only to the owning organization

organization_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
# NULL = Nexotype platform created it (no org ownership)
# SET = that organization created/owns it
# Loose coupling to accounts.Organization (not FK, like UserProfile.user_id)
```

### Query Patterns

```python
# Enriched view: all curated + org's own private data
WHERE is_curated = TRUE OR organization_id = :user_org_id

# Org's private data only
WHERE is_curated = FALSE AND organization_id = :user_org_id

# Platform admin: manage curated content
WHERE is_curated = TRUE

# Platform admin: review org data for promotion
WHERE is_curated = FALSE
```

---

## ISSUE 3: Audit Trail — Model Fields vs Audit Log Table

### Two complementary approaches, not either/or

**A) Fields on the model: `created_by`, `updated_by`**

Quick access to current state. "Who created this record?" is one SELECT, no JOIN. Displayed
constantly in UI ("Created by John, Modified by Jane 2h ago").

```python
created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
# User ID who created the record (loose coupling to accounts.User)

updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
# User ID who last modified the record
```

**B) Separate AuditLog model: full change history**

Captures EVERY change with before/after snapshots. Used for compliance, debugging, undo,
"show me everything that happened to this record."

```python
class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    table_name: Mapped[str] = mapped_column(String(50))      # "therapeutic_assets", "genes"
    record_id: Mapped[int] = mapped_column(Integer)           # polymorphic ID
    action: Mapped[str] = mapped_column(String(20))           # "INSERT", "UPDATE", "DELETE"
    old_data: Mapped[dict | None] = mapped_column(JSON)       # snapshot before change
    new_data: Mapped[dict | None] = mapped_column(JSON)       # snapshot after change
    changed_by: Mapped[int | None] = mapped_column(Integer)   # user ID
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

### Why Both

| Need | Model fields | AuditLog table |
|---|---|---|
| "Who created this?" (UI display) | One query, instant | Need to find first INSERT row |
| "Who last modified?" (UI display) | One query, instant | Need to find last UPDATE row |
| "Show full change history" | Can't do this | Exactly what it's for |
| "What was the old value?" | Can't do this | old_data JSONB has it |
| "Undo a change" | Can't do this | Restore from old_data |

Model fields = fast current state. AuditLog = full history. They serve different purposes.

### How AuditLog Gets Populated

Three options:

**Option A: SQLAlchemy event listeners (application-level)**
- `after_insert`, `after_update`, `after_delete` events
- Pros: Automatic, can't forget to log
- Cons: Passing user context through ORM session is awkward, bypassed if someone queries DB directly

**Option B: PostgreSQL triggers (database-level)**
- Trigger functions on INSERT/UPDATE/DELETE
- Pros: Can't be bypassed, works even with direct SQL
- Cons: Harder to capture user ID (need to set session variable), hidden logic in DB

**Option C: Explicit helper function in subrouters (RECOMMENDED)**

Same architecture as the rest of the codebase — explicit function call in the subrouter
after each CRUD operation. No event listeners. No database triggers. No hidden magic.

```python
# server/apps/nexotype/utils/audit_utils.py

async def log_audit(
    session: AsyncSession,
    table_name: str,
    record_id: int,
    action: str,
    old_data: dict | None = None,
    new_data: dict | None = None,
    user_id: int | None = None
):
    """
    Log a change to the audit log.
    Called explicitly in subrouter endpoints after CRUD operations.

    Args:
        session: Database session
        table_name: Name of the table being modified (e.g., "therapeutic_assets")
        record_id: ID of the record being modified
        action: "INSERT", "UPDATE", or "DELETE"
        old_data: Snapshot of record before change (None for INSERT)
        new_data: Snapshot of record after change (None for DELETE)
        user_id: ID of the user making the change
    """
    entry = AuditLog(
        table_name=table_name,
        record_id=record_id,
        action=action,
        old_data=old_data,
        new_data=new_data,
        changed_by=user_id
    )
    session.add(entry)
```

### Usage in Subrouters

```python
# CREATE — log after insert
@router.post("/")
async def create_asset(
    data: CreateAssetSchema,
    db: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user)
):
    new_asset = TherapeuticAsset(**data.dict(), created_by=user.id)
    db.add(new_asset)
    await db.flush()  # get the ID

    await log_audit(db, "therapeutic_assets", new_asset.id, "INSERT",
                    new_data=data.dict(), user_id=user.id)
    await db.commit()
    return new_asset


# UPDATE — log old and new state
@router.put("/{id}")
async def update_asset(
    id: int,
    data: UpdateAssetSchema,
    db: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user)
):
    asset = await db.get(TherapeuticAsset, id)
    old_data = {"name": asset.name, "uid": asset.uid, ...}  # snapshot before

    # Apply changes
    for key, value in data.dict(exclude_unset=True).items():
        setattr(asset, key, value)
    asset.updated_by = user.id

    await log_audit(db, "therapeutic_assets", id, "UPDATE",
                    old_data=old_data, new_data=data.dict(exclude_unset=True),
                    user_id=user.id)
    await db.commit()
    return asset


# DELETE — log soft delete
@router.delete("/{id}")
async def delete_asset(
    id: int,
    db: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user)
):
    asset = await db.get(TherapeuticAsset, id)
    old_data = {"name": asset.name, "uid": asset.uid, ...}  # snapshot

    # Soft delete
    asset.deleted_at = func.now()
    asset.deleted_by = user.id

    await log_audit(db, "therapeutic_assets", id, "DELETE",
                    old_data=old_data, user_id=user.id)
    await db.commit()
```

Why Option C: Matches existing subrouter patterns, user context (`user.id`) is right there
in the endpoint, explicit and readable. Only downside: must remember to call `log_audit()`
in every endpoint (discipline).

---

## ISSUE 4: Soft Delete — `deleted_at` + `deleted_by`

### Why Soft Delete

Hard delete = data gone forever. No recovery. If someone accidentally deletes a therapeutic asset
with years of linked data, it's lost.

Soft delete = mark as deleted, filter out by default, can recover.

### Fields

```python
deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
# NULL = active record
# SET = soft-deleted (timestamp records when)

deleted_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
# User ID who deleted the record
```

### Why `deleted_at` Timestamp Instead of `is_deleted` Boolean

- `deleted_at` gives you BOTH the flag (NULL vs SET) AND when it was deleted
- One field, two pieces of information
- `is_deleted = TRUE` tells you nothing about when

### Query Pattern

Every default query adds:
```python
WHERE deleted_at IS NULL
```

Admin recovery query:
```python
WHERE deleted_at IS NOT NULL
```

---

## ISSUE 5: Naming Conflict — `organization_id` in Existing Models

### Current Problem

Three models already use `organization_id` as FK to `market_organizations`:
- `PatentAssignee.organization_id` → FK to `market_organizations.id`
- `AssetOwnership.organization_id` → FK to `market_organizations.id`
- `OrganizationTechnologyPlatform.organization_id` → FK to `market_organizations.id`

`market_organizations` = biotech companies in the knowledge graph (Pfizer, Moderna).
`accounts.organizations` = SaaS subscriber tenants (the orgs paying for Nexotype).

These are completely different concepts sharing the same field name.

### Fix

Rename the existing fields to `market_organization_id`:
- `PatentAssignee.market_organization_id`
- `AssetOwnership.market_organization_id`
- `OrganizationTechnologyPlatform.market_organization_id`

Then `organization_id` is unambiguous = accounts subscriber org.

This requires a migration (rename column).

---

## ISSUE 6: Implementation — Mixin Approach

### File: `mixin_models.py`

Three options for structuring the mixins:

### Option A: Four Separate Mixins

Maximum granularity. Each concern is its own class.

```python
# server/apps/nexotype/models/mixin_models.py

class TimestampMixin:
    """created_at, updated_at — every model gets this"""
    created_at = ...
    updated_at = ...

class SoftDeleteMixin:
    """deleted_at, deleted_by — every model gets this"""
    deleted_at = ...
    deleted_by = ...

class AuditMixin:
    """created_by, updated_by — every model gets this"""
    created_by = ...
    updated_by = ...

class OwnableMixin:
    """is_curated, organization_id — models that support multi-tenant data"""
    is_curated = ...
    organization_id = ...
```

```python
class TherapeuticAsset(Base, TimestampMixin, SoftDeleteMixin, AuditMixin, OwnableMixin):
    ...
```

Pro: Maximum flexibility, mix and match per model.
Con: Verbose inheritance line on every model.

### Option B: BaseMixin + OwnableMixin (RECOMMENDED)

Two mixins. `BaseMixin` combines timestamps + soft delete + user audit (every model gets this).
`OwnableMixin` stays separate for data ownership (most models get this, but not infrastructure
models like AuditLog).

```python
# server/apps/nexotype/models/mixin_models.py

class BaseMixin:
    """Every model inherits this — timestamps, soft delete, user audit"""

    # Timestamps
    created_at = ...
    updated_at = ...

    # Soft delete
    deleted_at = ...
    deleted_by = ...

    # User audit
    created_by = ...
    updated_by = ...

class OwnableMixin:
    """Data ownership — curated vs organization-specific"""

    is_curated = ...
    organization_id = ...
```

```python
# Every domain model — both mixins
class Gene(Base, BaseMixin, OwnableMixin):
    ...

class TherapeuticAsset(Base, BaseMixin, OwnableMixin):
    ...

# Infrastructure models — only BaseMixin
class AuditLog(Base, BaseMixin):
    ...
```

Pro: Clean separation — ownership is optional, everything else is universal.
Con: Two imports instead of one.

### Option C: One Combined NexotypeBaseMixin

Everything in one class. ALL models get ALL fields.

```python
class NexotypeBaseMixin:
    """Every nexotype model inherits this"""
    # Timestamps
    created_at = ...
    updated_at = ...

    # Soft delete
    deleted_at = ...
    deleted_by = ...

    # User audit
    created_by = ...
    updated_by = ...

    # Data ownership
    is_curated = ...
    organization_id = ...
```

```python
class Gene(Base, NexotypeBaseMixin):
    ...

class AuditLog(Base, NexotypeBaseMixin):
    ...
```

Pro: Simplest — one import, one inheritance, no decisions per model.
Con: AuditLog and other infrastructure models get `is_curated`/`organization_id` fields they
don't need. No flexibility to exclude ownership from specific models.

### Current State → Migration

Every model currently defines `created_at` and `updated_at` individually. Migration steps:
1. Create `mixin_models.py` with chosen mixin structure
2. Remove individual `created_at`/`updated_at` from each model
3. Add mixin inheritance to each model
4. Run alembic migration for the NEW fields (deleted_at, deleted_by, created_by, updated_by, is_curated, organization_id)
5. Rename `organization_id` → `market_organization_id` in PatentAssignee, AssetOwnership, OrganizationTechnologyPlatform

---

## ISSUE 7: Separate AuditLog Model

### Where Does It Live?

Two options:

**A) In accounts app** — since it tracks user actions across all apps
- `server/apps/accounts/models.py` — add AuditLog model
- Pro: Audit is an account/user concern, not domain-specific
- Con: References nexotype tables but lives in accounts

**B) In nexotype app** — since it tracks nexotype data changes
- `server/apps/nexotype/models/audit_models.py` or in `models.py`
- Pro: Keeps nexotype self-contained
- Con: If other apps need audit, they'd duplicate it

**C) In core** — shared infrastructure
- `core/models/audit.py`
- Pro: Available to all apps
- Con: Core is usually just config/db, not models

Recommendation: Accounts app or core. Audit is cross-cutting, not domain-specific.

---

## SUMMARY: Complete Field Set Per Model

After all changes, every nexotype model will have these fields:

```
id                  # primary key (already exists)
[domain fields]     # model-specific fields (already exist)

# From TimestampMixin (already exist, move to mixin)
created_at          # when created
updated_at          # when modified

# From SoftDeleteMixin (NEW)
deleted_at          # soft delete timestamp, NULL = active
deleted_by          # user ID who deleted

# From AuditMixin (NEW)
created_by          # user ID who created
updated_by          # user ID who last modified

# From OwnableMixin (NEW)
is_curated          # boolean, default FALSE — visibility flag
organization_id     # nullable integer — which subscriber org owns it
```

Plus one new standalone model: `AuditLog` for full change history.

---

## EXECUTION ORDER

1. Create `mixin_models.py` with mixin classes
2. Create `AuditLog` model
3. Rename `organization_id` → `market_organization_id` in 3 existing models
4. Refactor all models to use mixins (remove individual created_at/updated_at, add mixin inheritance)
5. Generate and run alembic migration
6. Create `nexotype/utils/audit_utils.py` with `log_audit()` helper function
7. Update subrouters to pass user context (created_by, updated_by) on create/update
8. Update subrouters to use soft delete (filter WHERE deleted_at IS NULL)
9. Update subrouters to filter by data ownership (is_curated + organization_id)
10. Create `nexotype/utils/dependency_utils.py` for permission dependencies
11. Create `nexotype/utils/filtering_utils.py` for data layer query scoping

---

## OPEN QUESTIONS

1. Should `organization_id` be a proper FK to `accounts.organizations` or loose integer coupling
   (like `UserProfile.user_id`)? FK is safer but creates cross-app dependency.
2. Mixin structure: Option A (four mixins), Option B (BaseMixin + OwnableMixin), or Option C (one combined)?
3. AuditLog in accounts, core, or nexotype?
4. Should the AuditLog also live in accounts for the accounts models (User, Organization, etc.)?
