"use client";

import { useEffect } from "react";
import { getAccount, refreshAccount } from "@/lib/account-client";

/** Rendered only on the signed-in page: makes sure the header and likes know about the new session. */
export function SyncAccount() {
  useEffect(() => {
    if (getAccount().status !== "in") refreshAccount();
  }, []);
  return null;
}
