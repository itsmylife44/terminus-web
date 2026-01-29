/**
 * Unified Error Types
 *
 * Standardized error response formats for API routes
 */

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function createErrorResponse(
  error: string,
  code?: string,
  details?: unknown
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error,
  };

  if (code) {
    response.code = code;
  }
  if (details) {
    response.details = details;
  }

  return response;
}

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}
