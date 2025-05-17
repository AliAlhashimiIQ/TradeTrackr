interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 5000,
    onRetry = () => {}
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === retries) {
        throw lastError;
      }
      
      onRetry(lastError, attempt);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        minTimeout * Math.pow(2, attempt - 1),
        maxTimeout
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}; 