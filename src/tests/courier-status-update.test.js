/**
 * Unit tests for courier status update functionality
 * 
 * These tests verify that the courier status is properly updated
 * when a JS file is generated.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateCourierJsFileStatus } from '../lib/supabase-service';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    createClient: vi.fn(() => mockSupabase),
  };
});

// Mock the supabase instance
vi.mock('../lib/supabase-config', () => {
  const mockSupabase = {
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    supabase: mockSupabase,
  };
});

// Import the mocked supabase instance
import { supabase } from '../lib/supabase-config';

describe('Courier Status Update', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
    
    // Setup default successful responses
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
    });
    
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-courier-id',
                name: 'Test Courier',
                js_file_path: 'test-courier-id/test-file.js',
                js_file_generated: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update courier status when JS file is generated', async () => {
    // Arrange
    const courierId = 'test-courier-id';
    const fileName = 'test-file.js';
    const jsContent = 'console.log("Test JS content");';
    
    // Act
    const result = await updateCourierJsFileStatus(courierId, fileName, jsContent);
    
    // Assert
    // Check that the storage upload was called
    expect(supabase.storage.from).toHaveBeenCalledWith('js_files');
    
    // Check that the courier record was updated
    expect(supabase.from).toHaveBeenCalledWith('couriers');
    expect(supabase.from().update).toHaveBeenCalledWith({
      js_file_path: `${courierId}/${fileName}`,
      js_file_generated: true,
      updated_at: expect.any(String),
    });
    
    // Check that the function returned the updated courier
    expect(result).toEqual({
      id: 'test-courier-id',
      name: 'Test Courier',
      js_file_path: 'test-courier-id/test-file.js',
      js_file_generated: true,
    });
  });

  it('should try js-configs bucket if js_files bucket fails', async () => {
    // Arrange
    const courierId = 'test-courier-id';
    const fileName = 'test-file.js';
    const jsContent = 'console.log("Test JS content");';
    
    // Mock js_files bucket to fail
    supabase.storage.from.mockImplementation((bucket) => {
      if (bucket === 'js_files') {
        return {
          upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage error' } }),
        };
      } else if (bucket === 'js-configs') {
        return {
          upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        };
      }
      return {
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Unknown bucket' } }),
      };
    });
    
    // Act
    const result = await updateCourierJsFileStatus(courierId, fileName, jsContent);
    
    // Assert
    // Check that both storage buckets were tried
    expect(supabase.storage.from).toHaveBeenCalledWith('js_files');
    expect(supabase.storage.from).toHaveBeenCalledWith('js-configs');
    
    // Check that the courier record was updated
    expect(supabase.from).toHaveBeenCalledWith('couriers');
    expect(result).toEqual({
      id: 'test-courier-id',
      name: 'Test Courier',
      js_file_path: 'test-courier-id/test-file.js',
      js_file_generated: true,
    });
  });

  it('should update courier status even if both storage buckets fail', async () => {
    // Arrange
    const courierId = 'test-courier-id';
    const fileName = 'test-file.js';
    const jsContent = 'console.log("Test JS content");';
    
    // Mock both buckets to fail
    supabase.storage.from.mockImplementation((bucket) => {
      return {
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage error' } }),
      };
    });
    
    // Act
    const result = await updateCourierJsFileStatus(courierId, fileName, jsContent);
    
    // Assert
    // Check that both storage buckets were tried
    expect(supabase.storage.from).toHaveBeenCalledWith('js_files');
    expect(supabase.storage.from).toHaveBeenCalledWith('js-configs');
    
    // Check that the courier record was updated anyway
    expect(supabase.from).toHaveBeenCalledWith('couriers');
    expect(result).toEqual({
      id: 'test-courier-id',
      name: 'Test Courier',
      js_file_path: 'test-courier-id/test-file.js',
      js_file_generated: true,
    });
  });
});
