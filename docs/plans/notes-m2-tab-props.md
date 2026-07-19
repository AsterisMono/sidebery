# M2 Chromium tab-property audit

- `attention`, `sharingState`, and `isArticle` have no runtime reads under `src/`; they
  only appear as optional fields in the foreground tab mock.
- `successorTabId` is read as an optional value before warmup and compared as an
  optional value while choosing a discard successor. Assigning the missing property
  to Sidebery's in-memory tab object is safe.
- Calls associated with successor selection use the Chromium shim's no-op
  `tabs.moveInSuccession`, so the absent native property does not lead to an absent-API
  call.

No runtime patch is required for these optional properties.
