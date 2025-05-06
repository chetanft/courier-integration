import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Import from the Edge Functions service
import {
  getTmsFields,
  addTmsField,
  updateTmsField,
  deleteTmsField,
  getCouriersMissingFields,
  checkRlsConfiguration
} from '../lib/edge-functions-service';
// Import Supabase services
import {
  getCouriers,
  getCourierById,
  getCourierMappings,
  addFieldMapping
} from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { InfoIcon, PlusIcon, Trash2Icon, AlertTriangleIcon, SaveIcon, FilterIcon } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  // TMS Fields state
  const [tmsFields, setTmsFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [newField, setNewField] = useState({
    name: '',
    displayName: '',
    description: '',
    dataType: 'string',
    isRequired: false
  });
  const [couriersMissingFields, setCouriersMissingFields] = useState([]);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [rlsError, setRlsError] = useState(false);

  // Courier Mapping Fields state
  const [couriers, setCouriers] = useState([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [mappingFields, setMappingFields] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editedMappings, setEditedMappings] = useState({});

  // Check RLS configuration first
  useEffect(() => {
    const checkRls = async () => {
      try {
        const result = await checkRlsConfiguration();
        if (!result.success) {
          setRlsError(true);
          setError({
            message: 'Row Level Security (RLS) Configuration Issue',
            details: {
              message: result.message,
              details: result.details,
              help: 'Please enable RLS for the tms_fields table and add a policy to allow access.'
            }
          });
          setLoading(false);
        } else {
          // RLS is configured correctly, proceed to fetch data
          fetchTmsFields();
        }
      } catch (err) {
        console.error('Error checking RLS configuration:', err);
        setError({
          message: 'Failed to check RLS configuration',
          details: err
        });
        setLoading(false);
      }
    };

    const fetchTmsFields = async () => {
      setLoading(true);
      setError(null);

      try {
        const fieldsData = await getTmsFields();
        setTmsFields(fieldsData || []);

        // Check if any couriers are missing the new fields
        if (fieldsData && fieldsData.length > 0) {
          const missingFieldsData = await getCouriersMissingFields();
          setCouriersMissingFields(missingFieldsData || []);
        }
      } catch (err) {
        console.error('Error fetching TMS fields:', err);

        // Check if it's an RLS error
        if (err.isRlsError ||
            (err.details && err.details.code === 'RLS_ERROR') ||
            err.message?.includes('permission denied') ||
            err.details?.message?.includes('permission denied')) {
          setRlsError(true);
          setError({
            message: 'Row Level Security (RLS) Configuration Issue',
            details: {
              message: 'Permission denied. Row Level Security (RLS) is preventing access to the tms_fields table.',
              help: 'Please enable RLS for the tms_fields table and add a policy to allow access.'
            }
          });
        } else {
          setError({
            message: 'Failed to load TMS fields',
            details: err
          });
        }
      } finally {
        setLoading(false);
      }
    };

    checkRls();
  }, []);

  // Handle adding a new TMS field
  const handleAddField = async () => {
    try {
      setLoading(true);

      // Validate input
      if (!newField.name || !newField.displayName) {
        throw new Error('Name and Display Name are required');
      }

      // Add the field
      const addedField = await addTmsField(newField);

      // Update the local state
      setTmsFields(prev => [...prev, addedField]);

      // Reset the form
      setNewField({
        name: '',
        displayName: '',
        description: '',
        dataType: 'string',
        isRequired: false
      });

      // Close the dialog
      setAddDialogOpen(false);

      // Check for couriers missing this field
      const missingFieldsData = await getCouriersMissingFields();
      setCouriersMissingFields(missingFieldsData || []);
    } catch (err) {
      console.error('Error adding TMS field:', err);
      setError({
        message: 'Failed to add TMS field',
        details: err
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle editing a TMS field
  const handleEditField = async () => {
    try {
      setLoading(true);

      // Validate input
      if (!currentField.name || !currentField.display_name) {
        throw new Error('Name and Display Name are required');
      }

      // Update the field
      const updatedField = await updateTmsField(currentField.id, {
        name: currentField.name,
        displayName: currentField.display_name,
        description: currentField.description,
        dataType: currentField.data_type,
        isRequired: currentField.is_required
      });

      // Update the local state
      setTmsFields(prev => prev.map(field =>
        field.id === updatedField.id ? updatedField : field
      ));

      // Close the dialog
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating TMS field:', err);
      setError({
        message: 'Failed to update TMS field',
        details: err
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a TMS field
  const handleDeleteField = async () => {
    try {
      setLoading(true);

      // Delete the field
      await deleteTmsField(currentField.id);

      // Update the local state
      setTmsFields(prev => prev.filter(field => field.id !== currentField.id));

      // Close the dialog
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting TMS field:', err);
      setError({
        message: 'Failed to delete TMS field',
        details: err
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigate to update courier mappings
  const handleUpdateCouriers = () => {
    navigate('/update-courier-mappings');
  };

  // Fetch all couriers
  useEffect(() => {
    const fetchCouriers = async () => {
      try {
        const couriersData = await getCouriers();
        setCouriers(couriersData || []);
      } catch (err) {
        console.error('Error fetching couriers:', err);
        setMappingError({
          message: 'Failed to load couriers',
          details: err
        });
      }
    };

    fetchCouriers();
  }, []);

  // Fetch courier mapping fields when a courier is selected
  useEffect(() => {
    if (!selectedCourierId) {
      setSelectedCourier(null);
      setMappingFields([]);
      return;
    }

    const fetchCourierMappings = async () => {
      setMappingLoading(true);
      setMappingError(null);

      try {
        // Fetch courier details
        const courierData = await getCourierById(selectedCourierId);
        setSelectedCourier(courierData);

        // Fetch courier mappings
        const mappingsData = await getCourierMappings(selectedCourierId);

        // Process and categorize the mappings
        const processedMappings = mappingsData.map(mapping => {
          let category = 'Normal / Config';

          // Determine category based on field name and path
          const fieldName = mapping.tms_field.toLowerCase();
          const apiField = mapping.api_field.toLowerCase();

          // API-Related fields
          if (
            fieldName.includes('url') ||
            fieldName.includes('method') ||
            fieldName.includes('header') ||
            fieldName.includes('auth') ||
            fieldName.includes('token') ||
            fieldName.includes('body') ||
            apiField.includes('request')
          ) {
            category = 'API-Related';
          }
          // Status-Related fields
          else if (
            fieldName.includes('status') ||
            fieldName.includes('tracking') ||
            fieldName.includes('event') ||
            fieldName.includes('date') ||
            fieldName.includes('docket') ||
            fieldName.includes('delivery') ||
            fieldName.includes('shipment')
          ) {
            category = 'Status-Related';
          }

          return {
            ...mapping,
            category
          };
        });

        setMappingFields(processedMappings);

      } catch (err) {
        console.error('Error fetching courier mappings:', err);
        setMappingError({
          message: 'Failed to load courier mappings',
          details: err
        });
      } finally {
        setMappingLoading(false);
      }
    };

    fetchCourierMappings();
  }, [selectedCourierId]);

  // Handle courier selection change
  const handleCourierChange = (courierId) => {
    setSelectedCourierId(courierId);
    setEditedMappings({});
  };

  // Handle TMS field mapping change
  const handleMappingFieldChange = (mappingId, tmsField) => {
    setEditedMappings(prev => ({
      ...prev,
      [mappingId]: tmsField
    }));
  };

  // Save mapping changes
  const handleSaveMappings = async () => {
    setMappingLoading(true);

    try {
      // Process each edited mapping
      for (const [mappingId, tmsField] of Object.entries(editedMappings)) {
        const mapping = mappingFields.find(m => m.id === mappingId);
        if (mapping) {
          await addFieldMapping({
            ...mapping,
            tms_field: tmsField
          });
        }
      }

      // Refresh mappings
      const mappingsData = await getCourierMappings(selectedCourierId);
      setMappingFields(mappingsData.map(mapping => {
        let category = 'Normal / Config';
        const fieldName = mapping.tms_field.toLowerCase();
        const apiField = mapping.api_field.toLowerCase();

        if (
          fieldName.includes('url') ||
          fieldName.includes('method') ||
          fieldName.includes('header') ||
          fieldName.includes('auth') ||
          fieldName.includes('token') ||
          fieldName.includes('body') ||
          apiField.includes('request')
        ) {
          category = 'API-Related';
        } else if (
          fieldName.includes('status') ||
          fieldName.includes('tracking') ||
          fieldName.includes('event') ||
          fieldName.includes('date') ||
          fieldName.includes('docket') ||
          fieldName.includes('delivery') ||
          fieldName.includes('shipment')
        ) {
          category = 'Status-Related';
        }

        return {
          ...mapping,
          category
        };
      }));

      // Clear edited mappings
      setEditedMappings({});

      alert('Mappings saved successfully!');
    } catch (err) {
      console.error('Error saving mappings:', err);
      alert(`Error saving mappings: ${err.message}`);
    } finally {
      setMappingLoading(false);
    }
  };

  // Filter mappings by category
  const filteredMappings = categoryFilter === 'all'
    ? mappingFields
    : mappingFields.filter(mapping => mapping.category === categoryFilter);

  if (loading && tmsFields.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse text-blue-600 text-center p-12">
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className={`border p-4 rounded-md mb-6 ${rlsError ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <h3 className="text-lg font-medium mb-2">{rlsError ? 'Supabase Configuration Issue' : 'Error Loading Settings'}</h3>
          <p>{error.message}</p>

          {error.details && (
            <div className={`mt-4 p-4 rounded text-sm ${rlsError ? 'bg-amber-100' : 'bg-red-100'}`}>
              <h4 className="font-medium mb-2">Error Details:</h4>
              <pre className="whitespace-pre-wrap">
                {typeof error.details === 'object'
                  ? JSON.stringify(error.details, null, 2)
                  : error.details}
              </pre>
            </div>
          )}

          {rlsError && (
            <div className="mt-4 p-4 bg-white border border-amber-200 rounded">
              <h4 className="font-medium mb-2">How to Fix:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Log in to your Supabase dashboard</li>
                <li>Go to the "Table Editor" section</li>
                <li>Select the <code className="bg-gray-100 px-1 py-0.5 rounded">tms_fields</code> table</li>
                <li>Click on the "Authentication" tab</li>
                <li>Toggle "Row Level Security (RLS)" to ON</li>
                <li>Click "Add Policy"</li>
                <li>Choose "Create a policy from scratch"</li>
                <li>
                  For a simple read-only policy:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Name: "Allow anonymous read access"</li>
                    <li>Policy definition: <code className="bg-gray-100 px-1 py-0.5 rounded">true</code> (to allow all reads)</li>
                    <li>Target roles: Leave blank or select "authenticated" and "anon"</li>
                    <li>Operation: SELECT</li>
                  </ul>
                </li>
                <li>Click "Save Policy"</li>
                <li>Repeat for INSERT, UPDATE, and DELETE operations if needed</li>
              </ol>
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </div>

      {couriersMissingFields.length > 0 && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Attention Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            {couriersMissingFields.length} couriers are missing mappings for new TMS fields.
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => setUpdateDialogOpen(true)}
            >
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="tms-fields" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="tms-fields">TMS Fields</TabsTrigger>
          <TabsTrigger value="courier-mappings">Courier Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="tms-fields">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>TMS Field Mappings</CardTitle>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New TMS Field</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newField.name}
                      onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g., delivery_date"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="displayName" className="text-right">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={newField.displayName}
                      onChange={(e) => setNewField({ ...newField, displayName: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g., Delivery Date"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newField.description}
                      onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                      className="col-span-3"
                      placeholder="Describe what this field represents"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dataType" className="text-right">
                      Data Type
                    </Label>
                    <Select
                      value={newField.dataType}
                      onValueChange={(value) => setNewField({ ...newField, dataType: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="object">Object</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isRequired" className="text-right">
                      Required
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch
                        id="isRequired"
                        checked={newField.isRequired}
                        onCheckedChange={(checked) => setNewField({ ...newField, isRequired: checked })}
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        Mark as required field
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddField} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Field'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Manage the TMS fields that can be mapped to courier API fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tmsFields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded border">
              <p className="text-gray-500">No TMS fields defined</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAddDialogOpen(true)}
              >
                Add Your First Field
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Display Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tmsFields.map((field) => (
                    <tr key={field.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {field.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {field.display_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {field.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {field.data_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {field.is_required ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentField(field);
                            setEditDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentField(field);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="courier-mappings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Courier Field Mappings</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="API-Related">API-Related</SelectItem>
                      <SelectItem value="Status-Related">Status-Related</SelectItem>
                      <SelectItem value="Normal / Config">Normal / Config</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription>
                View and edit field mappings for each courier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="courier-select" className="mb-2 block">
                  Select Courier
                </Label>
                <Select value={selectedCourierId} onValueChange={handleCourierChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Select a Courier --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Select a Courier --</SelectItem>
                    {couriers.map(courier => (
                      <SelectItem key={courier.id} value={courier.id}>
                        {courier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourier && (
                  <p className="mt-2 text-sm text-gray-500">
                    Viewing mappings for: <span className="font-medium">{selectedCourier.name}</span>
                  </p>
                )}
              </div>

              {mappingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-blue-600">Loading mapping fields...</div>
                </div>
              ) : mappingError ? (
                <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                  <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                  <p className="text-red-600">{mappingError.message}</p>
                  {mappingError.details && (
                    <pre className="mt-2 text-sm bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(mappingError.details, null, 2)}
                    </pre>
                  )}
                </div>
              ) : !selectedCourierId ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                  <p className="text-gray-500">Please select a courier to view its field mappings</p>
                </div>
              ) : filteredMappings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                  <p className="text-gray-500">No mapping fields found for this courier</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mapping Function / JSON Path
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TMS Field
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMappings.map((mapping) => (
                        <tr key={mapping.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {mapping.tms_field}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-500 max-w-xs truncate">
                            {mapping.api_field}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge
                              variant={
                                mapping.category === 'API-Related'
                                  ? 'success'
                                  : mapping.category === 'Status-Related'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {mapping.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Select
                              value={editedMappings[mapping.id] || mapping.tms_field}
                              onValueChange={(value) => handleMappingFieldChange(mapping.id, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tmsFields.map(field => (
                                  <SelectItem key={field.id} value={field.name}>
                                    {field.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {selectedCourierId && filteredMappings.length > 0 && Object.keys(editedMappings).length > 0 && (
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSaveMappings}
                  disabled={mappingLoading}
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {mappingLoading ? 'Saving...' : 'Save Mapping Changes'}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Field Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit TMS Field</DialogTitle>
          </DialogHeader>
          {currentField && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentField.name}
                  onChange={(e) => setCurrentField({ ...currentField, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-displayName" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="edit-displayName"
                  value={currentField.display_name}
                  onChange={(e) => setCurrentField({ ...currentField, display_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={currentField.description || ''}
                  onChange={(e) => setCurrentField({ ...currentField, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-dataType" className="text-right">
                  Data Type
                </Label>
                <Select
                  value={currentField.data_type}
                  onValueChange={(value) => setCurrentField({ ...currentField, data_type: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isRequired" className="text-right">
                  Required
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch
                    id="edit-isRequired"
                    checked={currentField.is_required}
                    onCheckedChange={(checked) => setCurrentField({ ...currentField, is_required: checked })}
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    Mark as required field
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditField} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Field Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete TMS Field</DialogTitle>
          </DialogHeader>
          {currentField && (
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete the field <strong>{currentField.display_name}</strong>?
              </p>
              <p className="text-red-600 mt-2">
                This action cannot be undone. All mappings using this field will also be deleted.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteField} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Couriers Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Couriers Missing Field Mappings</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              The following couriers are missing mappings for some TMS fields:
            </p>
            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Missing Fields
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {couriersMissingFields.map((item) => (
                    <tr key={item.courier.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.courier.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.missingFields.map((field) => (
                          <span key={field} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-2 mb-2">
                            {field}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-amber-50 rounded border border-amber-200">
              <div className="flex items-start">
                <InfoIcon className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium">Important Note</p>
                  <p className="text-amber-700 text-sm mt-1">
                    When new TMS fields are added, existing couriers do not automatically get these mappings.
                    You need to update each courier individually to map the new fields to their API responses.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleUpdateCouriers}>
              Update Courier Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
