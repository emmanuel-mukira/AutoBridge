/**
 * Shared analytics query key prefix.
 * All analytics queries should use this as the base key
 * so they can be invalidated together when CRM data changes.
 */
export const ANALYTICS_QUERY_KEY = ['analytics'] as const;
