# SheetJS CE

Original, unmodified `xlsx` 0.20.3 distribution from
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz.

Vendored so installs do not require the upstream CDN. Apache-2.0 license is included.

Integrity: `sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`

For upgrades, verify the publisher archive and license, replace the tarball, update both workspace dependencies and regenerate package-lock.json. Run spreadsheet and upload tests before merging.

The original archive is stored as ordered base64 parts to support size-limited transports. Before installing dependencies, run `node scripts/prepare-vendor.cjs` from the repository root. This reconstructs the exact archive and verifies the SHA-512 above; CI and Docker run it automatically. The generated tgz is ignored by Git.
