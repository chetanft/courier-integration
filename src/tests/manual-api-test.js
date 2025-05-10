/**
 * Manual API Test
 * 
 * This script tests the API client and cURL parser with real APIs.
 * Run with: node src/tests/manual-api-test.js
 */

import { parseCurl } from '../lib/enhanced-curl-parser.js';
import { makeApiRequest } from '../lib/api-client.js';

// Test cURL parsing
console.log('Testing cURL parsing...');

const testCurlCommands = [
  'curl https://jsonplaceholder.typicode.com/posts/1',
  'curl -X GET https://jsonplaceholder.typicode.com/posts/1',
  'curl -X POST -H "Content-Type: application/json" -d \'{"title":"foo","body":"bar","userId":1}\' https://jsonplaceholder.typicode.com/posts',
  'curl -H "Authorization: Bearer test-token" https://jsonplaceholder.typicode.com/posts/1',
  'curl -u "username:password" https://jsonplaceholder.typicode.com/posts/1',
  'curl "https://jsonplaceholder.typicode.com/posts?userId=1"',
  'curl -X POST \\\n-H "Content-Type: application/json" \\\nhttps://jsonplaceholder.typicode.com/posts'
];

testCurlCommands.forEach((curlCommand, index) => {
  try {
    console.log(`\nTest ${index + 1}: ${curlCommand}`);
    const parsed = parseCurl(curlCommand);
    console.log('Parsed result:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error(`Error parsing cURL command ${index + 1}:`, error.message);
  }
});

// Test API requests
console.log('\n\nTesting API requests...');

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
      
      const response = await makeApiRequest(test.config);
      console.log('Response:', JSON.stringify(response, null, 2).substring(0, 200) + '...');
    } catch (error) {
      console.error(`Error making API request ${index + 1}:`, error.message);
    }
  }
}

runApiTests().catch(error => {
  console.error('Error running API tests:', error);
});
