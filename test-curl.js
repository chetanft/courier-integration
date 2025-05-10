// Test script for cURL parsing
import { parseCurl } from './src/lib/enhanced-curl-parser.js';

// Test cURL parsing
console.log('Testing cURL parsing...');

const testCurlCommands = [
  'curl https://jsonplaceholder.typicode.com/posts/1',
  'curl -X GET https://jsonplaceholder.typicode.com/posts/1',
  'curl -X POST -H "Content-Type: application/json" -d \'{"title":"foo","body":"bar","userId":1}\' https://jsonplaceholder.typicode.com/posts',
  'curl -H "Authorization: Bearer test-token" https://jsonplaceholder.typicode.com/posts/1',
  'curl -u "username:password" https://jsonplaceholder.typicode.com/posts/1',
  'curl "https://jsonplaceholder.typicode.com/posts?userId=1"'
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
