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
    <h1 className="text-2xl font-bold mb-6">Courier Integration Platform</h1>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link to="/add-courier" className="no-underline">
        <div className="p-4 bg-white rounded-lg shadow border hover:shadow-md">
          <h2 className="text-lg font-semibold mb-2">Add New Courier</h2>
          <p className="text-sm text-gray-600">Configure courier API integration</p>
        </div>
      </Link>

      <Link to="/add-client" className="no-underline">
        <div className="p-4 bg-white rounded-lg shadow border hover:shadow-md">
          <h2 className="text-lg font-semibold mb-2">Add Client</h2>
          <p className="text-sm text-gray-600">Map clients to couriers</p>
        </div>
      </Link>

      <Link to="/view-couriers" className="no-underline">
        <div className="p-4 bg-white rounded-lg shadow border hover:shadow-md">
          <h2 className="text-lg font-semibold mb-2">View Couriers</h2>
          <p className="text-sm text-gray-600">Manage courier integrations</p>
        </div>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/" className="font-bold text-lg no-underline text-gray-800">
                Courier Integration
              </Link>

              <div className="flex space-x-4">
                <Link to="/" className="text-gray-600 hover:text-gray-900 no-underline">Home</Link>
                <Link to="/add-courier" className="text-gray-600 hover:text-gray-900 no-underline">Add Courier</Link>
                <Link to="/add-client" className="text-gray-600 hover:text-gray-900 no-underline">Add Client</Link>
                <Link to="/view-couriers" className="text-gray-600 hover:text-gray-900 no-underline">View Couriers</Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add-courier" element={<AddCourier />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/view-couriers" element={<ViewCouriers />} />
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
