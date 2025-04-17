import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { HeadContent } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "Bazaar Engine" },
    ],
    links: [
      { rel: "stylesheet", href: "/src/styles.css" },
    ],
  }),
  component: () => (
    <>
      <HeadContent />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
