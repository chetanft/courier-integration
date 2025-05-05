import React from 'react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

const JsonViewer = ({ data, className }) => {
  return (
    <div className={className}>
      <JsonView data={data} />
    </div>
  );
};

export { JsonViewer };
