import React from 'react';
import { LoadingScreen } from './app/LoadingScreen';
import { AppViewRouter } from './app/AppViewRouter';
import { useAppController } from './app/useAppController';

// Layout configuration overrides for specific badge groups
// (left here intentionally in the file history; currently unused and removed to keep build clean)
/*
const layoutOverrides = {
  '1.1': {
    tallOn: ['1.1.1', '1.1.2', '1.1.3'],
    textMaxEm: 32
  },
  '1.2': {
    tallOn: ['1.2.1', '1.2.2', '1.2.3'],
    textMaxEm: 32
  },
  '1.3': {
    tallOn: ['1.3.1', '1.3.2', '1.3.3'],
    textMaxEm: 32
  },
  '1.4': {
    tallOn: ['1.4.1', '1.4.2'],
    textMaxEm: 32
  },
  '1.5': {
    tallOn: ['1.5.1', '1.5.2', '1.5.3'],
    textMaxEm: 32
  },
  '2.1': {
    tallOn: ['2.1.1', '2.1.2'],
    textMaxEm: 32
  },
  '2.2': {
    tallOn: ['2.2.1', '2.2.2'],
    textMaxEm: 32
  },
  '2.3': {
    tallOn: ['2.3.1', '2.3.2'],
    textMaxEm: 32
  },
  '2.4': {
    tallOn: ['2.4.1', '2.4.2'],
    textMaxEm: 32
  },
  '2.5': {
    tallOn: ['2.5'],
    textMaxEm: 32
  },
  '2.6': {
    tallOn: ['2.6.1', '2.6.2'],
    textMaxEm: 32
  },
  '2.7': {
    tallOn: ['2.7.1', '2.7.2'],
    textMaxEm: 32
  },
  '2.8': {
    tallOn: ['2.8.1', '2.8.2'],
    textMaxEm: 32
  },
  '2.9': {
    tallOn: ['2.9.1', '2.9.2'],
    textMaxEm: 32
  },
  // Category 3 - Media Badges
  '3.1': {
    tallOn: ['3.1.1', '3.1.2', '3.1.3'],
    textMaxEm: 32
  },
  '3.2': {
    tallOn: ['3.2.1', '3.2.2', '3.2.3'],
    textMaxEm: 32
  },
  '3.3': {
    tallOn: ['3.3.1', '3.3.2', '3.3.3'],
    textMaxEm: 32
  },
  // Category 4 - Camp Activities
  '4.1': {
    tallOn: ['4.1'],
    textMaxEm: 32
  },
  '4.2': {
    tallOn: ['4.2.1', '4.2.2', '4.2.3'],
    textMaxEm: 32
  },
  '4.3': {
    tallOn: ['4.3.1', '4.3.2', '4.3.3'],
    textMaxEm: 32
  },
  '4.4': {
    tallOn: ['4.4.1', '4.4.2', '4.4.3'],
    textMaxEm: 32
  },
  // Category 5 - Squad Activities
  '5.1': {
    tallOn: ['5.1.1', '5.1.2', '5.1.3'],
    textMaxEm: 32
  },
  '5.2': {
    tallOn: ['5.2'],
    textMaxEm: 32
  },
  '5.3': {
    tallOn: ['5.3'],
    textMaxEm: 32
  },
                '5.4': {
                tallOn: ['5.4.1', '5.4.2', '5.4.3'],
                textMaxEm: 32
              },
              '5.5': {
                tallOn: ['5.5.1', '5.5.2', '5.5.3'],
                textMaxEm: 32
              },
              '5.6': {
                tallOn: ['5.6.1', '5.6.2', '5.6.3'],
                textMaxEm: 32
              },
                             '5.7': {
                 tallOn: ['5.7.1', '5.7.2', '5.7.3'],
                 textMaxEm: 32
               },
               // Category 6 - Harmony and Order
               '6.1': {
                 tallOn: ['6.1.1', '6.1.2', '6.1.3'],
                 textMaxEm: 32
               },
               '6.2': {
                 tallOn: ['6.2.1', '6.2.2', '6.2.3'],
                 textMaxEm: 32
               },
               '6.3': {
                 tallOn: ['6.3.1', '6.3.2', '6.3.3'],
                 textMaxEm: 32
               },
               '6.4': {
                 tallOn: ['6.4.1', '6.4.2', '6.4.3'],
                 textMaxEm: 32
               }
  // Add more groups as needed
};
*/

const App: React.FC = () => {
  const controller = useAppController();

  return (
    <div className="app">
      <AppViewRouter controller={controller} fallback={<LoadingScreen />} />
    </div>
  );
};

export default App;
