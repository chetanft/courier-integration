import React from 'react';

function TestApp() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Test Application</h1>
      <p className="text-xl text-gray-700 mb-8">If you can see this, React is rendering correctly!</p>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Troubleshooting Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>React version: {React.version}</li>
          <li>Environment: Development</li>
          <li>Current time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;
