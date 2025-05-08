import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourierById, getJsFileContent } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const CourierDetailSimple = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courier, setCourier] = useState(null);
  const [jsFile, setJsFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourierDetails = async () => {
      setLoading(true);
      try {
        // Fetch courier details
        const courierData = await getCourierById(id);
        setCourier(courierData);

        // Fetch JS file content if available
        if (courierData.js_file_path) {
          try {
            const fileContent = await getJsFileContent(courierData.js_file_path);
            setJsFile(fileContent);
          } catch (fileError) {
            console.error('Error fetching JS file:', fileError);
            // Don't fail the whole component if file fetch fails
            setJsFile(null);
          }
        }
      } catch (error) {
        console.error('Error fetching courier details:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourierDetails();
    }
  }, [id]);

  const downloadJsFile = () => {
    if (!jsFile || !courier) return;

    const fileName = `${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_mapping.js`;
    const blob = new Blob([jsFile], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('JS file downloaded successfully');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading courier details...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message || 'Failed to load courier details'}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
          <h3 className="text-yellow-700 font-medium">Courier Not Found</h3>
          <p className="text-yellow-600">The requested courier could not be found.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{courier.name} Integration</h1>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Courier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Courier Name</h3>
              <p>{courier.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">API Base URL</h3>
              <p className="font-mono text-sm">{courier.api_base_url || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Authentication Type</h3>
              <p>{courier.auth_type || 'None'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <div className="flex items-center">
                {courier.js_file_path || courier.js_file_generated ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    JS File Generated
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Configuration Incomplete
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {jsFile ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated JS File</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={downloadJsFile}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (courier.client_id) {
                    navigate(`/client/${courier.client_id}/add-courier?courier=${encodeURIComponent(courier.name)}`);
                  } else {
                    toast.error("Client ID not found. Please go back to the client page and try again.");
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <SyntaxHighlighter
                language="javascript"
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{ margin: 0, borderRadius: 0 }}
              >
                {jsFile}
              </SyntaxHighlighter>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>JS File Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-4">
              No JS file has been generated for this courier yet.
            </p>
            <Button
              onClick={() => {
                if (courier.client_id) {
                  navigate(`/client/${courier.client_id}/add-courier?courier=${encodeURIComponent(courier.name)}`);
                } else {
                  toast.error("Client ID not found. Please go back to the client page and try again.");
                }
              }}
            >
              Generate JS File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourierDetailSimple;
