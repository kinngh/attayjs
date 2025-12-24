## Versioning

This repository uses a single shared version for **both** packages:

- `@attay/client`
- `@attay/server`

Versions are managed from the **repo root** using a dedicated script.

### Sync versions (no change)

If versions ever drift, this command aligns both packages to the higher version:

```bash
bun run version
```

### Set an explicit version

Sets the same version for both packages:

```bash
bun run version --set 1.2.3
bun run version --set 1.2.3-beta.1
```

### Bump version

Bumps both packages together:

```bash
bun run version --bump patch
bun run version --bump minor
bun run version --bump major
```

### What gets updated

The script updates:

- `packages/client/package.json`
- `packages/server/package.json`
- root `package.json` (kept in sync, even though it is private)

### Typical release flow

```bash
bun run version --bump patch
bun run publish
```
