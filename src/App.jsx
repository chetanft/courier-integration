import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

// Import pages
import AddCourier from './pages/AddCourier';
import AddClient from './pages/AddClient';
import ViewCouriers from './pages/ViewCouriers';

// Dashboard component
const Dashboard = () => (
  <div className="container mx-auto p-6">
    <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Courier Integration Platform</h1>
    <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
      Streamline your courier integrations with our powerful platform. Easily configure, map, and manage courier APIs for your transportation management system.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <Link
        to="/add-courier"
        className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Add New Courier</h2>
        <p className="text-gray-600">Configure a new courier integration with API credentials and field mappings.</p>
      </Link>

      <Link
        to="/add-client"
        className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Add Client to Courier</h2>
        <p className="text-gray-600">Map clients to existing courier integrations for streamlined operations.</p>
      </Link>

      <Link
        to="/view-couriers"
        className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">View Couriers</h2>
        <p className="text-gray-600">View and manage existing courier integrations and their configurations.</p>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-800">Courier Integration</span>
              </Link>

              <div className="hidden md:flex space-x-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                  end
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/add-courier"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  Add Courier
                </NavLink>
                <NavLink
                  to="/add-client"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  Add Client
                </NavLink>
                <NavLink
                  to="/view-couriers"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  View Couriers
                </NavLink>
              </div>

              <div className="md:hidden">
                {/* Mobile menu button - we'll keep it simple for now */}
                <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4 pt-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
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

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#1F2937',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
              icon: '✅',
              style: {
                borderLeft: '4px solid #10B981',
              },
            },
            error: {
              icon: '❌',
              style: {
                borderLeft: '4px solid #EF4444',
              },
            },
            warning: {
              icon: '⚠️',
              style: {
                borderLeft: '4px solid #F59E0B',
              },
            },
            info: {
              icon: 'ℹ️',
              style: {
                borderLeft: '4px solid #3B82F6',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
