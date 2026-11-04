# Hospital ERP portrait video production

## Current deliverable

`output/video-01-custom-fit-portrait.mp4` is a 35-second, 1080×1920 portrait review cut built from the six supplied recordings. It is intentionally a clean, muted picture edit: narration and licensed music are not embedded yet. The cut uses the verified screen footage, a navy/ivory/teal editorial system and the CTA **“Book a private workflow demonstration.”**

This is a review master, not a claim that the software is production-certified. It avoids unverified lifetime-license, zero-cash-leakage, savings, security or compliance claims.

## Campaign set

The upgraded option-C campaign renders five portrait cuts in `output/`:

- `01-custom-built-portrait.mp4`
- `02-financial-visibility-portrait.mp4`
- `03_connected_departments-portrait.mp4`
- `04_ownership_model-portrait.mp4`
- `05_founding_partner-portrait.mp4`

The Hindi avatar-led 40-second master is also available as `output/hindi-avatar-ad.mp4`. It combines the supplied avatar opening and closing clips with real Hospital Manager dashboard, OPD, pharmacy and billing footage. Hindi Devanagari captions use the installed Nirmala font collection; the caption layout was checked at opening, product and closing frames. Avatar audio is retained, product footage is muted, and the final mix measures approximately -19.5 dB mean / -1.1 dB peak in the rendered file.

These cuts use the Hospital Manager logo, animated slide/fade typography, gentle screen push-ins, a moving teal progress accent and a clean CTA end card. They are designed for mobile-first social delivery without a presenter. The generated copy preserves the approved commercial claims; review those claims against the signed license/support offer before publishing.

## Source files

The renderer references the recordings in `C:/Users/biswa/Videos/hospital video`. Originals are not copied or modified. The current edit uses:

- Dashboard overview: 7–12 seconds
- OPD consultation: 40–46 seconds
- Pharmacy workflow: 12–18 seconds
- Billing visibility: 2–9 seconds
- Hospital settings/print: 24–30 seconds
- Generated CTA end card: 5 seconds

## Rebuild

From the repository root:

```text
python video-production/artwork.py
python video-production/render.py --preview
python video-production/render.py
```

To rebuild the five campaign videos:

```text
python video-production/build_campaign.py
```

The preview is `video-production/work/preview.mp4`. The final is `video-production/output/video-01-custom-fit-portrait.mp4`.

## Final production pass

1. Review the animated picture cuts and approve the visual language.
2. Record or generate an approved professional voiceover using the relevant campaign script in `docs/FIVE-VIDEO-PRODUCTION-BRIEFS.md`.
3. Add licensed music under the voice, ducking it beneath speech.
4. Add timed captions and the approved brand/contact destination.
5. Re-export a clean master and captioned social master; inspect on a phone.
6. Build Videos 2–5 from the same system after the first cut is approved.

## Verification

- Python compilation: passed for `artwork.py` and `render.py`.
- Rendered: six scenes, 35 seconds, 1080×1920 H.264, muted.
- Frame inspection: opening, product footage, transitions and CTA end card checked.
- Note: one unrelated pre-existing working-tree change remains in `app/dashboard/pharmacy/pos/billing/page.tsx`; it was not modified by this video work.
