// Import mock data functions
import {
  getCouriers,
  addCourier,
  getClients,
  addClient,
  addFieldMapping,
  getFieldMappings,
  linkClientToCourier,
  getCourierClients,
  testCourierApi
} from './mock-data';

// Export all the mock functions
export {
  getCouriers,
  addCourier,
  getClients,
  addClient,
  addFieldMapping,
  getFieldMappings,
  linkClientToCourier,
  getCourierClients
};

// Note: This file now uses mock data instead of Supabase
// To switch back to Supabase, uncomment the code below and comment out the imports above

/*
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
// Replace with your Supabase URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Courier-related functions
export const getCouriers = async () => {
  const { data, error } = await supabase
    .from('couriers')
    .select('*');

  if (error) throw error;
  return data;
};

export const addCourier = async (courierData) => {
  const { data, error } = await supabase
    .from('couriers')
    .insert([courierData])
    .select();

  if (error) throw error;
  return data[0];
};

// Client-related functions
export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*');

  if (error) throw error;
  return data;
};

export const addClient = async (clientData) => {
  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select();

  if (error) throw error;
  return data[0];
};

// Mapping-related functions
export const addFieldMapping = async (mappingData) => {
  const { data, error } = await supabase
    .from('field_mappings')
    .insert([mappingData])
    .select();

  if (error) throw error;
  return data[0];
};

export const getFieldMappings = async (courierId, apiType) => {
  const { data, error } = await supabase
    .from('field_mappings')
    .select('*')
    .eq('courier_id', courierId)
    .eq('api_type', apiType);

  if (error) throw error;
  return data;
};

// Client-Courier mapping functions
export const linkClientToCourier = async (linkData) => {
  const { data, error } = await supabase
    .from('courier_client_links')
    .insert([linkData])
    .select();

  if (error) throw error;
  return data[0];
};

export const getCourierClients = async (courierId) => {
  const { data, error } = await supabase
    .from('courier_client_links')
    .select('client_id')
    .eq('courier_id', courierId);

  if (error) throw error;
  return data.map(link => link.client_id);
};
*/
