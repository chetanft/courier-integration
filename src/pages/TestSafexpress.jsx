import React from 'react';
import { Link } from 'react-router-dom';
import SafexpressTest from '../components/SafexpressTest';

const TestSafexpress = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Safexpress API Test</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600">
          This page allows you to test the Safexpress API integration directly. 
          Enter your tracking number, authorization token, and API key from your cURL command to test.
        </p>
      </div>
      
      <SafexpressTest />
    </div>
  );
};

export default TestSafexpress;
