// MockFeed.tsx
import { useEffect } from 'react';
import { useStore } from '../system/store';

export function MockFeed() {
  const setFeed = useStore((state) => state.setFeed);

  useEffect(() => {
    const mock = {
      AUDCAD_i: {
        M1: { bias: -1.5, momentum: 0.0001 },
        M5: { bias: -1.3, momentum: 0.0 },
        M15: { bias: -1.2, momentum: -0.0004 },
        M30: { bias: -0.6, momentum: -0.0007 },
        H1: { bias: -0.3, momentum: 0.0004 },
        H4: { bias: 2.0, momentum: -0.002 },
        D1: { bias: 3.8, momentum: -0.0062 }
      },
      EURUSD_i: {
        M1: { bias: 1.2, momentum: 0.3 },
        M5: { bias: 0.8, momentum: 0.1 },
        M15: { bias: 0.5, momentum: 0.05 },
        M30: { bias: 0.2, momentum: 0.02 },
        H1: { bias: -0.5, momentum: -0.1 },
        H4: { bias: -1.0, momentum: -0.2 },
        D1: { bias: -1.5, momentum: -0.3 }
      }
    };

    console.log('Injecting mock feed:', mock);
    setFeed(mock);
  }, [setFeed]);

  return null;
}
