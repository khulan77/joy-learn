import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Joy Learn — Хамтдаа учрыг нь олъё",
  description:
    "3-р ангийн математикийг алхам алхмаар, өөрийн хурдаар суралцаарай.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
