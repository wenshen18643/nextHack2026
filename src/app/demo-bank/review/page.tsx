import ReviewCard from "./review_card";

/**
 * Query parameters accepted by the review page, all optional with demo-friendly
 * defaults so the page is testable by visiting the bare URL.
 */
interface ReviewSearchParams {
  payee?: string;
  amount?: string;
  memo?: string;
}

const default_payee = "AHMAD TRADING SDN BHD";
const default_amount = 5000;

/**
 * Bank-style review step for the demo bank. Values arrive via query string
 * from the transfer form (or are defaulted), mirroring how a real bank carries
 * the transfer into its pre-OTP confirmation screen.
 */
export default function DemoBankReviewPage({
  searchParams,
}: {
  searchParams: ReviewSearchParams;
}) {
  const parsed_amount = Number(searchParams.amount);
  return (
    <ReviewCard
      payee={searchParams.payee?.trim() || default_payee}
      amount={Number.isFinite(parsed_amount) && parsed_amount > 0 ? parsed_amount : default_amount}
      memo={searchParams.memo?.trim() ?? ""}
    />
  );
}
