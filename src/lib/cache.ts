/**
 * In-Memory Cache Utility
 * 
 * Provides high-performance caching for influence graph queries.
 * Uses TTL (Time-To-Live) for automatic cache invalidation.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class InfluenceCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache with TTL
   */
  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0
    };
  }

  /**
   * Get or set a value with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy the cache instance
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
export const influenceCache = new InfluenceCache();

// Cache key generators
export const CacheKeys = {
  // Graph data
  graph: (orgId: string) => `graph:${orgId}`,
  graphEdges: (orgId: string) => `graph:edges:${orgId}`,
  graphNodes: (orgId: string) => `graph:nodes:${orgId}`,
  
  // Influence scores
  influenceScore: (userId: string) => `score:${userId}`,
  influenceScores: (orgId: string) => `scores:${orgId}`,
  topInfluencers: (orgId: string, metric: string) => `top:${orgId}:${metric}`,
  
  // Analytics
  departmentMatrix: (orgId: string) => `matrix:${orgId}`,
  analytics: (orgId: string) => `analytics:${orgId}`,
  graphMetrics: (orgId: string) => `metrics:${orgId}`,
  
  // Propagation
  propagationResult: (orgId: string, userId: string) => `prop:${orgId}:${userId}`,
  
  // Time-based
  historicalData: (orgId: string, date: string) => `history:${orgId}:${date}`,
};

// Decorator for caching function results
export function cached(keyGenerator: (...args: unknown[]) => string, ttlMs: number = 300000) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const key = keyGenerator(...args);
      const cached = influenceCache.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      influenceCache.set(key, result, ttlMs);
      return result;
    };
    
    return descriptor;
  };
}

export default influenceCache;
