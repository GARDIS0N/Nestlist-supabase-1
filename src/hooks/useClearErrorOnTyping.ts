import { useEffect, useRef } from "react";

/**
 * Custom hook to automatically clear error messages when any of the monitored input values change.
 * Skips the initial render to ensure any errors present on mount are preserved.
 */
export function useClearErrorOnTyping(values: any[], clearError: () => void) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    clearError();
  }, values);
}
