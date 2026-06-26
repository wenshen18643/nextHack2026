import { OpsDashboard } from "@/components/OpsDashboard";

/**
 * Fraud-operations route: the analyst-facing dashboard of firewall decisions
 * and headline risk KPIs.
 */
export default function OpsPage() {
  return (
    <div>
      <section className="mb-8">
        <h1 className="text-2xl font-bold">Fraud Operations</h1>
        <p className="mt-1 text-ink-700">
          Live, explainable feed of every firewall decision with full signal attribution.
        </p>
      </section>
      <OpsDashboard />
    </div>
  );
}
