import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/lib/api";

export function useApiHealth(enabled = true) {
  return useQuery({
    queryKey: ["api", "health"],
    queryFn: fetchHealth,
    staleTime: 20_000,
    retry: 1,
    enabled,
  });
}
