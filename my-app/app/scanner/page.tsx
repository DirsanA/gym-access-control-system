import { ScannerTerminal } from "@/components/scanner/scanner-terminal";

export const metadata = {
  title: "Turnstile Gate Scanner | Elite Fitness Club",
  description: "Contactless optical QR scanner terminal for turnstile admission at Elite Fitness Addis Ababa.",
};

export default function ScannerPage() {
  return <ScannerTerminal />;
}
