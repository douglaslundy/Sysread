import type { MetadataRoute } from "next";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { platformName } = await getPlatformSettings();
  return {
    background_color: "#000000",
    categories: ["education", "productivity"],
    description: "Leitura focada e inteligente",
    display: "standalone",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    lang: "pt-BR",
    name: platformName + " - Leitura focada e inteligente",
    orientation: "any",
    scope: "/",
    short_name: platformName,
    start_url: "/",
    theme_color: "#000000",
  };
}
