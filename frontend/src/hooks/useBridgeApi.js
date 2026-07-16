import { useState, useCallback } from 'react';

const API_BASE = '/api/skills/bridge';


export function useBridgeApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, method = 'GET', body = null) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}${path}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API Request failed');
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getQuote = useCallback((params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quote?${query}`, 'GET');
  }, [request]);

  const getRoute = useCallback((body) => {
    return request('/route', 'POST', body);
  }, [request]);

  const checkBridge = useCallback((body) => {
    return request('/check', 'POST', body);
  }, [request]);

  const submitIntent = useCallback((body) => {
    return request('/intent', 'POST', body);
  }, [request]);

  const getStatus = useCallback((txHash) => {
    return request(`/status?txHash=${txHash}`, 'GET');
  }, [request]);

  return {
    loading,
    error,
    getQuote,
    getRoute,
    checkBridge,
    submitIntent,
    getStatus,
  };
}
