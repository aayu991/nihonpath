# Task 11 sandbox setup and merchant checklist

The owner has no merchant credentials yet. Leave `BILLING_MODE=disabled`. The application is usable and the checkout shows its unavailable state. No key is required to browse pricing or run mocked/in-memory tests.

## Staging activation

1. Back up and inspect Supabase migration history. Apply only missing versions in order, including `supabase/migrations/202610260001_multi_gateway_billing.sql`. Do not apply with the publishable client key. Use a staging project first.
2. Obtain independent test merchant accounts. Configure server-only variables in `.env.local` from `.env.example`: `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_WEBHOOK_SECRET`, `ESEWA_TEST_PRODUCT_CODE`, `ESEWA_TEST_SECRET`, `KHALTI_SANDBOX_SECRET`. Set `NEXT_PUBLIC_SITE_URL` to the exact canonical origin (localhost for local testing or your HTTPS staging origin), then `BILLING_MODE=test`. Never place payment secrets under `NEXT_PUBLIC_`. Never paste them into chat or commit them. The application rejects live Stripe keys and all non-test billing modes.
3. Review product scope, test amounts, taxes and price versions with the owner. Enable only reviewed test providers/products/prices through privileged SQL administration. No default price rows are inserted. Insert immutable new regional price rows for new versions rather than editing a price after purchase. For a sandbox fixture use the pattern below, replacing all values with owner-approved test configuration; do not copy fixture amounts into production marketing:

```sql
-- Staging/test configuration only. No live mode exists.
update public.payment_providers set enabled=true where code='esewa';
update public.billing_products set enabled=true where code='premium';
insert into public.regional_prices(product,provider,country,currency,amount_minor,tax_minor,tax_label,kind,days,enabled)
values('premium','esewa','NP','NPR',10000,0,'Sandbox: no tax calculation', 'pass',30,true);
-- For Stripe, use provider=stripe, country='*' or an approved country,
-- currency='USD'/'JPY'/'NPR', kind='subscription', days=NULL,
-- interval='month'/'year'. For Khalti use NP/NPR/pass and >=1000 paisa.
```

4. Stripe webhook endpoint: `/api/billing/webhook/stripe`. Configure test-mode `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Use Stripe CLI forwarding for localhost and its corresponding signing secret. Confirm the test account/webhook API schema includes invoice `parent.subscription_details` and invoice-line periods. No webhook body or event type is trusted without its signature.
5. Configure Stripe's test billing portal for cancellation and payment-method management. Keep price/product switching, discounts and proration disabled until a matching reviewed fulfillment policy exists. Use actual test provider user flows; do not create fake merchant verification or treat sandbox acceptance as KYC approval.
6. Sign in as learner A and run eSewa and Khalti 30/365-day pass purchases in NP/NPR. Check exact amount/tax, provider-return verification, duplicate/delayed return handling, manual verify, stacking and expiry. A failed/cancelled transaction must never create an entitlement.
7. As a separate international learner, run a Stripe test subscription and test-clock renewal. Check paid invoice periods, failed invoices, portal cancellation and deletion events. Verify refund/dispute handling, future renewal cancellation and no stale-event restoration. Inspect backend rows, not only the provider return screen.
8. Test another learner and an organization owner/teacher cannot read or change the purchaser's orders, entitlements or billing records. Confirm independently authorized admin report access. Test malicious amount/user/country/provider/idempotency inputs, missing/invalid/stale webhook signatures, repeated events and simultaneous payment callbacks against separate hosted connections.
9. Protect reviewed **database** content deliberately, for example a real lesson through `premium_requirements('lessons', actual_lesson_id, 'jlpt')`. Supported resource roots are lessons, flashcard_decks, question_banks, exam_templates and ai_scenarios. Check children/RPC paths, anonymous denial, paid access, reversal/expiration denial, and all free-content regression flows. Do not put bundled free demonstration material behind a promise of exclusivity. Organization plans, paid tutor bookings and metered AI extras are not sold.
10. For settlement reporting, a privileged database operator can insert a verified `provider_settlement_records` row with statement reference, source, reviewer, currency, exact gross/refunds/fees/net and status. Verify `net=gross-refunds-fees`; never mark a statement reconciled without matching evidence. Automatic statement import is not provided.

## Local commands

```powershell
cd <project-root>
node node_modules/next/dist/bin/next dev
# Browse http://localhost:3000/en/pricing
```

For production preview stop development, build, then start:

```powershell
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start --port 3000
```

## Required before any live launch (live support is currently locked off)

- Confirm the operating entity's actual country, merchant eligibility, business registration, KYC and provider/currency restrictions. A learner's selected country or IP does not establish merchant eligibility.
- Establish bank/settlement arrangements, fees, chargeback ownership, reserve handling and documented provider-specific refund capabilities.
- Approve legal refund/cancellation terms, tax treatment, consumer disclosures, invoice requirements, financial retention and account-deletion behavior with qualified reviewers.
- Separate test/live environments and secrets; review API versions, return origins, signing secrets, access control, rate limits, monitoring, replay/reconciliation tooling, backups and alerts.
- Configure periodic wallet status reconciliation, email reminders if desired, robust ambiguous-initiation recovery and hosted multi-connection race tests. Verify signed webhooks and reconciliation for refunds that occur without a customer revisiting.
- Complete real sandbox success/failure/cancellation/duplicate/delayed/refund/renewal acceptance and native-speaker localization review.
- Obtain explicit owner approval for a separately reviewed live-mode implementation. Do not merely change an environment flag: this implementation intentionally has no live endpoints/mode. No tutor payouts or wallet auto-renewal may be enabled by assumption.
