import BrowserGuard from "@/components/BrowserGuard";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata = {
  title: "Maths Class",
  description:
    "Mathematics student registration and QR attendance system",

    icons: {
    icon: "/matsh.png",
    shortcut: "/matsh.png",
    apple: "/matsh.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>

        <BrowserGuard />

        <div className="site-layout">
          <div className="site-content">
            {children}
          </div>

          <Footer />
        </div>

      </body>
    </html>
  );
}
