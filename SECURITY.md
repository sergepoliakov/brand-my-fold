# Security policy

Please use GitHub's private vulnerability reporting for security issues. Do not open a public issue containing wallet data, bidder data, transaction identifiers, secrets or an unpatched exploit.

## Production invariants

- No private key or signing seed is stored by the frontend, Worker, D1, R2 or repository.
- Real bids become leading only after an exact on-chain transfer is verified and atomically committed.
- Each transaction identifier can be used once.
- Artwork remains private until an authenticated moderation decision approves it.
- Outbid, rejected and expired paid bids enter an auditable refund queue.
- Production writes require same-origin requests and a valid Turnstile challenge.

The public demo is not a payment service and must keep `PAYMENTS_LIVE=false`.
