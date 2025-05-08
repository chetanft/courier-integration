import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTmsFields } from '../lib/edge-functions-service';
import {
  getCourierMappings,
  getCourierClients,
  linkClientsToCourier,
  getClients,
  getCourierById,
  getJsFilesForCourier,
  getJsFileDownloadUrl,
  deleteCourier,
  deleteClient
} from '../lib/supabase-service';
import { generateJsConfig } from '../lib/js-generator';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '../components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import { JsonViewer } from '../components/ui/json-viewer';
import { Copy, Clipboard, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '../components/ui/delete-confirmation-dialog';

const CourierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courier, setCourier] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [jsConfig, setJsConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [jsFiles, setJsFiles] = useState([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [tmsFieldsMap, setTmsFieldsMap] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteClientDialogOpen, setDeleteClientDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch courier details on component mount
  useEffect(() => {
    const fetchCourierDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching courier details for ID:', id);

        // First, try to get the courier data
        const courierData = await getCourierById(id);

        if (!courierData) {
          console.error('Courier not found for ID:', id);
          throw new Error('Courier not found. Please check the courier ID.');
        }

        console.log('Courier data retrieved:', courierData);
        setCourier(courierData);

        // Fetch each data type separately with better error handling
        let mappingsData = [], clientsData = [], allClientsData = [], jsFilesData = [], tmsFieldsData = [];

        try {
          console.log('Fetching field mappings for courier ID:', id);
          mappingsData = await getCourierMappings(id);
          console.log('Field mappings retrieved:', mappingsData);

          // Check if mappingsData is an array
          if (!Array.isArray(mappingsData)) {
            console.error('Field mappings data is not an array:', mappingsData);
            mappingsData = [];
          } else if (mappingsData.length === 0) {
            console.log('No field mappings found for this courier');
          } else {
            console.log(`Found ${mappingsData.length} field mappings`);
            // Log each mapping
            mappingsData.forEach((mapping, index) => {
              console.log(`Field Mapping ${index + 1}:`, mapping);
              // Check for expected properties
              if (!mapping.tms_field && !mapping.api_field) {
                console.warn(`Mapping ${index + 1} is missing expected properties:`, mapping);
              }
            });
          }
        } catch (mappingsErr) {
          console.error('Error fetching field mappings:', mappingsErr);
          // Continue with empty mappings rather than failing completely
          mappingsData = [];
        }

        try {
          clientsData = await getCourierClients(id);
          console.log('Linked clients retrieved:', clientsData);
        } catch (clientsErr) {
          console.error('Error fetching linked clients:', clientsErr);
          // Continue with empty clients rather than failing completely
        }

        try {
          allClientsData = await getClients();
          console.log('All clients retrieved:', allClientsData?.length || 0);
        } catch (allClientsErr) {
          console.error('Error fetching all clients:', allClientsErr);
          // Continue with empty all clients rather than failing completely
        }

        try {
          console.log('Fetching JS files for courier ID:', id);
          jsFilesData = await getJsFilesForCourier(id);
          console.log('JS files retrieved:', jsFilesData);

          // Check if jsFilesData is an array
          if (!Array.isArray(jsFilesData)) {
            console.error('JS files data is not an array:', jsFilesData);
            jsFilesData = [];
          } else if (jsFilesData.length === 0) {
            console.log('No JS files found for this courier');
          } else {
            console.log(`Found ${jsFilesData.length} JS files`);
            // Log each JS file
            jsFilesData.forEach((file, index) => {
              console.log(`JS File ${index + 1}:`, file);
            });
          }
        } catch (jsFilesErr) {
          console.error('Error fetching JS files:', jsFilesErr);
          if (jsFilesErr.message && jsFilesErr.message.includes('relation "public.js_files" does not exist')) {
            console.error('The js_files table does not exist in the database. Please run the create-js-files-table.sql script.');
            setError({
              message: 'JS Files table not found in database',
              details: {
                message: 'The js_files table does not exist in the database. Please run the create-js-files-table.sql script in your Supabase SQL Editor.',
                original: jsFilesErr
              }
            });
          } else {
            console.error('Other error fetching JS files:', jsFilesErr);
          }
          // Continue with empty JS files rather than failing completely
          jsFilesData = [];
        }

        try {
          tmsFieldsData = await getTmsFields();
          console.log('TMS fields retrieved:', tmsFieldsData?.length || 0);

          // Create a map of TMS fields for easy lookup
          const fieldsMap = {};
          if (tmsFieldsData && tmsFieldsData.length > 0) {
            tmsFieldsData.forEach(field => {
              fieldsMap[field.name] = field;
            });
          }
          setTmsFieldsMap(fieldsMap);
        } catch (tmsFieldsErr) {
          console.error('Error fetching TMS fields:', tmsFieldsErr);
          // Continue with empty TMS fields rather than failing completely
        }

        setMappings(mappingsData || []);
        setClients(clientsData || []);
        setAllClients(allClientsData || []);
        setJsFiles(jsFilesData || []);

        // Generate JS config
        if (courierData && mappingsData && mappingsData.length > 0) {
          try {
            const config = generateJsConfig(courierData, mappingsData);
            setJsConfig(config);
            console.log('JS config generated successfully');
          } catch (configErr) {
            console.error('Error generating JS config:', configErr);
            // Continue without JS config rather than failing completely
          }
        } else {
          console.log('Not generating JS config - no mappings available');
        }
      } catch (err) {
        console.error('Error fetching courier details:', err);
        setError({
          message: err.message || 'Failed to load courier details',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourierDetails();
    }
  }, [id]);

  // Handle client selection
  const handleClientChange = (clientId) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  // Handle mapping clients to courier
  const handleMapClients = async () => {
    if (selectedClients.length === 0) {
      return;
    }

    setMappingLoading(true);
    setError(null);

    try {
      await linkClientsToCourier(id, selectedClients);

      // Refresh clients list
      const clientsData = await getCourierClients(id);
      setClients(clientsData || []);

      // Reset selection and close dialog
      setSelectedClients([]);
      setDialogOpen(false);
    } catch (err) {
      console.error('Error mapping clients to courier:', err);
      setError({
        message: 'Failed to map clients to courier',
        details: err
      });
    } finally {
      setMappingLoading(false);
    }
  };

  // Handle downloading a JS file
  const handleDownloadJsFile = async (filePath, fileName) => {
    try {
      setDownloadLoading(true);
      console.log('Downloading JS file with path:', filePath);

      const downloadUrl = await getJsFileDownloadUrl(filePath);

      if (!downloadUrl) {
        console.error('Failed to get download URL - null or undefined returned');
        throw new Error('Failed to generate download URL. The file might not exist or there might be permission issues.');
      }

      console.log('Got download URL:', downloadUrl);

      // Create and click a download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log('JS file download initiated successfully!');
    } catch (error) {
      console.error('Error downloading JS file:', error);

      // Show a more user-friendly error message
      alert(`Error downloading file: ${error.message || 'Unknown error'}`);

      setError({
        message: `Failed to download JS file: ${error.message || 'Unknown error'}`,
        details: error
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  // Handle deleting a courier
  const handleDeleteCourier = async () => {
    try {
      setDeleteLoading(true);
      await deleteCourier(id);
      toast.success(`Courier "${courier.name}" has been deleted`);
      setDeleteDialogOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error deleting courier:', error);
      toast.error('Failed to delete courier: ' + (error.message || 'Unknown error'));
      setError({
        message: `Failed to delete courier: ${error.message || 'Unknown error'}`,
        details: error
      });
      setDeleteLoading(false);
    }
  };

  // Handle deleting a client
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      setDeleteLoading(true);
      await deleteClient(clientToDelete.id);

      // Refresh clients list
      const updatedClients = clients.filter(c => c.id !== clientToDelete.id);
      setClients(updatedClients);

      toast.success(`Client "${clientToDelete.name}" has been deleted`);
      setDeleteClientDialogOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client: ' + (error.message || 'Unknown error'));
      setError({
        message: `Failed to delete client: ${error.message || 'Unknown error'}`,
        details: error
      });
      setDeleteLoading(false);
    }
  };

  // Handle copying JS code to clipboard
  const handleCopyJsCode = () => {
    if (!jsConfig) return;

    navigator.clipboard.writeText(jsConfig)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Filter out already mapped clients
  const availableClients = allClients.filter(
    client => !clients.some(c => c.id === client.id)
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse text-blue-600 text-center p-12">
          Loading courier details...
        </div>
      </div>
    );
  }

  // Only show full-page error if it's a critical error that prevents displaying the courier
  // For non-critical errors like missing js_files table, we'll show inline error messages
  if (error && error.message !== 'JS Files table not found in database') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <h3 className="text-lg font-medium mb-2">Error Loading Courier</h3>
          <p>{error.message}</p>

          {error.details && (
            <div className="mt-4 p-4 bg-red-100 rounded text-sm">
              <h4 className="font-medium mb-2">Error Details:</h4>
              <pre className="whitespace-pre-wrap">
                {typeof error.details === 'object'
                  ? JSON.stringify(error.details, null, 2)
                  : error.details}
              </pre>
            </div>
          )}

          <div className="mt-6 flex space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
            <Button
              variant="default"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md mb-6">
          <h3 className="text-lg font-medium mb-2">Courier Not Found</h3>
          <p>The courier you're looking for doesn't exist or has been removed.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Header with Courier Name */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{courier.name}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>

          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Courier
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default">Map Client</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Map Clients to {courier.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {availableClients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No available clients to map</p>
                    <Link to="/add-client" className="text-blue-600 hover:underline mt-2 inline-block">
                      Add a new client
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Select Clients</p>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {selectedClients.length} selected
                      </span>
                    </div>
                    <div className="border rounded p-4 max-h-[300px] overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {availableClients.map(client => (
                          <div key={client.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id={`client-${client.id}`}
                              checked={selectedClients.includes(client.id)}
                              onChange={() => handleClientChange(client.id)}
                              className="mr-3"
                              disabled={mappingLoading}
                            />
                            <label htmlFor={`client-${client.id}`} className="cursor-pointer">
                              {client.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        variant="default"
                        onClick={handleMapClients}
                        disabled={mappingLoading || selectedClients.length === 0}
                      >
                        {mappingLoading ? 'Mapping...' : 'Map Selected Clients'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Delete Courier Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Courier"
        entityName={courier.name}
        entityType="courier"
        onConfirm={handleDeleteCourier}
        isDeleting={deleteLoading}
      />

      {/* Delete Client Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteClientDialogOpen}
        onOpenChange={(open) => {
          setDeleteClientDialogOpen(open);
          if (!open) {
            setClientToDelete(null);
          }
        }}
        title="Delete Client"
        entityName={clientToDelete ? clientToDelete.name : ''}
        entityType="client"
        onConfirm={handleDeleteClient}
        isDeleting={deleteLoading}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Courier Details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">API Base URL</h3>
                <p className="mt-1">{courier.apiBaseUrl}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Authentication Type</h3>
                <p className="mt-1">{courier.authType || 'None'}</p>
              </div>

              {courier.apiKey && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">API Key</h3>
                  <p className="mt-1">••••••••{courier.apiKey.slice(-4)}</p>
                </div>
              )}

              {/* FreightTiger specific fields */}
              {courier.fteid && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">FreightTiger ID</h3>
                    <p className="mt-1">{courier.fteid}</p>
                  </div>

                  {courier.entity_type && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Entity Type</h3>
                      <p className="mt-1">{courier.entity_type}</p>
                    </div>
                  )}

                  {courier.partner_type && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Partner Type</h3>
                      <p className="mt-1">{courier.partner_type}</p>
                    </div>
                  )}

                  {courier.short_code && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Short Code</h3>
                      <p className="mt-1">{courier.short_code}</p>
                    </div>
                  )}

                  {courier.company_name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                      <p className="mt-1">{courier.company_name}</p>
                    </div>
                  )}

                  {courier.old_company_id && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Old Company ID</h3>
                      <p className="mt-1">{courier.old_company_id}</p>
                    </div>
                  )}

                  {courier.tags && courier.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {courier.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {courier.relation_types && courier.relation_types.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Relation Types</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {courier.relation_types.map((type, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {courier.is_active !== undefined && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${courier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {courier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Additional FreightTiger metadata in collapsible section */}
                  <Collapsible className="mt-4 border rounded-md p-2">
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 p-2 hover:bg-gray-50 rounded">
                      <span>Additional FreightTiger Metadata</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2 space-y-3 text-sm">
                      {courier.company_fteid && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Company FTEID</h3>
                          <p className="mt-1 text-xs">{courier.company_fteid}</p>
                        </div>
                      )}

                      {courier.company_gstin && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Company GSTIN</h3>
                          <p className="mt-1 text-xs">{courier.company_gstin}</p>
                        </div>
                      )}

                      {courier.company_head_office && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Company Head Office</h3>
                          <p className="mt-1 text-xs">{courier.company_head_office}</p>
                        </div>
                      )}

                      {courier.branch_fteid && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Branch FTEID</h3>
                          <p className="mt-1 text-xs">{courier.branch_fteid}</p>
                        </div>
                      )}

                      {courier.branch_name && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Branch Name</h3>
                          <p className="mt-1 text-xs">{courier.branch_name}</p>
                        </div>
                      )}

                      {courier.old_branch_id && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Old Branch ID</h3>
                          <p className="mt-1 text-xs">{courier.old_branch_id}</p>
                        </div>
                      )}

                      {courier.department_fteid && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Department FTEID</h3>
                          <p className="mt-1 text-xs">{courier.department_fteid}</p>
                        </div>
                      )}

                      {courier.department_name && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Department Name</h3>
                          <p className="mt-1 text-xs">{courier.department_name}</p>
                        </div>
                      )}

                      {courier.old_department_id && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Old Department ID</h3>
                          <p className="mt-1 text-xs">{courier.old_department_id}</p>
                        </div>
                      )}

                      {courier.place_fteid && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Place FTEID</h3>
                          <p className="mt-1 text-xs">{courier.place_fteid}</p>
                        </div>
                      )}

                      {courier.crm_type && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">CRM Type</h3>
                          <p className="mt-1 text-xs">{courier.crm_type}</p>
                        </div>
                      )}

                      {courier.is_crm_supplier !== undefined && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Is CRM Supplier</h3>
                          <p className="mt-1 text-xs">{courier.is_crm_supplier ? 'Yes' : 'No'}</p>
                        </div>
                      )}

                      {courier.is_crm_transporter !== undefined && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Is CRM Transporter</h3>
                          <p className="mt-1 text-xs">{courier.is_crm_transporter ? 'Yes' : 'No'}</p>
                        </div>
                      )}

                      {courier.premium_from && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Premium From</h3>
                          <p className="mt-1 text-xs">{new Date(courier.premium_from).toLocaleDateString()}</p>
                        </div>
                      )}

                      {courier.created_by && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Created By</h3>
                          <p className="mt-1 text-xs">
                            {courier.created_by.firstname} {courier.created_by.lastname} ({courier.created_by.fteid})
                          </p>
                        </div>
                      )}

                      {courier.updated_by && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Updated By</h3>
                          <p className="mt-1 text-xs">
                            {courier.updated_by.firstname} {courier.updated_by.lastname} ({courier.updated_by.fteid})
                          </p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="mt-1">{new Date(courier.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JS Config */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Generated JS Configuration</CardTitle>
            {jsConfig && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleCopyJsCode}
              >
                {copySuccess ? (
                  <>
                    <Clipboard className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm max-h-[400px]">
              {jsConfig || 'No configuration generated yet'}
            </pre>
          </CardContent>
        </Card>

        {/* Field Mappings */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Field Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border">
                <p className="text-gray-500">No field mappings defined</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TMS Field
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Courier Field Path
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappings.map((mapping, index) => {
                      // Determine the field name based on database schema
                      // Log the mapping object to help with debugging
                      console.log(`Mapping ${index}:`, mapping);

                      // Handle different property naming conventions
                      const tmsField = mapping.tms_field || mapping.tmsField;
                      const apiField = mapping.api_field || mapping.apiField || mapping.courierFieldPath;
                      const dataType = mapping.data_type || mapping.dataType || 'string';

                      // Skip mappings without a TMS field
                      if (!tmsField) {
                        console.log(`Skipping mapping ${index} - no TMS field`);
                        return null;
                      }

                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tmsFieldsMap[tmsField]?.display_name || tmsField}
                            {tmsFieldsMap[tmsField]?.description && (
                              <p className="text-xs text-gray-500 mt-1">{tmsFieldsMap[tmsField].description}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {apiField}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dataType || tmsFieldsMap[tmsField]?.data_type || 'string'}
                          </td>
                        </tr>
                      );
                    }).filter(Boolean)}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated JS Files */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Generated JS Files</CardTitle>
          </CardHeader>
          <CardContent>
            {error && error.message === 'JS Files table not found in database' ? (
              <div className="text-center py-8 bg-red-50 rounded border border-red-200">
                <p className="text-red-600 font-medium">JS Files table not found in database</p>
                <p className="text-sm text-red-500 mt-2">
                  The js_files table does not exist in your Supabase database. You need to run the create-js-files-table.sql script.
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded text-sm text-left max-w-2xl mx-auto">
                  <p className="font-medium mb-2">Steps to fix:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to your Supabase dashboard</li>
                    <li>Navigate to the SQL Editor</li>
                    <li>Copy and paste the contents of the create-js-files-table.sql file</li>
                    <li>Run the SQL script</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            ) : jsFiles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border">
                <p className="text-gray-500">No JS files generated yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Generate a JS file by mapping fields and clicking "Generate JS File" button
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jsFiles.length > 0 ? (
                      jsFiles.map((file) => {
                        // Log the file object to help with debugging
                        console.log('JS File:', file);

                        return (
                          <tr key={file.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {file.file_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(file.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadJsFile(file.file_path, file.file_name)}
                                disabled={downloadLoading}
                              >
                                {downloadLoading ? 'Downloading...' : 'Download'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                          No JS files found. JS files array is empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Clients */}
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Linked Clients</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Map New Client</Button>
              </DialogTrigger>
            </Dialog>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border">
                <p className="text-gray-500">No clients linked to this courier</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  Map Clients
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {clients.map(client => (
                  <div key={client.id} className="p-4 bg-white rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        <p className="text-sm text-gray-500">Client ID: {client.id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setClientToDelete(client);
                          setDeleteClientDialogOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourierDetail;
