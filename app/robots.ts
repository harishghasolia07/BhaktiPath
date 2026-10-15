import type { MetadataRoute } from "next";

// A shared-link fan collection: keep it out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
