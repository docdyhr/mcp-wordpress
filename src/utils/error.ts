/**
 * Error handling utilities
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'Unknown error occurred';
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function logAndReturn<T>(error: unknown, defaultValue: T): T {
  console.error('Error occurred:', getErrorMessage(error));
  return defaultValue;
}