import { StrictMode, Suspense, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";
import { MainContentError } from "./components/MainContentError";
import { MainContentLoading } from "./components/MainContentLoading";
import { createPusher } from "./utils/pusher";
import { PusherContext } from "./components/PusherContext";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const router = createRouter({
  routeTree,
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

export function App() {
  const pusher = useMemo(() => createPusher(), []);
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary
          fallbackRender={(props) => <MainContentError {...props} />}
        >
          <Suspense fallback={<MainContentLoading />}>
            <PusherContext value={pusher}>
              <RouterProvider router={router} />
            </PusherContext>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>
    </MantineProvider>
  );
}
