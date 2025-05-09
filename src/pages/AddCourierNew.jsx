import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Stepper } from '../components/ui/stepper';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AuthenticationSetup from '../components/courier/AuthenticationSetup';
import CourierApiConfig from '../components/courier/CourierApiConfig';
import ResponseFieldMapping from '../components/courier/ResponseFieldMapping';
import { addCourier, addFieldMapping, uploadJsFile, getClientById, linkClientsToCourier } from '../lib/supabase-service';
import { generateJsConfig } from '../lib/js-generator-enhanced';
import { getTmsFields } from '../lib/edge-functions-service';

const AddCourierNew = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const searchParamsClientId = searchParams.get('clientId');
  const clientIdToUse = clientId || searchParamsClientId;
  const clientName = searchParams.get('clientName');
  // eslint-disable-next-line no-unused-vars
  const courierId = searchParams.get('courierId');
  const courierName = searchParams.get('courierName');

  // Client state
  const [client, setClient] = useState(null);

  // Form state
  const methods = useForm({
    defaultValues: {
      courier_name: courierName || '',
      auth: {
        type: 'none', // 'none', 'form', 'curl'
        method: 'POST',
        url: '',
        headers: [],
        body: {},
        tokenPath: 'access_token'
      },
      apis: [
        {
          label: 'Tracking API',
          method: 'GET',
          url: '',
          headers: [],
          body: {},
          queryParams: [],
          rootDataPath: ''
        }
      ]
    }
  });

  // Component state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [apiResponses, setApiResponses] = useState([]);
  const [courier, setCourier] = useState(null);
  const [tmsFields, setTmsFields] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [fieldMappings, setFieldMappings] = useState([]);
  const [jsFileGenerated, setJsFileGenerated] = useState(false);

  // Define steps for the stepper
  const steps = [
    { label: "Authentication", description: "Configure auth" },
    { label: "API Setup", description: "Configure APIs" },
    { label: "Field Mapping", description: "Map & generate JS" }
  ];

  // Load client data and TMS fields on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load TMS fields
        const fields = await getTmsFields();
        setTmsFields(fields);

        // Load client data if clientId is provided
        if (clientIdToUse) {
          const clientData = await getClientById(clientIdToUse);
          if (!clientData) {
            toast.error('Client not found');
            return;
          }
          setClient(clientData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load required data');
      }
    };

    loadData();
  }, [clientIdToUse]);

  // Handle authentication completion
  const handleAuthComplete = (token) => {
    console.log('Authentication completed with token:', token ? 'Token exists' : 'No token');
    setAuthToken(token || '');
    setCurrentStep(2);
    toast.success('Authentication completed successfully');
  };

  // Handle API configuration completion
  const handleApiConfigComplete = (responses) => {
    setApiResponses(responses);
    setCurrentStep(3);
  };

  // Handle field mapping completion and JS file generation
  const handleFieldMappingComplete = async (mappings) => {
    try {
      setLoading(true);

      // Save field mappings
      const savedMappings = [];
      for (const mapping of mappings) {
        if (mapping.tms_field) {
          const result = await addFieldMapping({
            courier_id: courier.id,
            tms_field: mapping.tms_field,
            api_field: mapping.api_field,
            api_type: mapping.api_type || 'track_shipment',
            data_type: mapping.data_type || 'string'
          });
          savedMappings.push(result);
        }
      }

      // Generate JS file
      const jsCode = generateJsConfig(courier, savedMappings);
      const fileName = `${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_mapping.js`;

      // Create download link
      const blob = new Blob([jsCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Upload to Supabase
      await uploadJsFile(courier.id, fileName, jsCode);

      setJsFileGenerated(true);
      toast.success('JS file generated and saved successfully');
    } catch (error) {
      console.error('Error generating JS file:', error);
      toast.error('Failed to generate JS file');
    } finally {
      setLoading(false);
    }
  };

  // Create courier in database after authentication step
  const createCourier = async (data) => {
    try {
      setLoading(true);

      // Extract auth details from form data
      const { auth, courier_name } = data;

      // Create courier object
      const courierData = {
        name: courier_name,
        api_base_url: '',
        auth_type: auth.type,
        api_key: auth.type === 'apikey' ? auth.apiKey : '',
        username: auth.type === 'basic' ? auth.username : '',
        password: auth.type === 'basic' ? auth.password : '',
        auth_endpoint: auth.type === 'form' ? auth.url : '',
        auth_method: auth.type === 'form' ? auth.method : 'POST'
      };

      // Add courier to database
      const result = await addCourier(courierData);

      // If client ID is provided, link courier to client
      if (clientIdToUse) {
        try {
          await linkClientsToCourier(result.id, [clientIdToUse]);
          toast.success(`Courier linked to client successfully`);
        } catch (linkError) {
          console.error('Error linking courier to client:', linkError);
          toast.error('Failed to link courier to client');
          // Continue even if linking fails
        }
      }

      setCourier(result);
      return result;
    } catch (error) {
      console.error('Error creating courier:', error);
      toast.error('Failed to create courier');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={() => clientIdToUse ? navigate(`/client/${clientIdToUse}`) : navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {clientIdToUse ? 'Back to Client' : 'Back'}
        </Button>
        <h1 className="text-2xl font-bold">
          {courierName ? `Configure ${courierName}` : 'Add New Courier'}
          {clientName ? ` for ${clientName}` : client?.name ? ` for ${client.name}` : ''}
        </h1>
      </div>

      <Stepper currentStep={currentStep} steps={steps} className="mb-6" />

      <FormProvider {...methods}>
        {currentStep === 1 && (
          <AuthenticationSetup
            onComplete={handleAuthComplete}
            createCourier={createCourier}
            loading={loading}
          />
        )}

        {currentStep === 2 && (
          <CourierApiConfig
            onComplete={handleApiConfigComplete}
            authToken={authToken}
            courier={courier}
            loading={loading}
          />
        )}

        {currentStep === 3 && (
          <ResponseFieldMapping
            onComplete={handleFieldMappingComplete}
            apiResponses={apiResponses}
            tmsFields={tmsFields}
            courier={courier}
            loading={loading}
          />
        )}

        {/* Success Message after JS file generation */}
        {jsFileGenerated && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                <h3 className="text-lg font-medium text-green-800 mb-2">JS File Generated Successfully!</h3>
                <p className="text-green-700 mb-4">
                  The JS file has been generated and saved. You can view it in the courier details page.
                </p>
                <div className="flex justify-end">
                  {clientIdToUse ? (
                    <Link to={`/client/${clientIdToUse}`}>
                      <Button variant="default">Return to Client</Button>
                    </Link>
                  ) : (
                    <Link to="/">
                      <Button variant="default">Return to Dashboard</Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </FormProvider>
    </div>
  );
};

export default AddCourierNew;
