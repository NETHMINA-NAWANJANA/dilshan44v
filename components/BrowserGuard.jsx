"use client";

import { useEffect, useState } from "react";

export default function BrowserGuard() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const blockShortcut = (event) => {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const devShortcut =
        event.key === "F12" ||
        (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        (ctrlOrMeta && key === "u");

      if (devShortcut) {
        event.preventDefault();
        event.stopPropagation();
        setBlocked(true);
      }
    };

    const blockContextMenu = (event) => event.preventDefault();

    // Heuristic only: detects docked devtools in many desktop browsers.
    // It is intentionally NOT treated as a security boundary.
    const checkViewportGap = () => {
      // Desktop-only heuristic to reduce false positives on mobile browser chrome.
      const desktop = window.innerWidth >= 900 && window.matchMedia("(pointer: fine)").matches;
      if (!desktop) return setBlocked(false);
      const widthGap = Math.abs(window.outerWidth - window.innerWidth);
      const heightGap = Math.abs(window.outerHeight - window.innerHeight);
      setBlocked(widthGap > 220 || heightGap > 220);
    };

    window.addEventListener("keydown", blockShortcut, true);
    window.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("resize", checkViewportGap);

    const timer = window.setInterval(checkViewportGap, 1800);
    checkViewportGap();

    return () => {
      window.removeEventListener("keydown", blockShortcut, true);
      window.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("resize", checkViewportGap);
      window.clearInterval(timer);
    };
  }, []);

  if (!blocked) return null;

  return (
    <div className="inspect-blocker" role="alert" aria-live="assertive">
      <div className="inspect-blocker-card">
        <h2>Developer tools detected</h2>
        <p>Close the developer tools window to continue using this page.</p>
        <p className="muted small-text">
          Security-sensitive actions are also protected on the server, so this screen is only an extra deterrent.
        </p>
      </div>
    </div>
  );
}
