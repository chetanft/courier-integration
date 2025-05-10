import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import JsonUploadForm from '../components/bulk-upload/JsonUploadForm';
import CsvUploadForm from '../components/bulk-upload/CsvUploadForm';
import ApiIntegrationForm from '../components/bulk-upload/ApiIntegrationForm';
import EnhancedApiIntegrationForm from '../components/bulk-upload/EnhancedApiIntegrationForm';
import UploadResults from '../components/bulk-upload/UploadResults';

const BulkUploadClients = () => {
  const [activeTab, setActiveTab] = useState('json');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value);
    // Reset results and errors when changing tabs
    setResults(null);
    setError(null);
  };

  // Handle JSON upload submission
  const handleJsonUpload = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Process will be implemented in the JsonUploadForm component
      setResults(data);
      toast.success(`Successfully processed ${data.successCount} clients`);
    } catch (err) {
      setError({
        message: err.message || 'Failed to process JSON upload',
        details: err.details || {}
      });
      toast.error('Failed to process JSON upload');
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV upload submission
  const handleCsvUpload = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Process will be implemented in the CsvUploadForm component
      setResults(data);
      toast.success(`Successfully processed ${data.successCount} clients`);
    } catch (err) {
      setError({
        message: err.message || 'Failed to process CSV upload',
        details: err.details || {}
      });
      toast.error('Failed to process CSV upload');
    } finally {
      setLoading(false);
    }
  };

  // Handle API integration submission
  const handleApiIntegration = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Process will be implemented in the ApiIntegrationForm component
      setResults(data);
      toast.success(`Successfully processed ${data.successCount} clients`);
    } catch (err) {
      setError({
        message: err.message || 'Failed to process API integration',
        details: err.details || {}
      });
      toast.error('Failed to process API integration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bulk Upload Clients</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
          {error.details && Object.keys(error.details).length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-red-600 cursor-pointer">Show more details</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {results ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadResults results={results} />
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setResults(null)}
                className="mr-2"
              >
                Upload More Clients
              </Button>
              <Link to="/">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Choose Upload Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="json">JSON Upload</TabsTrigger>
                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                <TabsTrigger value="api">API Integration</TabsTrigger>
              </TabsList>

              <TabsContent value="json">
                <JsonUploadForm onSubmit={handleJsonUpload} loading={loading} />
              </TabsContent>

              <TabsContent value="csv">
                <CsvUploadForm onSubmit={handleCsvUpload} loading={loading} />
              </TabsContent>

              <TabsContent value="api">
                <EnhancedApiIntegrationForm onSubmit={handleApiIntegration} loading={loading} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUploadClients;
