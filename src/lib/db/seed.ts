import type { BehaviorProfile, Transaction } from "@/lib/risk/types";

/**
 * Synthetic dataset for the Sentinel demo. It models a small set of users with
 * realistic baselines plus recent transaction histories that exercise every
 * firewall state. Centralizing it here keeps the in-memory repository, the
 * Supabase seed path, and unit tests aligned on one source of truth.
 */

export interface SeedUser {
  id: string;
  name: string;
}

export interface SeedDataset {
  users: SeedUser[];
  profiles: BehaviorProfile[];
  transactions: Transaction[];
}

const seed_users: SeedUser[] = [
  { id: "user_aisha", name: "Aisha Rahman" },
  { id: "user_daniel", name: "Daniel Lim" },
];

const seed_profiles: BehaviorProfile[] = [
  {
    user_id: "user_aisha",
    avg_amount: 220,
    stddev_amount: 60,
    common_payees: ["payee_landlord", "payee_grocer", "payee_sister"],
    active_hours: [7, 8, 12, 13, 18, 19, 20, 21],
    known_devices: ["device_aisha_phone"],
  },
  {
    user_id: "user_daniel",
    avg_amount: 150,
    stddev_amount: 40,
    common_payees: ["payee_gym", "payee_cafe", "payee_roommate"],
    active_hours: [9, 10, 11, 12, 17, 18, 19, 22],
    known_devices: ["device_daniel_phone", "device_daniel_tablet"],
  },
];

const seed_transactions: Transaction[] = [
  {
    id: "txn_seed_1",
    user_id: "user_aisha",
    payee: "payee_grocer",
    amount: 240,
    device: "device_aisha_phone",
    geo: "MY",
    created_at: "2026-06-25T18:30:00.000Z",
  },
  {
    id: "txn_seed_2",
    user_id: "user_aisha",
    payee: "payee_landlord",
    amount: 1200,
    device: "device_aisha_phone",
    geo: "MY",
    created_at: "2026-06-01T08:05:00.000Z",
  },
  {
    id: "txn_seed_3",
    user_id: "user_daniel",
    payee: "payee_cafe",
    amount: 28,
    device: "device_daniel_phone",
    geo: "MY",
    created_at: "2026-06-26T10:15:00.000Z",
  },
];

/**
 * Returns a deep-ish copy of the synthetic dataset, safe for a consumer to
 * mutate without corrupting the canonical seed arrays.
 *
 * @returns The users, behavioral profiles, and seed transactions.
 */
export function build_seed_dataset(): SeedDataset {
  return {
    users: seed_users.map((user) => ({ ...user })),
    profiles: seed_profiles.map((profile) => ({
      ...profile,
      common_payees: [...profile.common_payees],
      active_hours: [...profile.active_hours],
      known_devices: [...profile.known_devices],
    })),
    transactions: seed_transactions.map((transaction) => ({ ...transaction })),
  };
}

/**
 * Prints a summary of the seed dataset. Wired to `npm run db:seed` so the
 * dataset can be validated from the command line without a live database.
 */
function report_seed_summary(): void {
  const dataset = build_seed_dataset();
  console.log("Sentinel seed dataset");
  console.log(`  users:        ${dataset.users.length}`);
  console.log(`  profiles:     ${dataset.profiles.length}`);
  console.log(`  transactions: ${dataset.transactions.length}`);
}

const is_direct_invocation =
  typeof process !== "undefined" && process.argv[1]?.includes("seed");

if (is_direct_invocation) {
  report_seed_summary();
}
