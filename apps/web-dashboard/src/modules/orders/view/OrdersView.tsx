import { BellRing, CookingPot, History, Inbox, PackageCheck, Phone, MapPin, StickyNote } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import EmptyState from "@/shared/components/ui/EmptyState";
import PageHeader from "@/shared/components/ui/PageHeader";
import { Panel, PANEL_CLASS } from "@/shared/components/ui/Panel";
import SectionHeader from "@/shared/components/ui/SectionHeader";
import StatTile from "@/shared/components/ui/StatTile";
import StatusPill from "@/shared/components/ui/StatusPill";
import type { Tone } from "@/shared/components/ui/tone";
import { formatClock } from "@/shared/utils/time";

import { formatLkr, STATUS_LABELS, type KitchenOrder, type OrdersPage, type OrderStatus } from "../model/orders.model";

import OrderActions from "./components/OrderActions";

/** New orders need action (warning); orders in progress are informational. */
const STATUS_TONE: Record<OrderStatus, Tone> = {
  placed: "warning",
  accepted: "info",
  preparing: "info",
  on_the_way: "info",
  delivered: "positive",
  cancelled: "neutral",
};

interface OrdersViewProps {
  data: OrdersPage;
  kitchenId: string;
}

export default function OrdersView({ data, kitchenId }: OrdersViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Customer orders"
        title="Orders"
        description="Orders placed in the Verified Kitchen app. Accept new orders, then move each one forward; the customer follows every step live. Payment is cash on delivery."
        aside={
          // New orders and changes appear within seconds.
          <LiveRefresh kitchenId={kitchenId} tables={["orders"]} minIntervalMs={2000} fallbackMs={20000} />
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={BellRing} label="New" value={data.counts.new} tone={data.counts.new > 0 ? "warning" : "neutral"} />
        <StatTile icon={CookingPot} label="In progress" value={data.counts.inProgress} tone="info" />
        <StatTile icon={PackageCheck} label="Delivered (24 h)" value={data.counts.deliveredToday} tone="positive" />
      </section>

      <section className="mt-10">
        <SectionHeader title="Active orders" />
        {data.active.length === 0 ? (
          <Panel>
            <EmptyState icon={Inbox} title="No active orders">
              New orders appear here automatically.
            </EmptyState>
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.active.map((o) => (
              <OrderCard key={o.id} order={o} data={data} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeader title="Finished in the last 24 hours" />
        {data.recent.length === 0 ? (
          <Panel>
            <EmptyState icon={History} title="Nothing finished yet" compact>
              Delivered and cancelled orders from the last 24 hours appear here.
            </EmptyState>
          </Panel>
        ) : (
          <div className={`${PANEL_CLASS} overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.08em] text-slate-500">
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
                      <StatusPill tone={STATUS_TONE[o.status]} icon={null}>
                        {o.status === "cancelled" && o.cancelledBy === "customer" ? "Cancelled by customer" : STATUS_LABELS[o.status]}
                      </StatusPill>
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

function OrderCard({ order: o, data }: { order: KitchenOrder; data: OrdersPage }) {
  const isNew = o.status === "placed";
  return (
    <article
      className={`p-5 ${isNew ? "rounded-2xl border border-amber-300 bg-white shadow-card ring-2 ring-amber-100" : PANEL_CLASS}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-900">{o.reference}</span>
            <StatusPill tone={STATUS_TONE[o.status]} icon={null}>
              {STATUS_LABELS[o.status]}
            </StatusPill>
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
