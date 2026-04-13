import { useContext } from 'react';
import { DataContext } from '../context/DataContext';

export const useDataLoader = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataLoader must be used within a DataProvider');
  }
  return context;
};

// Re-export any types if needed by external modules
export type { MasterIndexMeta } from './data/useCoreBadges';
