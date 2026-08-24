# Project map

Use the smallest canonical source that answers the current task.

| Need | Canonical source | Next allowed read |
|---|---|---|
| Scope and behavior | `specs/requirements.md` | Affected module spec |
| Visual details | `specs/visual-evidence.md` | Individual print only if ambiguity remains |
| Architecture | `specs/architecture.md` | Related ADR |
| Data and ownership | `specs/data-model.md` | Module repository contract |
| Endpoints and events | `specs/api.md` | Specific handler |
| Design | `specs/design-system.md` | Specific component |
| Tests and security | `specs/quality.md` | Relevant test or routine |
| Work order | `TODO.md` | Phase prompt |
| Historical source | `prompt.md.md` | Only when canonical specs do not answer |

## Current implementation boundary

Implementation and local release validation are complete through F8-04. F8-01 awaits the product owner's final legal copy; F8-02 is implemented with a configurable alert webhook; F8-03 awaits external staging evidence; F8-05 awaits production secrets, infrastructure and a deployment destination. Storage supports persistent local disks and shared S3/R2. See `docs/release.md`.