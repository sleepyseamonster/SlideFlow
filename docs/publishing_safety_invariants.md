# Publishing Safety Invariants (Do Not Break)

These rules are non-negotiable. Any change that violates them must be rejected.

1) One publish attempt at a time. Manual retry is allowed after a failed attempt (no automatic retries), and only if no platform posted.
2) One destination per attempt. Publish only to the account selected on the Publish page.
3) Server-side duplicate check before any Meta call (carousel status + `posting_log`). If already posted, abort immediately.
4) Fail closed. If anything is uncertain, do not publish again.
5) No automatic retries or recovery flows. Ever.
6) UI must disable re-entry during an attempt or after a successful publish.
7) Every attempt is logged (`posting_log`) with the attempt id and Meta response/error.

Guiding rule: It is always safer to not publish than to publish twice.
