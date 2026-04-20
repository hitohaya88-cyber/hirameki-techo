import "./globals.css";

export const metadata = {
  title: "ひらめき手帳",
  description: "思いつきを最速で書いて、あとで使える発想に育てる",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}