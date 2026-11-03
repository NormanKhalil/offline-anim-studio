import { useCallback, useEffect, useState } from 'react';

/** Runs an async loader on mount / when deps change. Ignores results after unmount. */
export default function useAsync(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then(
      (data) => {
        if (active) setState({ loading: false, error: null, data });
      },
      (err) => {
        if (active) setState({ loading: false, error: (err && err.message) || 'Something went wrong.', data: null });
      }
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
