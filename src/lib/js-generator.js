/**
 * Generates a JavaScript configuration file for a courier based on the mappings
 * @param {Object} courier - The courier object
 * @param {Array} mappings - Array of field mappings
 * @returns {string} Generated JavaScript code
 */
export const generateJsConfig = (courier, mappings) => {
  // Group mappings by API type
  const mappingsByType = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.api_type]) {
      acc[mapping.api_type] = [];
    }
    acc[mapping.api_type].push(mapping);
    return acc;
  }, {});

  // Start building the JS file
  let jsCode = `const axios = require('axios');
const MappingHelper = require('../helper/mapping-helper');
const WebHelper = require('../helper/web-helper');
const RedisHelper = require('../helper/redis-helper');
const DateTimeHelper = require('../helper/date-time-helper');
const { ConfigAccessor } = require('@freighttiger/app');

const ${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}Mapping = {
`;

  // Add token generation if auth config exists
  if (courier.auth_config && Object.keys(courier.auth_config).length > 0) {
    jsCode += `  "generate_token_request": {
    "url": ConfigAccessor.getConfig('third_party_url', '${courier.name.toLowerCase()}_auth'),
    "method": "POST",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": (payload) => {
        const username = payload.config.user_name;
        const password = payload.config.password;
        return \`Basic \${Buffer.from(\`\${username}:\${password}\`).toString('base64')}\`;
      }
    },
    "body": "scope=server/waybillapps&grant_type=client_credentials"
  },
`;
  }

  // Add each API type mapping
  Object.keys(mappingsByType).forEach(apiType => {
    const typeMappings = mappingsByType[apiType];
    
    // Request mapping
    jsCode += `  "${apiType}_request": {
    "url": ConfigAccessor.getConfig('third_party_url', '${courier.name.toLowerCase()}_${apiType}'),
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"`;
    
    // Add authorization if token generation exists
    if (courier.auth_config && Object.keys(courier.auth_config).length > 0) {
      jsCode += `,
      "Authorization": async (payload) => {
        return await getToken(payload);
      }`;
    }
    
    jsCode += `
    },
    "body": {
      "docNo": async (payload) => {
        return payload?.data
      },
      "docType": "WB"
    }
  },
`;
    
    // Response mapping
    jsCode += `  "${apiType}_response": {
    "is_success": (payload) => {
      return payload?.shipment?.result === "success"
    },
    "error_message": (payload) => {
      return payload?.shipment?.error || null
    },
    "tracking_provider": "${courier.name.toLowerCase()}",`;
    
    // Add field mappings
    typeMappings.forEach(mapping => {
      jsCode += `
    "${mapping.tms_field}": (payload) => {
      return ${generatePathAccessor(mapping.api_field)}
    },`;
    });
    
    // Add timestamp
    jsCode += `
    "polling_response_received_at": (() => {
      return Date.now()
    })()
  },
`;
  });

  // Add getToken function if auth config exists
  if (courier.auth_config && Object.keys(courier.auth_config).length > 0) {
    jsCode += `};

async function getToken(payload){
  try {
    const key = \`ptl_${courier.name.toLowerCase()}_token_\${payload.config.company_fteid}\`;
    try{
      let redisData = await RedisHelper.getJsonValue(key)
      if(redisData) return redisData;
    }catch(error){
      this._logger.error(\`Error getting ${courier.name.toLowerCase()} token from redis for company \${payload.config.company_fteid}: \${error.message}\`);
    }
    const requestConfig = await MappingHelper.resolveMapping(
      ${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}Mapping.generate_token_request,
      payload
    );
    let response = await WebHelper.post(
      payload.req_id,        
      requestConfig.url,        
      null,                     
      requestConfig.body,       
      requestConfig.headers,    
      payload.polling_config.token_generation_retries,                       
      payload.polling_config.token_generation_timeout_ms                    
    );
    const token = response?.access_token;
    const expires_in = response?.expires_in || 86400; // 24 hours
    try {
      await RedisHelper.setJsonValue(key, token, expires_in)
    }catch(error){
      this._logger.error(\`Error setting ${courier.name.toLowerCase()} token in redis for company \${payload.config.company_fteid}: \${error.message}\`);
    }
    return token;
  } catch (error) {
    this._logger.error(\`Error in getToken for company \${payload.config.company_fteid}: \${error.message}\`);
    throw error;
  }
}`;
  } else {
    jsCode += `};`;
  }

  // Export the mapping
  jsCode += `

module.exports = ${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}Mapping;`;

  return jsCode;
};

/**
 * Generates code to access a value at a specific path
 * @param {string} path - The field path
 * @returns {string} JavaScript code to access the value
 */
const generatePathAccessor = (path) => {
  if (!path) return 'null';
  
  // Handle array notation
  if (path.includes('[]')) {
    const parts = path.split('.');
    let code = 'payload';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.endsWith('[]')) {
        const arrayKey = part.slice(0, -2);
        code += `?.${arrayKey}`;
        
        // If this is the last part, return the array
        if (i === parts.length - 1) {
          return code;
        }
        
        // Otherwise, we need to map over the array for the remaining path
        const remainingPath = parts.slice(i + 1).join('.');
        return `${code}?.map(item => item?.${remainingPath}) || []`;
      } else {
        code += `?.${part}`;
      }
    }
    
    return code;
  }
  
  // Regular path
  return `payload?.${path}`;
};
