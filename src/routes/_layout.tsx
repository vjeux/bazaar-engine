import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout")({
  component: NavbarHeaderComponent,
});

function NavbarHeaderComponent() {
  return (
    <div className="grid h-screen grid-rows-[auto_1fr]">
      <nav className="h-16">
        Test nav bar
      </nav>
      <main className="overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
