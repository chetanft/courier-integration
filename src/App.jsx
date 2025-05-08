import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import ClientDetails from './pages/ClientDetails';
import CourierModule from './pages/CourierModule';
import AddCourierToClient from './pages/AddCourierToClient';
import AddCourier from './pages/AddCourier';
import AddCourierRevamped from './pages/AddCourierRevamped';
import AddClient from './pages/AddClient';
import BulkUploadClients from './pages/BulkUploadClients';
import CourierDetail from './pages/CourierDetail';
import Settings from './pages/Settings';
import UpdateCourierMappings from './pages/UpdateCourierMappings';

// This file now uses the Dashboard component instead of inline HomeContent

// This is a test change to trigger a new Netlify deployment
function App() {
  // Main application component
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/" className="font-bold text-lg no-underline text-gray-800">
                Courier Integration
              </Link>
              <div>
                <Link to="/settings" className="text-gray-600 hover:text-gray-900">
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            {/* New client-first workflow routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/client/:id" element={<ClientDetails />} />
            <Route path="/client/:clientId/courier/:courierId" element={<CourierModule />} />
            <Route path="/client/:clientId/add-courier" element={<AddCourierToClient />} />

            {/* Legacy routes */}
            <Route path="/add-courier" element={<AddCourierRevamped />} />
            <Route path="/add-courier-legacy" element={<AddCourier />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/bulk-upload-clients" element={<BulkUploadClients />} />
            <Route path="/courier/:id" element={<CourierDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/update-courier-mappings" element={<UpdateCourierMappings />} />
          </Routes>
        </main>

        <footer className="bg-white border-t mt-8 py-4">
          <div className="container mx-auto px-4">
            <p className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} Courier Integration Platform
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
