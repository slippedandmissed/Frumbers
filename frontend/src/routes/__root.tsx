import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { MainContentLoading } from "../components/MainContentLoading";
import { ErrorBoundary } from "react-error-boundary";
import { MainContentError } from "../components/MainContentError";
import { FrumbersAppShell } from "../components/FrumbersAppShell";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <FrumbersAppShell>
      <ErrorBoundary
        fallbackRender={(props) => <MainContentError {...props} />}
      >
        <Suspense fallback={<MainContentLoading />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </FrumbersAppShell>
  );
}
