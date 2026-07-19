const BINARY_CHUNK_SIZE = 32_768

/** Service workers cannot create Blob object URLs, so encode export files inline. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BINARY_CHUNK_SIZE))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}
