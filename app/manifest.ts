import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "บ้านเราซื้ออะไร",
    short_name: "บ้านเรา",
    description: "สั่งของเข้าบ้านแบบแตะเลือก ไม่ต้องพิมพ์ซ้ำ",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f2",
    theme_color: "#e1f6e8",
    lang: "th",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
