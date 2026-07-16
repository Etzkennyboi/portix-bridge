/**
 * Approval State Memory
 * Prevents repeated approval transactions
 * 
 * In production, replace with Redis for multi-instance deployments
 */

class ApprovalCache {
  constructor() {
    // Structure: { [address]: { [token]: { [spender]: timestamp } } }
    this.cache = new Map();
    this.TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  }
  
  /**
   * Check if approval exists and is not expired
   */
  hasApproval(owner, token, spender) {
    const ownerCache = this.cache.get(owner.toLowerCase());
    if (!ownerCache) return false;
    
    const tokenCache = ownerCache[token.toLowerCase()];
    if (!tokenCache) return false;
    
    const timestamp = tokenCache[spender.toLowerCase()];
    if (!timestamp) return false;
    
    // Check TTL
    if (Date.now() - timestamp > this.TTL_MS) {
      delete tokenCache[spender.toLowerCase()];
      return false;
    }
    
    return true;
  }
  
  /**
   * Store approval with timestamp
   */
  setApproval(owner, token, spender) {
    const ownerLower = owner.toLowerCase();
    const tokenLower = token.toLowerCase();
    const spenderLower = spender.toLowerCase();

    if (!this.cache.has(ownerLower)) {
      this.cache.set(ownerLower, {});
    }
    const ownerCache = this.cache.get(ownerLower);
    
    if (!ownerCache[tokenLower]) {
      ownerCache[tokenLower] = {};
    }
    
    ownerCache[tokenLower][spenderLower] = Date.now();
  }
  
  /**
   * Invalidate approval (e.g., after token transfer out)
   */
  invalidateApproval(owner, token, spender) {
    const ownerCache = this.cache.get(owner.toLowerCase());
    if (!ownerCache) return;
    
    const tokenCache = ownerCache[token.toLowerCase()];
    if (!tokenCache) return;
    
    delete tokenCache[spender.toLowerCase()];
  }
  
  /**
   * Clear expired entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [owner, ownerCache] of this.cache.entries()) {
      for (const [token, tokenCache] of Object.entries(ownerCache)) {
        for (const [spender, timestamp] of Object.entries(tokenCache)) {
          if (now - timestamp > this.TTL_MS) {
            delete tokenCache[spender];
          }
        }
        if (Object.keys(tokenCache).length === 0) {
          delete ownerCache[token];
        }
      }
      if (Object.keys(ownerCache).length === 0) {
        this.cache.delete(owner);
      }
    }
  }
}

// Singleton instance
module.exports = new ApprovalCache();
