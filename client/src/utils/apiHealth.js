// API Health Management Utilities
// Prevents server overload through rate limiting, debouncing, and request management

class APIHealthManager {
  constructor() {
    this.requestQueue = new Map();
    this.activeRequests = new Map();
    this.rateLimits = new Map();
    this.retryAttempts = new Map();
    this.duplicateRequests = new Map(); // Track duplicate requests
    this.navigationThrottle = new Map(); // Track navigation requests
    this.maxConcurrentRequests = 5;
    this.requestTimeout = 30000; // 30 seconds
    this.retryDelay = 1000; // 1 second base delay
    this.maxRetries = 3;
    this.navigationCooldown = 500; // 500ms cooldown between navigation requests
  }

  // Debounce function to prevent rapid API calls
  debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Throttle function to limit request frequency
  throttle(func, limit = 1000) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Check if we can make a new request
  canMakeRequest(endpoint, isNavigation = false) {
    const now = Date.now();
    const endpointKey = this.getEndpointKey(endpoint);
    
    // Check navigation throttling
    if (isNavigation) {
      if (this.navigationThrottle.has(endpointKey)) {
        const lastRequest = this.navigationThrottle.get(endpointKey);
        if (now - lastRequest < this.navigationCooldown) {
          return false;
        }
      }
    }
    
    // Check for duplicate requests (same URL and method)
    const requestKey = `${endpoint}-${now}`;
    if (this.duplicateRequests.has(endpoint)) {
      const lastDuplicate = this.duplicateRequests.get(endpoint);
      if (now - lastDuplicate < 100) { // 100ms duplicate prevention
        return false;
      }
    }
    
    // Check rate limit
    if (this.rateLimits.has(endpointKey)) {
      const { count, resetTime } = this.rateLimits.get(endpointKey);
      if (now < resetTime && count >= 10) { // Max 10 requests per minute
        return false;
      }
    }

    // Check concurrent requests
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      return false;
    }

    return true;
  }

  // Get endpoint key for rate limiting
  getEndpointKey(endpoint) {
    const url = new URL(endpoint, window.location.origin);
    return `${url.pathname}`;
  }

  // Update rate limit tracking
  updateRateLimit(endpoint) {
    const endpointKey = this.getEndpointKey(endpoint);
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    
    if (!this.rateLimits.has(endpointKey)) {
      this.rateLimits.set(endpointKey, { count: 1, resetTime: (minute + 1) * 60000 });
    } else {
      const limit = this.rateLimits.get(endpointKey);
      if (limit.resetTime <= now) {
        limit.count = 1;
        limit.resetTime = (minute + 1) * 60000;
      } else {
        limit.count++;
      }
    }
  }

  // Make API request with health management
  async makeRequest(url, options = {}) {
    const requestId = `${url}-${Date.now()}-${Math.random()}`;
    const isNavigation = options.isNavigation || false;
    
    // Check if we can make the request
    if (!this.canMakeRequest(url, isNavigation)) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    // Track navigation requests
    if (isNavigation) {
      const endpointKey = this.getEndpointKey(url);
      this.navigationThrottle.set(endpointKey, Date.now());
    }

    // Track duplicate requests
    this.duplicateRequests.set(url, Date.now());

    // Add to active requests
    this.activeRequests.set(requestId, { url, startTime: Date.now() });
    this.updateRateLimit(url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  // Retry mechanism with exponential backoff
  async retryRequest(url, options = {}, attempt = 1) {
    const retryKey = `${url}-${JSON.stringify(options)}`;
    
    try {
      return await this.makeRequest(url, options);
    } catch (error) {
      if (attempt >= this.maxRetries) {
        this.retryAttempts.delete(retryKey);
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      
      this.retryAttempts.set(retryKey, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(url, options, attempt + 1);
    }
  }

  // Queue request if server is overloaded
  async queueRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const queueKey = `${url}-${Date.now()}`;
      
      this.requestQueue.set(queueKey, {
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Process queue
      this.processQueue();
    });
  }

  // Process queued requests
  async processQueue() {
    if (this.requestQueue.size === 0 || this.activeRequests.size >= this.maxConcurrentRequests) {
      return;
    }

    const [queueKey, request] = this.requestQueue.entries().next().value;
    this.requestQueue.delete(queueKey);

    try {
      const response = await this.makeRequest(request.url, request.options);
      request.resolve(response);
    } catch (error) {
      request.reject(error);
    }

    // Continue processing queue
    setTimeout(() => this.processQueue(), 100);
  }

  // Get API health status
  getHealthStatus() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.size,
      rateLimits: Object.fromEntries(this.rateLimits),
      canMakeRequest: this.activeRequests.size < this.maxConcurrentRequests
    };
  }

  // Clear old rate limit data
  cleanup() {
    const now = Date.now();
    for (const [key, limit] of this.rateLimits.entries()) {
      if (limit.resetTime <= now) {
        this.rateLimits.delete(key);
      }
    }
    
    // Cleanup old navigation throttle data
    for (const [key, timestamp] of this.navigationThrottle.entries()) {
      if (now - timestamp > this.navigationCooldown * 2) {
        this.navigationThrottle.delete(key);
      }
    }
    
    // Cleanup old duplicate request data
    for (const [key, timestamp] of this.duplicateRequests.entries()) {
      if (now - timestamp > 1000) { // Keep for 1 second
        this.duplicateRequests.delete(key);
      }
    }
  }
}

// Create global instance
export const apiHealth = new APIHealthManager();

// Cleanup every 5 minutes
setInterval(() => apiHealth.cleanup(), 5 * 60 * 1000);

// Enhanced fetch with health management
export const healthyFetch = async (url, options = {}) => {
  try {
    const response = await apiHealth.retryRequest(url, options);
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Navigation-specific fetch with throttling
export const navigationFetch = async (url, options = {}) => {
  try {
    const response = await apiHealth.retryRequest(url, { ...options, isNavigation: true });
    return response;
  } catch (error) {
    console.error('Navigation request failed:', error);
    throw error;
  }
};

// Debounced fetch for search/filter operations
export const debouncedFetch = (func, delay = 300) => {
  return apiHealth.debounce(func, delay);
};

// Throttled fetch for scroll/input events
export const throttledFetch = (func, limit = 1000) => {
  return apiHealth.throttle(func, limit);
};

// Request cancellation utility
export class RequestCanceller {
  constructor() {
    this.controllers = new Map();
  }

  cancel(key) {
    if (this.controllers.has(key)) {
      this.controllers.get(key).abort();
      this.controllers.delete(key);
    }
  }

  createController(key) {
    this.cancel(key); // Cancel any existing request
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  cleanup() {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }
}

export default apiHealth;
