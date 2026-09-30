import { IntegrationError } from './contracts';

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IntegrationError('invalid', 'Provider response did not match the expected format.');
  }
  return value as Record<string, unknown>;
}

export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new IntegrationError('invalid', 'Provider response is missing a list of records.');
  }
  return value;
}

export function str(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new IntegrationError('invalid', 'Provider record is missing a required value.');
  }
  return String(value);
}

export async function readResponse(response: Response): Promise<unknown> {
  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(
      'auth',
      'Connection was not authorised. Check your credentials and account access.',
    );
  }
  if (response.status === 429 || response.status >= 500) {
    throw new IntegrationError(
      'network',
      'Provider temporarily unavailable. Retry the import to recover missing pages.',
      true,
    );
  }
  if (!response.ok) {
    throw new IntegrationError(
      'unsupported',
      'This provider endpoint is unavailable for this account.',
    );
  }
  try {
    return await response.json();
  } catch {
    throw new IntegrationError('invalid', 'Provider returned an unreadable response.');
  }
}
