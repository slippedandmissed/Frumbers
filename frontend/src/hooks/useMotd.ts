import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";

export function useMotd() {
  const { data } = useSuspenseQuery({
    queryKey: ["motd"],
    queryFn: async () => {
      const response = await api.motd.get();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });

  return data;
}
