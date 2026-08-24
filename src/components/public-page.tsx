import Link from "next/link";
import { defaultPlatformName } from "@/config/platform";

export function PublicPage({ title, eyebrow, children, platformName = defaultPlatformName }: { title: string; eyebrow?: string; children: React.ReactNode; platformName?: string }) {
  return <main className="public-page"><Link href="/" className="brand">{platformName}</Link>{eyebrow ? <p>{eyebrow}</p> : null}<h1>{title}</h1>{children}</main>;
}
