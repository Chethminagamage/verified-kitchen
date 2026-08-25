import type {
  EnvironmentalSummary,
} from "../../model/reports.model";

interface EnvironmentalSummaryTableProps {
  data: EnvironmentalSummary[];
}

export default function EnvironmentalSummaryTable({
  data,
}: EnvironmentalSummaryTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Environmental Summary
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Environmental monitoring statistics for the
          selected reporting period.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-xs uppercase tracking-wide text-slate-500">
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
                className="text-sm text-slate-700"
              >
                <td className="px-6 py-4 font-medium text-slate-950">
                  {item.metric}
                </td>

                <td className="px-6 py-4">
                  {item.average}
                  {item.unit}
                </td>

                <td className="px-6 py-4">
                  {item.minimum}
                  {item.unit}
                </td>

                <td className="px-6 py-4">
                  {item.maximum}
                  {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}