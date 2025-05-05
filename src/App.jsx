import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Import pages
import AddCourier from './pages/AddCourier';
import AddClient from './pages/AddClient';
import ViewCouriers from './pages/ViewCouriers';

// Home component
const Home = () => (
  <div className="container mx-auto p-6">
    <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Courier Integration Platform</h1>
    <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
      Streamline your courier integrations with our powerful platform. Easily configure, map, and manage courier APIs for your transportation management system.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <Link to="/add-courier" className="no-underline">
        <div className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-500 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Add New Courier</h2>
          <p className="text-gray-600">Configure a new courier integration with API credentials and field mappings.</p>
        </div>
      </Link>

      <Link to="/add-client" className="no-underline">
        <div className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-secondary-200 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-secondary-500 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary-500 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Add Client to Courier</h2>
          <p className="text-gray-600">Map clients to existing courier integrations for streamlined operations.</p>
        </div>
      </Link>

      <Link to="/view-couriers" className="no-underline">
        <div className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-accent-200 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent-500 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent-500 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">View Couriers</h2>
          <p className="text-gray-600">View and manage existing courier integrations and their configurations.</p>
        </div>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="flex items-center space-x-3 no-underline">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-800">Courier Integration</span>
              </Link>

              <div className="hidden md:flex space-x-4">
                <Link to="/" className="px-4 py-2 rounded-md transition-colors text-gray-600 hover:bg-gray-100 no-underline">Home</Link>
                <Link to="/add-courier" className="px-4 py-2 rounded-md transition-colors text-gray-600 hover:bg-gray-100 no-underline">Add Courier</Link>
                <Link to="/add-client" className="px-4 py-2 rounded-md transition-colors text-gray-600 hover:bg-gray-100 no-underline">Add Client</Link>
                <Link to="/view-couriers" className="px-4 py-2 rounded-md transition-colors text-gray-600 hover:bg-gray-100 no-underline">View Couriers</Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4 pt-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add-courier" element={<AddCourier />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/view-couriers" element={<ViewCouriers />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="container mx-auto px-6 py-4">
            <p className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} Courier Integration Platform. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
