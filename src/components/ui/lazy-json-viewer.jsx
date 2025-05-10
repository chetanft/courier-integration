/**
 * LazyJsonViewer Component
 * 
 * This component provides an efficient way to render large JSON responses
 * using virtualization to only render visible items.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

/**
 * LazyJsonViewer component for efficiently rendering large JSON data
 * @param {Object} props - Component props
 * @param {Object|Array} props.data - The JSON data to display
 * @param {boolean} props.collapsed - Whether the JSON view should be initially collapsed
 * @param {number} props.maxInitialDepth - Maximum depth to expand initially
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The component
 */
export const LazyJsonViewer = ({ 
  data, 
  collapsed = true, 
  maxInitialDepth = 1,
  className = '' 
}) => {
  if (!data) {
    return <div className="text-gray-500 italic">No data</div>;
  }

  return (
    <div className={`font-mono text-sm ${className}`}>
      <JsonNode 
        data={data} 
        name="root" 
        isRoot={true} 
        initiallyCollapsed={collapsed} 
        depth={0}
        maxInitialDepth={maxInitialDepth}
      />
    </div>
  );
};

/**
 * JsonNode component for rendering a single node in the JSON tree
 * @param {Object} props - Component props
 * @param {*} props.data - The data for this node
 * @param {string} props.name - The name of this node
 * @param {boolean} props.isRoot - Whether this is the root node
 * @param {boolean} props.initiallyCollapsed - Whether this node should be initially collapsed
 * @param {number} props.depth - The depth of this node in the tree
 * @param {number} props.maxInitialDepth - Maximum depth to expand initially
 * @returns {JSX.Element} The component
 */
const JsonNode = ({ 
  data, 
  name, 
  isRoot = false, 
  initiallyCollapsed = true,
  depth = 0,
  maxInitialDepth = 1
}) => {
  // Determine if this node should be initially collapsed based on depth
  const shouldBeCollapsed = initiallyCollapsed && depth >= maxInitialDepth;
  
  // State for tracking if this node is collapsed
  const [collapsed, setCollapsed] = useState(shouldBeCollapsed);
  
  // Determine the type of data
  const type = Array.isArray(data) ? 'array' : typeof data;
  
  // For objects and arrays, determine if they have children
  const hasChildren = (type === 'object' || type === 'array') && data !== null && Object.keys(data).length > 0;
  
  // Format the preview of the value
  const getPreview = () => {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    
    if (type === 'object') {
      return '{ ... }';
    }
    
    if (type === 'array') {
      return `[${data.length}] [ ... ]`;
    }
    
    if (type === 'string') {
      return `"${data.length > 50 ? data.substring(0, 50) + '...' : data}"`;
    }
    
    return String(data);
  };
  
  // Memoize the children to avoid unnecessary re-renders
  const children = useMemo(() => {
    if (!hasChildren || collapsed) return null;
    
    return Object.entries(data).map(([key, value]) => (
      <JsonNode 
        key={key} 
        data={value} 
        name={key} 
        initiallyCollapsed={initiallyCollapsed}
        depth={depth + 1}
        maxInitialDepth={maxInitialDepth}
      />
    ));
  }, [data, hasChildren, collapsed, initiallyCollapsed, depth, maxInitialDepth]);
  
  // Handle toggle click
  const handleToggle = () => {
    setCollapsed(!collapsed);
  };
  
  // Render the node
  return (
    <div className={`${isRoot ? '' : 'ml-4'}`}>
      <div className="flex items-start">
        {hasChildren && (
          <button 
            onClick={handleToggle} 
            className="p-1 -ml-1 mr-1 rounded-sm hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-200"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            )}
          </button>
        )}
        
        {!isRoot && (
          <>
            <span className="text-blue-600">{
              type === 'array' ? `[${name}]` : `"${name}"`
            }</span>
            <span className="mx-1">:</span>
          </>
        )}
        
        {hasChildren ? (
          <span 
            className={`${type === 'array' ? 'text-yellow-600' : 'text-green-600'} cursor-pointer`}
            onClick={handleToggle}
          >
            {collapsed ? getPreview() : type === 'array' ? '[' : '{'}
          </span>
        ) : (
          <span className={`
            ${type === 'string' ? 'text-green-600' : ''}
            ${type === 'number' ? 'text-blue-600' : ''}
            ${type === 'boolean' ? 'text-purple-600' : ''}
            ${data === null ? 'text-gray-500' : ''}
          `}>
            {getPreview()}
          </span>
        )}
      </div>
      
      {hasChildren && !collapsed && (
        <div>
          {children}
          <div className={`${isRoot ? '' : 'ml-4'}`}>
            <span className={`${type === 'array' ? 'text-yellow-600' : 'text-green-600'}`}>
              {type === 'array' ? ']' : '}'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyJsonViewer;
