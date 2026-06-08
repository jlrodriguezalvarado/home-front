/** Stable positive integer id from backend UUID string. */
export function stableProductId(apiId: string): number {
  let hash = 0;
  for (let i = 0; i < apiId.length; i++) {
    hash = (Math.imul(31, hash) + apiId.charCodeAt(i)) | 0;
  }
  return hash === 0 ? 1 : Math.abs(hash);
}
