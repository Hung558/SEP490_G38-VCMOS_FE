# Journey sharing and pending checkout filters

Date: 2026-11-25

## What happened

Community journey sharing existed in the pet profile but was not discoverable from the journey view. The pending checkout tab had no appointment-date filters, unlike the issued invoice tab.

## Decision

Reuse the existing owner-only preview/selection/share contract and moderation flow. Add day/week/month/custom filters using Vietnam business dates. Do not date-filter the unpaid invoice join: bills may predate their appointments. Preserve staff read-only permissions and abort stale requests.

## Verification

Six journey, four pending checkout and eleven invoice browser cases passed using intercepted APIs and fictional data only. Lint, production build and 385 unit tests passed; one existing unit skip remains. Screenshots inspected locally.

## Delivery and limitations

Push to the existing PR #58; merge remains subject to required review. No BE code or real customer/payment records changed. AgentKit CLI was unavailable, so this local journal was written directly. AgentWiki publish skipped.
