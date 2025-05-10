/**
 * Multi-Step API Integration Hook
 *
 * This hook provides a way to manage multi-step API workflows, such as authentication
 * followed by API calls, with response storage and field mapping.
 */

import { useState, useCallback, useRef } from 'react';
import { makeApiRequest } from '../lib/api-client';

/**
 * Hook for managing multi-step API integration
 * @param {Array} initialConfigs - Initial configurations for each step
 * @returns {Object} Hook state and methods
 */
export const useMultiStepApiIntegration = (initialConfigs = [{}]) => {
  // State for each step's configuration
  const [stepConfigs, setStepConfigs] = useState(initialConfigs);

  // State for each step's response
  const [stepResponses, setStepResponses] = useState(Array(initialConfigs.length).fill(null));

  // State for loading status
  const [loading, setLoading] = useState(false);

  // State for errors
  const [errors, setErrors] = useState(Array(initialConfigs.length).fill(null));

  // State for field mappings
  const [fieldMappings, setFieldMappings] = useState({});

  // Reference to store all responses (including filtered ones)
  const allResponsesRef = useRef({});

  // Add a new step
  const addStep = useCallback((config = {}) => {
    setStepConfigs(prev => [...prev, config]);
    setStepResponses(prev => [...prev, null]);
    setErrors(prev => [...prev, null]);
  }, []);

  // Remove a step
  const removeStep = useCallback((stepIndex) => {
    if (stepIndex < 0 || stepIndex >= stepConfigs.length) {
      return;
    }

    setStepConfigs(prev => prev.filter((_, i) => i !== stepIndex));
    setStepResponses(prev => prev.filter((_, i) => i !== stepIndex));
    setErrors(prev => prev.filter((_, i) => i !== stepIndex));

    // Remove from allResponsesRef
    delete allResponsesRef.current[`step_${stepIndex}`];
  }, [stepConfigs.length]);

  // Update a step's configuration
  const updateStepConfig = useCallback((stepIndex, config) => {
    setStepConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[stepIndex] = { ...newConfigs[stepIndex], ...config };
      return newConfigs;
    });
  }, []);

  // Execute a specific step
  const executeStep = useCallback(async (stepIndex) => {
    if (stepIndex < 0 || stepIndex >= stepConfigs.length) {
      throw new Error(`Invalid step index: ${stepIndex}`);
    }

    setLoading(true);
    setErrors(prev => {
      const newErrors = [...prev];
      newErrors[stepIndex] = null;
      return newErrors;
    });

    try {
      // Get the step configuration
      const config = stepConfigs[stepIndex];

      // Process the configuration to include tokens from previous steps if needed
      const processedConfig = processConfigWithPreviousResponses(config, allResponsesRef.current);

      // Make the API request
      const response = await makeApiRequest(processedConfig);

      // Store the response
      setStepResponses(prev => {
        const newResponses = [...prev];
        newResponses[stepIndex] = response;
        return newResponses;
      });

      // Store in the ref for future reference
      allResponsesRef.current[`step_${stepIndex}`] = response;

      // If this is a token response, store it specifically
      if (config.apiIntent === 'generate_auth_token' && response) {
        // Look for token in common locations
        const token = response.token || response.access_token ||
                     (response.data && (response.data.token || response.data.access_token));

        if (token) {
          allResponsesRef.current.authToken = token;
        }
      }

      return response;
    } catch (error) {
      // Store the error
      setErrors(prev => {
        const newErrors = [...prev];
        newErrors[stepIndex] = error;
        return newErrors;
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [stepConfigs]);

  // Execute all steps in sequence
  const executeAllSteps = useCallback(async () => {
    setLoading(true);

    try {
      const results = [];

      for (let i = 0; i < stepConfigs.length; i++) {
        try {
          const result = await executeStep(i);
          results.push(result);

          // If a step fails, stop execution
          if (result && result.error) {
            break;
          }
        } catch (err) {
          results.push(null);
          break;
        }
      }

      return results;
    } finally {
      setLoading(false);
    }
  }, [executeStep, stepConfigs.length]);

  // Update field mappings
  const updateFieldMappings = useCallback((apiType, mappings) => {
    setFieldMappings(prev => ({
      ...prev,
      [apiType]: {
        ...(prev[apiType] || {}),
        ...mappings
      }
    }));

    // Store in the ref for future reference
    allResponsesRef.current.fieldMappings = {
      ...allResponsesRef.current.fieldMappings,
      [apiType]: {
        ...(allResponsesRef.current.fieldMappings?.[apiType] || {}),
        ...mappings
      }
    };
  }, []);

  // Get all responses as a single object
  const getAllResponses = useCallback(() => {
    return {
      ...allResponsesRef.current,
      fieldMappings
    };
  }, [fieldMappings]);

  // Helper function to process config with previous responses
  const processConfigWithPreviousResponses = (config, allResponses) => {
    const processedConfig = { ...config };

    // If this config needs a token from a previous step
    if (config.useAuthToken && allResponses.authToken) {
      // Ensure auth object exists
      if (!processedConfig.auth) {
        processedConfig.auth = { type: 'bearer' };
      }

      // Set the token
      processedConfig.auth.token = allResponses.authToken;

      // Add Authorization header if not present
      const hasAuthHeader = (processedConfig.headers || []).some(
        h => h.key.toLowerCase() === 'authorization'
      );

      if (!hasAuthHeader) {
        processedConfig.headers = [
          ...(processedConfig.headers || []),
          {
            key: 'Authorization',
            value: `Bearer ${allResponses.authToken}`
          }
        ];
      }
    }

    return processedConfig;
  };

  return {
    stepConfigs,
    stepResponses,
    loading,
    errors,
    fieldMappings,
    addStep,
    removeStep,
    updateStepConfig,
    executeStep,
    executeAllSteps,
    updateFieldMappings,
    getAllResponses
  };
};
