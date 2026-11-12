# Data schema

Data lives in `src/data/missions.json` (15 records) and `src/data/sites.json`
(14 records). Types are in `src/lib/types.ts`; every record is checked by
`src/lib/validate.test.ts`.

## Shared: `Source`

| Field | Type | Meaning |
|---|---|---|
| `label` | string | Human-readable description of the source |
| `url` | string | Link to the source |
| `accessed` | string (YYYY-MM-DD) | Date the source was consulted |

## `Mission` (`src/data/missions.json`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique slug, e.g. `to2-ab` |
| `name` | string | Mission name, e.g. `Peregrine Mission 1` |
| `taskOrder` | string \| null | CLPS task order, e.g. `TO2-AB` |
| `provider` | string \| null | Vendor; null when unannounced |
| `lander` | string \| null | Lander name |
| `status` | `upcoming` \| `in_flight` \| `completed` \| `partial` \| `failed` \| `cancelled` | |
| `launchDate` / `landingDate` | string (YYYY-MM-DD) \| null | Null when not launched / not landed |
| `launchDatePrecision` / `landingDatePrecision` | `day` \| `month` \| `year` \| null | How precise the date is |
| `landingSite` | `LandingSite` \| null | See below; null when the mission has no site |
| `payloads` | `Payload[]` | 50 entries across all missions (47 distinct names) |
| `payloadCountReported` | number \| null | Count stated by NASA; may differ from `payloads.length` |
| `objective` / `outcomeSummary` / `notes` | string \| null | |
| `sources` | `Source[]` | At least one per record |
| `lastVerified` | string (YYYY-MM-DD) | |

### `LandingSite`

| Field | Type | Notes |
|---|---|---|
| `name` | string \| null | Feature name, e.g. `Sinus Viscositatis` |
| `latitude` / `longitude` | number \| null | Selenographic degrees; null when unverified |
| `region` | string \| null | e.g. `near side`, `south pole` |
| `coordinatesApproximate` | boolean | True — all coordinates are approximate feature centres |

### `Payload`

| Field | Type |
|---|---|
| `name` | string |
| `organization` / `purpose` / `type` | string \| null |

## `SouthPoleSite` (`src/data/sites.json`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique slug, e.g. `sp-faustini-rim-a` |
| `name` | string | Region/feature name |
| `kind` | `artemis-candidate` \| `crater` | 13 candidates + Shackleton crater |
| `latitude` / `longitude` | number \| null | Selenographic degrees, east-positive longitude; null when no citable coordinate exists (11 of 14) |
| `coordinatesApproximate` | boolean | True for all — region/feature centres, never survey-grade |
| `notes` | string \| null | What the region is / why coordinates are null |
| `sources` | `Source[]` | At least one per record |
| `lastVerified` | string (YYYY-MM-DD) | |

## Data-honesty rules (enforced by the tests)

1. Unknown values are `null`, never guessed or interpolated.
2. A coordinate with no citable NASA/USGS source is `null`; such sites are
   excluded from Sun/Earth computation and shown with a "no verified
   coordinates" note.
3. Every record carries at least one source and a `lastVerified` date.
4. Ids are unique within each file.
