import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "บ้านต้นไผ่ & ใบหลิว",
    short_name: "ต้นไผ่&ใบหลิว",
    description: "สั่งของเข้าบ้านต้นไผ่ & ใบหลิว แตะเลือกง่าย สรุปไว",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f2",
    theme_color: "#e1f6e8",
    lang: "th",
    icons: [
      { src: "/logo.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
