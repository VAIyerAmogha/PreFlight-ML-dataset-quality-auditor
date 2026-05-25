import "./globals.css";

export const metadata = {
  title: "PreFlightML",
  description: "ML dataset quality auditor"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
