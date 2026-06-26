import { TransferForm } from "@/components/TransferForm";

/**
 * eWallet home route: the consumer-facing transfer experience guarded by the
 * behavioral risk firewall.
 */
export default function HomePage() {
  return (
    <div>
      <section className="mb-8">
        <h1 className="text-2xl font-bold">Your eWallet</h1>
        <p className="mt-1 text-ink-700">
          Send money as usual. Sentinel intercepts only the transfers that look like fraud.
        </p>
      </section>
      <TransferForm />
    </div>
  );
}
