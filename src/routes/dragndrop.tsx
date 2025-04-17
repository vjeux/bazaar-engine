import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dragndrop")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/dragndrop"!</div>;
}
