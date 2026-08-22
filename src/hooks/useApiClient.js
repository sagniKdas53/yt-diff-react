import { useContext, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { createApiClient } from "../api/client.js";
import { useApi } from "./useApi";

/**
 * The authenticated API client, bound to the live session.
 *
 * Rebuilt whenever `apiFetch` is — which is whenever the token changes — so a
 * client captured in an effect never posts with a stale credential.
 */
export function useApiClient() {
  const apiFetch = useApi();
  const { token } = useContext(AuthContext);

  return useMemo(
    () => createApiClient(apiFetch, Boolean(token)),
    [apiFetch, token],
  );
}
