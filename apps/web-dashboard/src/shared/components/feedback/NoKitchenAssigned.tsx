import { ChefHat } from "lucide-react";

interface NoKitchenAssignedProps {
  email: string;
}

export default function NoKitchenAssigned({
  email,
}: NoKitchenAssignedProps) {
  return (
    <section className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <ChefHat className="h-6 w-6 text-slate-500" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        No kitchen assigned yet
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Your account ({email}) is signed in, but it has
        not been given access to a kitchen. Ask an
        administrator to assign you to one.
      </p>
    </section>
  );
}
