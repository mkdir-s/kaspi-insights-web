import type { Metadata } from "next";
import "./globals.css";

const publicUrl = "https://mkdir-s.github.io/kaspi-insights-web/";

export const metadata: Metadata = {
  metadataBase: new URL(publicUrl),
  title: "Kaspi Insights — финансовая аналитика выписки",
  description: "Приватный локальный анализ выписки Kaspi Gold: графики, категории, переводы и красивый отчёт.",
  openGraph: {
    title: "Kaspi Insights",
    description: "Вся финансовая картина — из одной выписки",
    type: "website",
    url: publicUrl,
    images: [{ url: `${publicUrl}og.png`, width: 1672, height: 941, alt: "Kaspi Insights — финансовый дашборд" }],
  },
  twitter: { card: "summary_large_image", title: "Kaspi Insights", description: "Вся финансовая картина — из одной выписки", images: [`${publicUrl}og.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
