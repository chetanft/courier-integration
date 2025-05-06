// A custom client that uses our Netlify Function proxy instead of direct Supabase access

// Base URL for API requests - use relative URL in production, full URL in development
const BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:8888/api';

// Generic function to make API requests
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const url = `${BASE_URL}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`Making ${method} request to ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: `API request failed with status ${response.status}`,
        status: response.status,
        statusText: response.statusText,
        details: errorData
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error };
  }
};

// Create a proxy object that mimics the Supabase client interface
const supabaseProxy = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (column, value) => ({
        single: async () => {
          const endpoint = `/${table}?select=${columns}&${column}=eq.${value}&limit=1`;
          const { data, error } = await apiRequest(endpoint);

          if (error) return { error };
          return { data: data[0] || null, error: null };
        },
        order: (orderColumn, { ascending = true } = {}) => ({
          limit: async (limit) => {
            const endpoint = `/${table}?select=${columns}&${column}=eq.${value}&order=${orderColumn}.${ascending ? 'asc' : 'desc'}&limit=${limit}`;
            return apiRequest(endpoint);
          }
        }),
        async execute() {
          const endpoint = `/${table}?select=${columns}&${column}=eq.${value}`;
          return apiRequest(endpoint);
        }
      }),
      order: (column, { ascending = true } = {}) => ({
        async execute() {
          const endpoint = `/${table}?select=${columns}&order=${column}.${ascending ? 'asc' : 'desc'}`;
          return apiRequest(endpoint);
        }
      }),
      async execute() {
        const endpoint = `/${table}?select=${columns}`;
        return apiRequest(endpoint);
      }
    }),
    insert: (data) => ({
      select: () => ({
        single: async () => {
          const endpoint = `/${table}`;
          return apiRequest(endpoint, 'POST', data);
        }
      }),
      async execute() {
        const endpoint = `/${table}`;
        return apiRequest(endpoint, 'POST', data);
      }
    }),
    update: (data) => ({
      eq: (column, value) => ({
        select: () => ({
          single: async () => {
            const endpoint = `/${table}?${column}=eq.${value}`;
            return apiRequest(endpoint, 'PATCH', data);
          }
        }),
        async execute() {
          const endpoint = `/${table}?${column}=eq.${value}`;
          return apiRequest(endpoint, 'PATCH', data);
        }
      })
    }),
    delete: () => ({
      eq: (column, value) => ({
        async execute() {
          const endpoint = `/${table}?${column}=eq.${value}`;
          return apiRequest(endpoint, 'DELETE');
        }
      })
    })
  }),
  storage: {
    createBucket: async (name, options) => {
      const endpoint = `/storage/buckets/${name}`;
      return apiRequest(endpoint, 'POST', options);
    },
    from: (bucket) => ({
      upload: async (path, file, options) => {
        const endpoint = `/storage/${bucket}/${path}`;
        return apiRequest(endpoint, 'POST', { file, options });
      },
      createSignedUrl: async (path, expiresIn) => {
        const endpoint = `/storage/${bucket}/sign/${path}?expiresIn=${expiresIn}`;
        return apiRequest(endpoint);
      }
    })
  },
  auth: {
    getSession: async () => {
      return { data: { session: null }, error: null };
    }
  },
  rpc: async (functionName, params) => {
    const endpoint = `/rpc/${functionName}`;
    return apiRequest(endpoint, 'POST', params);
  }
};

console.log('Using Supabase proxy client');

export default supabaseProxy;
