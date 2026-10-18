// A person's own video can be kept private or offered to the public Katha Sangraha, where the admin approves it.
export type Submission = "pending" | "approved" | "rejected";

/** What a video's submission becomes when the owner saves it with "Public" (true) or "Private" (false).
 *  An approved video stays approved: its public copy belongs to the collection now. */
export function nextSubmission(current: Submission | null | undefined, wantsPublic: boolean): Submission | null {
  if (current === "approved") return "approved";
  return wantsPublic ? "pending" : null;
}
