import { useContext } from "react";
import { PusherContext } from "../components/PusherContext";

export function usePusher() {
  return useContext(PusherContext);
}
