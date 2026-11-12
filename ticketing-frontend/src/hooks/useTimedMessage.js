import { useCallback, useEffect, useState } from "react";

export default function useTimedMessage(duration = 15000) {
  const [state, setState] = useState({
    message: "",
    version: 0,
  });

  const show = useCallback((message) => {
    setState((previous) => ({
      message,
      version: previous.version + 1,
    }));
  }, []);

  const clear = useCallback(() => {
    setState((previous) => ({
      ...previous,
      message: "",
    }));
  }, []);

  useEffect(() => {
    if (!state.message) return;

    const timeout = window.setTimeout(() => {
      setState((previous) => {
        if (previous.version !== state.version) {
          return previous;
        }

        return {
          ...previous,
          message: "",
        };
      });
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [state.message, state.version, duration]);

  return {
    message: state.message,
    show,
    clear,
  };
}
