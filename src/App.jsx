import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

// Import pages
import AddCourier from './pages/AddCourier';
import AddClient from './pages/AddClient';
import ViewCouriers from './pages/ViewCouriers';

// Dashboard component
const Dashboard = () => (
  <div className="container mx-auto p-4">
    <h1 className="text-2xl font-bold mb-4">Courier Integration Dashboard</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link to="/add-courier" className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-2">Add New Courier</h2>
        <p className="text-gray-600">Configure a new courier integration with API credentials and field mappings.</p>
      </Link>
      <Link to="/add-client" className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-2">Add Client to Courier</h2>
        <p className="text-gray-600">Map clients to existing courier integrations.</p>
      </Link>
      <Link to="/view-couriers" className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-2">View Couriers</h2>
        <p className="text-gray-600">View and manage existing courier integrations.</p>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/" className="text-xl font-bold text-gray-800">
                Courier Integration Platform
              </Link>
              <div className="space-x-4">
                <Link to="/" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link to="/add-courier" className="text-gray-600 hover:text-gray-900">Add Courier</Link>
                <Link to="/add-client" className="text-gray-600 hover:text-gray-900">Add Client</Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-courier" element={<AddCourier />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/view-couriers" element={<ViewCouriers />} />
          </Routes>
        </main>

        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
