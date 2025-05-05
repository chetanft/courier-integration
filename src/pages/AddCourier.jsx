import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths, formatFieldPath } from '../lib/field-extractor';
import { generateJsConfig } from '../lib/js-generator';
import { addCourier, addFieldMapping } from '../lib/supabase';
import { isValidUrl } from '../lib/utils';

const AddCourier = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [courier, setCourier] = useState(null);
  const [apiType, setApiType] = useState('track_docket');
  const [tmsFields] = useState([
    'docket_number',
    'status',
    'tracking_details',
    'event_date',
    'event_status',
    'origin',
    'destination'
  ]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      console.log('Testing API connection...');

      // Create auth config object
      const authConfig = {
        username: data.username,
        password: data.password,
        api_key: data.api_key,
        auth_endpoint: data.auth_endpoint,
        auth_method: data.auth_method || 'POST'
      };

      // Create courier object
      const courierData = {
        name: data.courier_name,
        auth_config: authConfig,
        created_at: new Date()
      };

      // Test API connection
      const response = await testCourierApi(
        authConfig,
        data.api_endpoint,
        { docNo: data.test_docket }
      );

      // Save courier
      const savedCourier = await addCourier(courierData);
      setCourier(savedCourier);
      setApiResponse(response);

      // Extract field paths from response
      const paths = extractFieldPaths(response);
      setFieldMappings(paths.map(path => ({
        api_field: path,
        tms_field: '',
        courier_id: savedCourier.id,
        api_type: apiType
      })));

      console.log('Courier added successfully!');
    } catch (error) {
      console.error('Error adding courier:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle field mapping changes
  const handleMappingChange = (apiField, tmsField) => {
    setFieldMappings(prevMappings =>
      prevMappings.map(mapping =>
        mapping.api_field === apiField
          ? { ...mapping, tms_field }
          : mapping
      )
    );
  };

  // Save mappings
  const saveMappings = async () => {
    try {
      setLoading(true);
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      for (const mapping of validMappings) {
        await addFieldMapping(mapping);
      }

      console.log(`${validMappings.length} mappings saved successfully!`);
    } catch (error) {
      console.error('Error saving mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate and download JS file
  const generateJsFile = () => {
    try {
      if (!courier) return;

      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);
      if (validMappings.length === 0) return;

      const jsCode = generateJsConfig(courier, validMappings);

      // Create download link
      const blob = new Blob([jsCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_mapping.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('JS file generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating JS file:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Courier</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {/* Courier Form */}
      {!apiResponse && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Courier Information</h2>
            <div className="mb-4">
              <label htmlFor="courier_name" className="block text-sm font-medium mb-1">Courier Name</label>
              <input
                id="courier_name"
                {...register('courier_name', { required: true })}
                placeholder="Enter courier name"
                className="w-full px-3 py-2 border rounded"
              />
              {errors.courier_name && <p className="text-sm text-red-500 mt-1">Courier name is required</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Authentication Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
                <input
                  id="username"
                  {...register('username')}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="api_key" className="block text-sm font-medium mb-1">API Key</label>
                <input
                  id="api_key"
                  {...register('api_key')}
                  placeholder="Enter API key"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">API Testing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="api_endpoint" className="block text-sm font-medium mb-1">API Endpoint</label>
                <input
                  id="api_endpoint"
                  {...register('api_endpoint', { required: true })}
                  placeholder="https://api.example.com/tracking"
                  className="w-full px-3 py-2 border rounded"
                />
                {errors.api_endpoint && <p className="text-sm text-red-500 mt-1">API endpoint is required</p>}
              </div>
              <div>
                <label htmlFor="api_type" className="block text-sm font-medium mb-1">API Type</label>
                <select
                  id="api_type"
                  value={apiType}
                  onChange={(e) => setApiType(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="track_docket">Track Docket</option>
                  <option value="epod">EPOD</option>
                  <option value="track_multiple_dockets">Track Multiple Dockets</option>
                </select>
              </div>
              <div>
                <label htmlFor="test_docket" className="block text-sm font-medium mb-1">Test Docket Number</label>
                <input
                  id="test_docket"
                  {...register('test_docket', { required: true })}
                  placeholder="ABC123456"
                  className="w-full px-3 py-2 border rounded"
                />
                {errors.test_docket && <p className="text-sm text-red-500 mt-1">Test docket is required</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing API...' : 'Test API & Continue'}
            </button>
          </div>
        </form>
      )}

      {/* Field Mapping */}
      {apiResponse && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Field Mapping</h2>
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
              {fieldMappings.filter(m => m.tms_field).length} of {fieldMappings.length} fields mapped
            </span>
          </div>

          <div className="mb-6">
            <h3 className="text-md font-medium mb-2">API Response</h3>
            <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-40">
              <pre className="text-xs text-gray-600 font-mono">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-md font-medium mb-2">Map Fields</h3>
            <div className="border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">API Field Path</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">TMS Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fieldMappings.map((mapping, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-4 text-sm font-mono text-gray-500">
                        {formatFieldPath(mapping.api_field)}
                      </td>
                      <td className="py-2 px-4">
                        <select
                          value={mapping.tms_field}
                          onChange={(e) => handleMappingChange(mapping.api_field, e.target.value)}
                          className="w-full px-3 py-1 border rounded text-sm"
                        >
                          <option value="">-- Select TMS Field --</option>
                          {tmsFields.map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={saveMappings}
              disabled={loading}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Save Mappings
            </button>
            <button
              onClick={generateJsFile}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Generate JS File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCourier;
