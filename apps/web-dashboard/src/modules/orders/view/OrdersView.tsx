import { BellRing, CookingPot, PackageCheck, Phone, MapPin, StickyNote } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import { formatClock } from "@/shared/utils/time";

import { formatLkr, STATUS_LABELS, type KitchenOrder, type OrdersPage, type OrderStatus } from "../model/orders.model";

import OrderActions from "./components/OrderActions";

const STATUS_STYLE: Record<OrderStatus, string> = {
  placed: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  preparing: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
};

interface OrdersViewProps {
  data: OrdersPage;
  kitchenId: string;
}

export default function OrdersView({ data, kitchenId }: OrdersViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Customer Orders</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Orders</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Orders placed in the Verified Kitchen app. Accept new orders, then move each one forward; the customer
            follows every step live. Payment is cash on delivery.
          </p>
        </div>
        {/* New orders and changes appear within seconds. */}
        <LiveRefresh kitchenId={kitchenId} tables={["orders"]} minIntervalMs={2000} fallbackMs={20000} />
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={BellRing} label="New" value={data.counts.new} highlight={data.counts.new > 0} />
        <Stat icon={CookingPot} label="In progress" value={data.counts.inProgress} />
        <Stat icon={PackageCheck} label="Delivered (24 h)" value={data.counts.deliveredToday} />
      </section>

      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-slate-950">Active orders</h3>
        {data.active.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No active orders. New orders appear here automatically.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.active.map((o) => (
              <OrderCard key={o.id} order={o} data={data} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-slate-950">Finished in the last 24 hours</h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.recent.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3 font-mono text-xs">{o.reference}</td>
                    <td className="px-5 py-3">{o.customerName ?? "Customer"}</td>
                    <td className="px-5 py-3">{o.lines.reduce((n, l) => n + l.quantity, 0)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatLkr(o.totalLkr)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>
                        {o.status === "cancelled" && o.cancelledBy === "customer" ? "Cancelled by customer" : STATUS_LABELS[o.status]}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">{formatClock(o.updatedAt, data.timezone)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof BellRing;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-600" : ""}`} />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function OrderCard({ order: o, data }: { order: KitchenOrder; data: OrdersPage }) {
  const isNew = o.status === "placed";
  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${isNew ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-900">{o.reference}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>
              {STATUS_LABELS[o.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Placed {formatClock(o.placedAt, data.timezone)} · <LiveAge iso={o.placedAt} serverNow={data.generatedAt} />
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-slate-950">{formatLkr(o.totalLkr)}</p>
      </div>

      <ul className="mt-4 space-y-1 text-sm text-slate-800">
        {o.lines.map((l) => (
          <li key={l.name} className="flex justify-between gap-3">
            <span>
              <span className="font-semibold">{l.quantity}×</span> {l.name}
            </span>
            <span className="tabular-nums text-slate-500">{formatLkr(l.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex gap-2">
          <dt className="sr-only">Customer</dt>
          <dd className="font-medium text-slate-900">{o.customerName ?? "Customer"}</dd>
        </div>
        <div className="flex items-start gap-2 text-slate-600">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" />
          <dt className="sr-only">Phone</dt>
          <dd>
            <a href={`tel:${o.contactPhone.replace(/\s/g, "")}`} className="hover:underline">
              {o.contactPhone}
            </a>
          </dd>
        </div>
        <div className="flex items-start gap-2 text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <dt className="sr-only">Delivery address</dt>
          <dd>{o.deliveryAddress}</dd>
        </div>
        {o.note && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
            <dt className="sr-only">Note</dt>
            <dd>{o.note}</dd>
          </div>
        )}
      </dl>

      {data.canManage && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <OrderActions id={o.id} reference={o.reference} status={o.status} />
        </div>
      )}
    </article>
  );
}
