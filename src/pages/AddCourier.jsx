import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths, formatFieldPath } from '../lib/field-extractor';
import { generateJsConfig } from '../lib/js-generator';
import { addCourier, addFieldMapping } from '../lib/supabase';
import { isValidUrl } from '../lib/utils';

const AddCourier = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [courier, setCourier] = useState(null);
  const [apiType, setApiType] = useState('track_docket');
  const [tmsFields, setTmsFields] = useState([
    'docket_number',
    'status',
    'tracking_details',
    'event_date',
    'event_details_message',
    'event_status',
    'origin',
    'destination',
    'l2_status'
  ]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      toast.info('Testing API connection...');

      // Create auth config object
      const authConfig = {
        username: data.username,
        password: data.password,
        api_key: data.api_key,
        identifier: data.identifier,
        auth_endpoint: data.auth_endpoint,
        auth_method: data.auth_method || 'POST',
        auth_content_type: data.auth_content_type || 'application/json',
        token_path: data.token_path || 'access_token'
      };

      // Create courier object
      const courierData = {
        name: data.courier_name,
        auth_config: authConfig,
        created_at: new Date()
      };

      // Test API connection first before saving to database
      let response;
      try {
        response = await testCourierApi(
          authConfig,
          data.api_endpoint,
          { docNo: data.test_docket, docType: 'WB' }
        );

        // If API test is successful, save courier to Supabase
        const savedCourier = await addCourier(courierData);
        setCourier(savedCourier);

        setApiResponse(response);

        // Extract field paths from response
        const paths = extractFieldPaths(response);
        if (paths.length === 0) {
          toast.warning('No fields found in the API response. Please check the response format.');
        }

        setFieldMappings(paths.map(path => ({
          api_field: path,
          tms_field: '',
          courier_id: savedCourier.id,
          api_type: apiType
        })));

        toast.success('Courier added successfully!');
      } catch (apiError) {
        console.error('API test failed:', apiError);
        toast.error(`API test failed: ${apiError.message || 'Unknown error'}`);
        throw new Error(`API test failed: ${apiError.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding courier:', error);
      toast.error(error.message || 'Failed to add courier');
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

  // Save mappings to Supabase
  const saveMappings = async () => {
    try {
      setLoading(true);

      // Filter out mappings without TMS field
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      if (validMappings.length === 0) {
        toast.warning('No mappings to save. Please map at least one field.');
        setLoading(false);
        return;
      }

      toast.info(`Saving ${validMappings.length} field mappings...`);

      // Save each mapping
      const savedMappings = [];
      const failedMappings = [];

      for (const mapping of validMappings) {
        try {
          const savedMapping = await addFieldMapping(mapping);
          savedMappings.push(savedMapping);
        } catch (mappingError) {
          console.error('Error saving mapping:', mappingError, mapping);
          failedMappings.push(mapping.api_field);
        }
      }

      if (failedMappings.length > 0) {
        toast.warning(`${savedMappings.length} mappings saved, but ${failedMappings.length} failed. Please try again for the failed mappings.`);
      } else {
        toast.success(`${savedMappings.length} mappings saved successfully!`);
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error(error.message || 'Failed to save mappings');
    } finally {
      setLoading(false);
    }
  };

  // Generate and download JS file
  const generateJsFile = () => {
    try {
      if (!courier) {
        toast.error('Courier information is missing. Please try again.');
        return;
      }

      // Filter out mappings without TMS field
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      if (validMappings.length === 0) {
        toast.warning('No field mappings found. Please map at least one field before generating the JS file.');
        return;
      }

      // Generate JS code
      const jsCode = generateJsConfig(courier, validMappings);

      if (!jsCode) {
        toast.error('Failed to generate JS code. Please check the mappings and try again.');
        return;
      }

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

      toast.success('JS file generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating JS file:', error);
      toast.error(error.message || 'Failed to generate JS file');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Courier</h1>

      {/* Courier Form */}
      {!apiResponse && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Courier Name</label>
            <input
              type="text"
              {...register('courier_name', {
                required: 'Courier name is required',
                minLength: { value: 2, message: 'Courier name must be at least 2 characters' },
                maxLength: { value: 50, message: 'Courier name must be less than 50 characters' }
              })}
              className="w-full p-2 border rounded"
            />
            {errors.courier_name && <p className="text-red-500 mt-1">{errors.courier_name.message}</p>}
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Authentication</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Username (optional)</label>
                <input
                  type="text"
                  {...register('username')}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Password (optional)</label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">API Key (optional)</label>
                <input
                  type="text"
                  {...register('api_key')}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Identifier (optional)</label>
                <input
                  type="text"
                  {...register('identifier')}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Auth Endpoint (optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Auth Endpoint URL</label>
                <input
                  type="text"
                  {...register('auth_endpoint', {
                    validate: {
                      validUrlOrEmpty: value => !value || isValidUrl(value) || 'Please enter a valid URL'
                    }
                  })}
                  className="w-full p-2 border rounded"
                  placeholder="https://api.example.com/auth"
                />
                {errors.auth_endpoint && <p className="text-red-500 mt-1">{errors.auth_endpoint.message}</p>}
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Auth Method</label>
                <select
                  {...register('auth_method')}
                  className="w-full p-2 border rounded"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Token Path</label>
                <input
                  type="text"
                  {...register('token_path')}
                  placeholder="e.g., access_token or data.token"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">API Testing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">API Endpoint</label>
                <input
                  type="text"
                  {...register('api_endpoint', {
                    required: 'API endpoint is required',
                    validate: {
                      validUrl: value => isValidUrl(value) || 'Please enter a valid URL'
                    }
                  })}
                  className="w-full p-2 border rounded"
                  placeholder="https://api.example.com/tracking"
                />
                {errors.api_endpoint && <p className="text-red-500 mt-1">{errors.api_endpoint.message}</p>}
              </div>
              <div>
                <label className="block text-gray-700 mb-2">API Type</label>
                <select
                  value={apiType}
                  onChange={(e) => setApiType(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="track_docket">Track Docket</option>
                  <option value="epod">EPOD</option>
                  <option value="track_multiple_dockets">Track Multiple Dockets</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Test Docket Number</label>
                <input
                  type="text"
                  {...register('test_docket', {
                    required: 'Test docket is required',
                    minLength: { value: 3, message: 'Test docket must be at least 3 characters' },
                    pattern: {
                      value: /^[A-Za-z0-9-]+$/,
                      message: 'Test docket should only contain letters, numbers, and hyphens'
                    }
                  })}
                  className="w-full p-2 border rounded"
                  placeholder="ABC123456"
                />
                {errors.test_docket && <p className="text-red-500 mt-1">{errors.test_docket.message}</p>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300 flex items-center"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Testing API...' : 'Test API & Continue'}
          </button>
        </form>
      )}

      {/* Field Mapping */}
      {apiResponse && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Field Mapping</h2>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">API Response</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Map Fields</h3>
            <p className="text-gray-600 mb-4">
              Map the courier API fields to your internal TMS fields. Select the appropriate TMS field for each API field.
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">API Field Path</th>
                    <th className="py-2 px-4 border-b text-left">TMS Field</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldMappings.map((mapping, index) => (
                    <tr key={index}>
                      <td className="py-2 px-4 border-b">
                        {formatFieldPath(mapping.api_field)}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <select
                          value={mapping.tms_field}
                          onChange={(e) => handleMappingChange(mapping.api_field, e.target.value)}
                          className="w-full p-2 border rounded"
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

          <div className="flex space-x-4">
            <button
              onClick={saveMappings}
              disabled={loading}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-green-300 flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Saving...' : 'Save Mappings'}
            </button>

            <button
              onClick={generateJsFile}
              disabled={loading}
              className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:bg-purple-300 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Generate JS File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCourier;
