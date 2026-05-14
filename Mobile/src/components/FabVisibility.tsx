import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Lightweight context that lets any screen temporarily hide the global
// WhatsApp FAB while it's mounted. Used by payment-style screens where
// the FAB's pulsing halo overlaps the primary CTA and obscures it.
type FabVisibility = {
  hidden: boolean;
  setHidden: (v: boolean) => void;
};

const FabVisibilityCtx = createContext<FabVisibility>({
  hidden: false,
  setHidden: () => {},
});

export function FabVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <FabVisibilityCtx.Provider value={{ hidden, setHidden }}>
      {children}
    </FabVisibilityCtx.Provider>
  );
}

export function useFabVisibility() {
  return useContext(FabVisibilityCtx);
}

// Convenience hook for screens that should hide the FAB on mount and
// restore it on unmount.
export function useHideFab() {
  const { setHidden } = useFabVisibility();
  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);
}
