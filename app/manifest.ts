import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shravanam Kirtanam · श्रवणं कीर्तनं",
    short_name: "Kirtanam",
    description: "Bhajans and katha clips from Pujya Shri Indresh Upadhyay Ji Maharaj's Bhagwat Katha.",
    start_url: "/",
    display: "standalone",
    background_color: "#2c040b",
    theme_color: "#4b0915",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
