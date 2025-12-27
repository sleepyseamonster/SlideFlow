# SlideFlow AI Credits — Pricing & Cost Model (Working Draft)

Purpose: establish the math + structure for AI credits, so pricing and usage stay predictable as model costs evolve.

---

## 1) Core Rule (Foundation)
- 100 credits = $1.00 USD
- Credits are deducted based on actual provider costs.
- Users only see credits, never raw dollars.

Formula:
- `credits_charged = ceil(provider_cost_usd * 100)`

Rounding rule:
- Always round up to avoid under-collecting.

---

## 2) Credit Buckets (Accounting)
Credits exist in three buckets (all interchangeable at usage time):
- Monthly included credits (subscription)
- Purchased credits (top-ups)
- Bonus / promo credits (optional later)

Rules:
- Monthly credits reset.
- Purchased credits do not expire (unless we later decide otherwise).

---

## 3) Provider Cost Sources (Current Tools)
These are the AI actions we will price against:
- Caption generation (OpenAI 4.1 mini or 4.1 nano)
- Background removal (Bria RMBG 2.0)
- Background replace (Bria)
- Image upscale (SeedVR2)
- Image edit (Nano Banana Pro)

We will map each tool to a credit cost once real provider pricing is finalized.

---

## 4) Usage Pricing Model (Per Action)
We will price each tool in credits based on provider costs.

Action | Provider Cost (USD) | Credits (ceil)
---|---:|---:
Caption generation | TBD | TBD
Background removal | TBD | TBD
Background replace | TBD | TBD
Image upscale | TBD | TBD
Image edit (Nano Banana Pro) | TBD | TBD

Notes:
- Captioning should feel abundant.
- Image operations should feel intentional.
- Nano Banana Pro should feel premium.

---

## 5) Credit Packs (Draft Examples)
We want small incentives for larger packs without confusing users.

Pack Price | Credits Granted | Effective $ / Credit | Bonus
---|---:|---:|---:
$10 | 1,000 | $0.01 | none
$20 | 2,200 | ~$0.0091 | +10%
$50 | 5,750 | ~$0.0087 | +15%
$100 | 12,000 | ~$0.0083 | +20%

These are placeholders and can be adjusted.

---

## 6) Subscription Credits (Draft Anchors)
Placeholder values for planning only:

Plan | Monthly Price | Monthly Credits
---|---:|---:
Free | $0 | 0 (or tiny trial)
Starter | $9 | 900
Creator | $29 | 3,200
Studio | $79 | 9,000

Notes:
- Monthly credits reset.
- Purchased packs do not expire.

---

## 7) UX Rules
- Show a credit warning before running AI tools (upscale/edit).
- On tool execution: reserve credits, run the job, finalize credits.
- If credits are insufficient: block and offer upgrade/top-up.

---

## 8) Ledger Model (Backend)
Each AI action should be logged as a ledger entry:
- `user_id`
- `action_type`
- `provider`
- `provider_cost_usd`
- `credits_charged`
- `created_at`

Ledger is append-only for auditability.

---

## 9) Open Questions (TBD)
- Do unused monthly credits roll over?
- Do subscription credits expire?
- Should Free users get demo credits?
- Should larger plans get pack discounts?
- Should we cap credits per action?

---

## 10) Next Step
Collect actual provider pricing per model and fill in the action cost table.
