// Test script for API requests
import fetch from 'node-fetch';

// Test API requests
console.log('Testing API requests...');

const testApiRequests = [
  {
    name: 'GET request',
    config: {
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET'
    }
  },
  {
    name: 'POST request',
    config: {
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'POST',
      headers: [
        { key: 'Content-Type', value: 'application/json' }
      ],
      body: {
        title: 'foo',
        body: 'bar',
        userId: 1
      }
    }
  },
  {
    name: 'Request with query parameters',
    config: {
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'GET',
      queryParams: [
        { key: 'userId', value: '1' }
      ]
    }
  }
];

// Run API tests sequentially
async function runApiTests() {
  for (const [index, test] of testApiRequests.entries()) {
    try {
      console.log(`\nTest ${index + 1}: ${test.name}`);
      console.log('Request config:', JSON.stringify(test.config, null, 2));

      // Build the request options
      const options = {
        method: test.config.method,
        headers: {}
      };

      // Add headers
      if (test.config.headers) {
        test.config.headers.forEach(header => {
          options.headers[header.key] = header.value;
        });
      }

      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(test.config.method) && test.config.body) {
        options.body = JSON.stringify(test.config.body);
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }

      // Build URL with query parameters
      let url = test.config.url;
      if (test.config.queryParams && test.config.queryParams.length > 0) {
        const urlObj = new URL(url);
        test.config.queryParams.forEach(param => {
          urlObj.searchParams.append(param.key, param.value);
        });
        url = urlObj.toString();
      }

      // Make the request
      const response = await fetch(url, options);
      const data = await response.json();

      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    } catch (error) {
      console.error(`Error making API request ${index + 1}:`, error);
    }
  }
}

runApiTests().catch(error => {
  console.error('Error running API tests:', error);
});
