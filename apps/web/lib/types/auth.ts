/**
 * Authentication and Provider Credential Types
 *
 * TypeScript interfaces matching the SQLite schema for:
 * - users: Local user accounts
 * - auth_sessions: DB-backed session management
 * - provider_credentials: Encrypted API keys and OAuth tokens
 * - provider_audit_log: Access and modification audit trail
 */

/**
 * Provider authentication type
 */
export const AUTH_TYPES = {
  API: 'api',
  OAUTH: 'oauth',
  WELLKNOWN: 'wellknown',
} as const;

export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];

/**
 * User account record
 */
export interface UserRecord {
  /** Unique user ID (UUID or similar) */
  id: string;
  /** User email address (must be unique) */
  email: string;
  /** bcrypt hashed password */
  passwordHash: string;
  /** ISO 8601 timestamp when user was created */
  createdAt: string;
  /** ISO 8601 timestamp when user was last updated */
  updatedAt: string;
}

/**
 * Authentication session record
 *
 * Sessions are stored in the database with hashed session tokens
 * for validation against cookies in requests.
 */
export interface AuthSessionRecord {
  /** Unique session ID */
  id: string;
  /** User ID this session belongs to */
  userId: string;
  /** SHA-256 hash of the session token (not the token itself) */
  sessionHash: string;
  /** ISO 8601 timestamp when session was created */
  createdAt: string;
  /** ISO 8601 timestamp of last activity (updated on each request) */
  lastSeenAt: string;
  /** ISO 8601 timestamp when session expires */
  expiresAt: string;
}

/**
 * Encrypted provider credential record
 *
 * Stores API keys, OAuth tokens, and other credentials in encrypted form.
 * All sensitive data is encrypted using AES-256-GCM.
 */
export interface ProviderCredentialsRecord {
  /** Unique credential ID */
  id: string;
  /** User ID that owns this credential */
  userId: string;
  /** Provider ID (e.g., 'openai', 'anthropic', 'gemini') */
  providerId: string;
  /** Authentication type for this provider */
  authType: AuthType;
  /** AES-256-GCM encrypted credential data (Buffer) */
  cipherText: Uint8Array;
  /** Random 16-byte IV used for encryption (Buffer) */
  iv: Uint8Array;
  /** 16-byte AEAD authentication tag (Buffer) */
  authTag: Uint8Array;
  /** Key version for future key rotation support */
  keyVersion: number;
  /** Optional metadata as JSON string (baseUrl, region, etc.) */
  metadataJson: string | null;
  /** ISO 8601 timestamp when credential was created */
  createdAt: string;
  /** ISO 8601 timestamp when credential was last updated */
  updatedAt: string;
  /** ISO 8601 timestamp of last successful validation, if any */
  lastValidatedAt: string | null;
}

/**
 * Audit log entry for provider credential access and modifications
 *
 * Logs all actions on provider credentials for security and compliance.
 */
export interface ProviderAuditLogRecord {
  /** Unique audit log ID */
  id: string;
  /** User ID who performed the action */
  userId: string;
  /** Provider ID affected by the action */
  providerId: string;
  /** Action type that was performed */
  action: 'add' | 'update' | 'delete' | 'validate' | 'access';
  /** Client IP address for the request, if available */
  ipAddress: string | null;
  /** User-Agent header from the request, if available */
  userAgent: string | null;
  /** ISO 8601 timestamp when action occurred */
  createdAt: string;
}

/**
 * API request/response types
 */

/** Standard API success response envelope */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Standard API error response envelope */
export interface ApiError {
  success: false;
  error: string;
  code: string;
}

/** Standard API response (either success or error) */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Provider metadata input for API requests */
export interface ProviderMetadataInput {
  /** Base URL for provider (e.g., for self-hosted models) */
  baseUrl: string | null;
  /** Region or deployment zone */
  region: string | null;
}

/** Provider metadata stored in database as JSON */
export interface ProviderMetadata extends ProviderMetadataInput {
  // Additional metadata fields can be added here
}

/**
 * Provider add request payload
 */
export interface ProviderAddRequest {
  /** Provider ID to add */
  providerId: string;
  /** Authentication type for this provider */
  authType: AuthType;
  /** API key for 'api' auth type */
  apiKey: string | null;
  /** OAuth token for 'oauth' auth type */
  oauthToken: string | null;
  /** OAuth refresh token for 'oauth' auth type */
  refreshToken: string | null;
  /** OAuth token expiration timestamp (milliseconds since epoch) */
  expiresAt: number | null;
  /** Optional provider-specific metadata */
  metadata: ProviderMetadataInput | null;
}

/**
 * Provider update request payload
 */
export interface ProviderUpdateRequest {
  /** New API key (optional) */
  apiKey: string | null;
  /** New OAuth token (optional) */
  oauthToken: string | null;
  /** New OAuth refresh token (optional) */
  refreshToken: string | null;
  /** New OAuth token expiration (optional) */
  expiresAt: number | null;
  /** Updated metadata (optional) */
  metadata: ProviderMetadataInput | null;
}

/**
 * Configured provider summary (for API responses)
 */
export interface ConfiguredProvider {
  /** Credential record ID */
  id: string;
  /** Provider ID */
  providerId: string;
  /** Authentication type */
  authType: AuthType;
  /** Masked preview of the credential (e.g., first 6 chars) */
  maskedKeyPreview: string | null;
  /** When the credential was created */
  createdAt: string;
  /** When the credential was last updated */
  updatedAt: string;
  /** When the credential was last successfully validated */
  lastValidatedAt: string | null;
}

/**
 * Provider validation result
 */
export interface ProviderValidateResult {
  /** Whether the credential is valid */
  valid: boolean;
  /** Message describing the validation result */
  message: string;
  /** List of models available with this credential */
  models: string[];
}
