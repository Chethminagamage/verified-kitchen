import { PanelHeader, PANEL_CLASS } from "@/shared/components/ui/Panel";

import type { EnvironmentalSummary } from "../../model/reports.model";

interface EnvironmentalSummaryTableProps {
  data: EnvironmentalSummary[];
}

export default function EnvironmentalSummaryTable({
  data,
}: EnvironmentalSummaryTableProps) {
  return (
    <section className={`${PANEL_CLASS} overflow-hidden`}>
      <PanelHeader
        className="border-b border-slate-100 p-5 sm:p-6"
        title="Environmental summary"
        description={`Sensor readings over the last 7 days${data[0] ? ` (${data[0].samples.toLocaleString("en-GB")} readings)` : ""}.`}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80">
            <tr className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
              <th className="px-6 py-3 font-semibold">
                Metric
              </th>

              <th className="px-6 py-3 font-semibold">
                Average
              </th>

              <th className="px-6 py-3 font-semibold">
                Minimum
              </th>

              <th className="px-6 py-3 font-semibold">
                Maximum
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr
                key={item.id}
                className="text-sm text-slate-700 transition hover:bg-slate-50/60"
              >
                <td className="px-6 py-4 font-medium text-slate-950">
                  {item.metric}
                </td>

                <td className="px-6 py-4 tabular-nums">
                  {item.average === null ? "—" : `${item.average.toFixed(item.decimals)} ${item.unit}`}
                </td>

                <td className="px-6 py-4 tabular-nums">
                  {item.minimum === null ? "—" : `${item.minimum.toFixed(item.decimals)} ${item.unit}`}
                </td>

                <td className="px-6 py-4 tabular-nums">
                  {item.maximum === null ? "—" : `${item.maximum.toFixed(item.decimals)} ${item.unit}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}