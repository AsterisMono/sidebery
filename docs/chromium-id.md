# Pinned Chromium extension ID

The self-distributed Chromium build uses this pinned extension ID:

`dcmmcmgcedhnmcabgkkbfdnjiebgafoa`

The manifest's public `key` is derived from the distribution private key with:

```sh
openssl genrsa -out chromium-dist.pem 2048
openssl rsa -in chromium-dist.pem -pubout -outform DER | openssl base64 -A
```

The extension ID is the first 16 bytes of the SHA-256 digest of that DER public key,
with each hexadecimal digit mapped from `0`–`f` to `a`–`p`.

`chromium-dist.pem` is ignored and must never be committed. Maintainers should keep the
private key in their own encrypted secret storage and only restore it locally when a
package must retain this identity.
