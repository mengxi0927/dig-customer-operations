# Workbench visual QA

final result: passed

Scope: blue adaptation of the supplied DIG dashboard, not a pixel-identical green clone. This pass covers the workbench only; it is not acceptance of the full PRD or legacy backend.

## Evidence and comparison

Opened both the user reference JPEG and rendered desktop screenshot together in one tool result. Reference is 1424 × 1416; the implementation was captured at a 1424 × 1416 CSS viewport with full-page capture. Full-page output is taller because it includes all six tasks, customer search, data disclosure and two support sections. Compare matching card regions rather than total page heights. Final evidence: ../../docs/design/workbench-blue.png. Browser also inspected at 1280 × 1000. Temporary viewport override reset after inspection.

## Required surfaces

- Typography: Chinese system font, restrained title, 13px section headings and compact metadata. Hierarchy matches the reference. P3: metadata remains intentionally small, consistent with source.
- Spacing: fixed 222px sidebar; four summary cards; left-heavy two-column grid; aligned lower cards. Six task rows versus five visible in the reference is intentional so the headline count and list agree. No observed overlapping card content at the two desktop widths.
- Colors: navy navigation, pale blue selection and recommendation card, cool white canvas; muted blue bars. This is the explicitly requested deviation from green.
- Images and icons: no photographic assets in the reference. Existing Lucide icons used; no synthetic chart history invented. Letter avatars remain editable interface labels.
- Content: demo label, financial unavailable state, recommendation score caveat, source date and risk acceptance wording visible. Value remains unknown rather than invented financial scoring.

## Interaction evidence

- My customers changes customers to 1, pipeline to 127, recommendations to 1 and pending tasks to 2; team restores the sample scope.
- Risk task result submission moves it to submitted with 待验收, retains entered result and reduces actionable pending count.
- Accept recommendation requires next action, owner and deadline, creates a linked task and changes pending recommendations from 2 to 1. Repeat action disabled for handled recommendation.
- Evidence expands into prerequisites and missing-data disclosure.
- Browser error log empty during these workbench tests.

## Repairs

Code review found the existing /customers route redirected to the homepage. Restored the original cockpit there so customer navigation remains useful. Fixed filtered account modal indexing and removed a static recommendation sidebar count that could disagree with current state. Recaptured the revised implementation; no remaining actionable P0/P1/P2 visual issues within this scope.

## Limits

No live backend integration was tested. Narrow-screen CSS exists but mobile visual QA was not performed. Full permissions, persistence, recommendation conversion, approval workflows and financial integration remain outside this prototype. Legacy pages retain existing behavior.
