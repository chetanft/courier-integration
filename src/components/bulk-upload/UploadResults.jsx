import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { StatusBadge } from '../ui/status-badge';
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const UploadResults = ({ results }) => {
  const [expandedClients, setExpandedClients] = useState({});

  // Toggle expanded state for a client
  const toggleExpanded = (clientId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  // Check if results is an array or an object with a results property
  const resultsArray = Array.isArray(results) ? results : (results.results || []);

  console.log('UploadResults component received:', results);
  console.log('Using resultsArray:', resultsArray);

  // Calculate summary statistics
  const summary = {
    total: resultsArray.length,
    successful: resultsArray.filter(r => r.success).length,
    failed: resultsArray.filter(r => !r.success).length,
    couriersFound: resultsArray.reduce((sum, r) => sum + (r.couriers?.length || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Total Clients</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Successful</p>
              <p className="text-2xl font-bold text-green-600">{summary.successful}</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Couriers Found</p>
              <p className="text-2xl font-bold text-blue-600">{summary.couriersFound}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
          <TabsTrigger value="successful">Successful ({summary.successful})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({summary.failed})</TabsTrigger>
        </TabsList>

        {/* All Results */}
        <TabsContent value="all">
          <div className="space-y-4">
            {resultsArray.map((result) => (
              <ClientResultCard
                key={result.clientId || result.clientName}
                result={result}
                isExpanded={expandedClients[result.clientId]}
                toggleExpanded={() => toggleExpanded(result.clientId)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Successful Results */}
        <TabsContent value="successful">
          <div className="space-y-4">
            {resultsArray.filter(r => r.success).map((result) => (
              <ClientResultCard
                key={result.clientId || result.clientName}
                result={result}
                isExpanded={expandedClients[result.clientId]}
                toggleExpanded={() => toggleExpanded(result.clientId)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Failed Results */}
        <TabsContent value="failed">
          <div className="space-y-4">
            {resultsArray.filter(r => !r.success).map((result) => (
              <ClientResultCard
                key={result.clientId || result.clientName}
                result={result}
                isExpanded={expandedClients[result.clientId]}
                toggleExpanded={() => toggleExpanded(result.clientId)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Individual client result card
const ClientResultCard = ({ result, isExpanded, toggleExpanded }) => {
  return (
    <Card className={`border ${result.success ? 'border-green-200' : 'border-red-200'}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <CardTitle className="text-base">{result.clientName}</CardTitle>
            {result.success && (
              <StatusBadge status="client" className="ml-2" />
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={toggleExpanded}>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4">
          {result.success ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Found {result.couriers?.length || 0} couriers for this client
              </p>
              {result.couriers && result.couriers.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Couriers:</h4>
                  <ul className="text-sm space-y-1">
                    {result.couriers.map((courier, idx) => (
                      <li key={idx} className="flex items-center">
                        <span className="w-4 h-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                          {idx + 1}
                        </span>
                        {courier.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-amber-600">No couriers found for this client</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-red-500 mb-2">
                Error: {result.error || 'Unknown error occurred'}
              </p>
              {result.details && (
                <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default UploadResults;
