import React from 'react';

import { BiasTable } from './BiasTable';

const BiasTableWrapper: React.FC = () => {
  return (
    <div className="bias-table-wrapper">
      
      {/* ✅ BiasTable now reads/writes Zustand directly, no props needed */}
      <BiasTable />
    </div>
  );
};

export default BiasTableWrapper;
