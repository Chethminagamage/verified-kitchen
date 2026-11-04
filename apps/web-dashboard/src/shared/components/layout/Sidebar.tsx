import SidebarContent from "./SidebarContent";

/** Fixed sidebar on large screens; smaller screens use MobileNav in the header. */
export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
      <SidebarContent />
    </aside>
  );
}
