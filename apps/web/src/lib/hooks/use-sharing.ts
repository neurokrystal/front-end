import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { 
  ShareGrantOutput, 
  AccessibleResource, 
  GrantShareInput 
} from "@dimensional/shared";

export function useMyShares() {
  const [shares, setShares] = useState<ShareGrantOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchShares = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.sharing.getMyShares();
      setShares(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch shares'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  return { shares, loading, error, refetch: fetchShares };
}

export function useSharedWithMe() {
  const [resources, setResources] = useState<AccessibleResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSharedWithMe = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.sharing.getSharedWithMe();
      setResources(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch shared resources'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSharedWithMe();
  }, [fetchSharedWithMe]);

  return { resources, loading, error, refetch: fetchSharedWithMe };
}

export function useGrantShare() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const grant = async (input: GrantShareInput) => {
    try {
      setLoading(true);
      const result = await api.sharing.grant(input);
      setError(null);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to grant share');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { grant, loading, error };
}

export function useRevokeShare() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const revoke = async (grantId: string) => {
    try {
      setLoading(true);
      await api.sharing.revoke(grantId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke share');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { revoke, loading, error };
}
