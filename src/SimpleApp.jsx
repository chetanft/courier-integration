import React from 'react';

function SimpleApp() {
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto', 
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1 style={{ color: '#2563eb' }}>Simple React App</h1>
      <p style={{ color: '#4b5563' }}>
        This is a minimal React application with inline styles and no external dependencies.
      </p>
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>React Information</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li>React Version: {React.version}</li>
          <li>Current Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
      <button 
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          marginTop: '20px',
          cursor: 'pointer'
        }}
        onClick={() => alert('React is working!')}
      >
        Click Me
      </button>
    </div>
  );
}

export default SimpleApp;
