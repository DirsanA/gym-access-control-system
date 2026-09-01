# Member data performance

The demo uses in-memory `Map` indexes in `lib/mock-gym-data.ts`:

- `memberId` → member: used by the entrance scanner for constant-time access checks.
- `phone` → member: reserved for fast duplicate detection and member searches.

For production, store members in a persistent provider and create the equivalent indexes:

```js
db.members.createIndex({ memberId: 1 }, { unique: true })
db.members.createIndex({ phone: 1 }, { unique: true })
db.members.createIndex({ membershipEndDate: 1 })
db.members.createIndex({ fullName: "text", phone: "text" })
db.checkIns.createIndex({ memberId: 1, scannedAt: -1 })
```

`memberId` is the critical scanner index: it makes the QR verification lookup direct rather than a full-table scan.
