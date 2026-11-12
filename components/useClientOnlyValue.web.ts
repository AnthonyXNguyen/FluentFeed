import React from 'react';

// Nothing to subscribe to - the value never changes after hydration.
const subscribe = () => () => {};

// During server rendering and hydration React uses the server snapshot,
// then switches to the client snapshot right after - the same
// "server value first, client value once mounted" behavior as before,
// without a setState-in-effect.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return React.useSyncExternalStore<S | C>(
    subscribe,
    () => client,
    () => server
  );
}
