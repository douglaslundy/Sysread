import Link from "next/link";
import en from "@/messages/en.json";

export default function NotFound() {
  const copy = en.Public.notFound;

  return (
    <main className="center-page">
      <p>{copy.label}</p>
      <h1>404</h1>
      <Link className="primary-button" href="/">{copy.action}</Link>
    </main>
  );
}