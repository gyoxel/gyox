// The launch screen: on the first page of a visit — the installed app, or a
// phone's browser — it takes over from Android's own splash looking the
// same, then the GX mark settles small, a bar fills under it and notes and
// cards drift faintly behind, until the page is there; then it fades away.
// It's plain HTML and CSS shown by two inline scripts, so it never waits for
// the app's JavaScript and never holds the page back: it goes as soon as the
// page's content has arrived (after 0.9 s at the least, so the mark has
// settled).

import type React from "react";
import { SPLASH_BAR } from "@/lib/theme";

/** In <head>, before the first paint: whether this load gets the launch
 *  screen (once per visit, not in the tab swipe's preload frames). */
export const LAUNCH_BOOT_SCRIPT = `(function(){try{if(window.self!==window.top)return;var s=sessionStorage;if(s.getItem("gx-launched"))return;s.setItem("gx-launched","1");var m=function(q){return matchMedia(q).matches};if(!m("(display-mode: standalone)")&&!m("(display-mode: fullscreen)")&&!m("(pointer: coarse)"))return;document.documentElement.classList.add("gx-launching");var bar=document.querySelector('meta[name="theme-color"]');if(bar)bar.content="${SPLASH_BAR}"}catch(e){}})();`;

/** At the end of <body>: fades the launch screen once the page's content
 *  is there instead of the loading skeleton (streamed in after the shell),
 *  and at the latest after 8 s. */
const LAUNCH_END_SCRIPT = `(function(){var h=document.documentElement;if(!h.classList.contains("gx-launching"))return;var root=document.getElementById("page-root"),done=false,obs;var ready=function(){return !root||!!root.querySelector(':scope>:not([aria-busy="true"]):not(template):not(script)')};var end=function(){if(done)return;done=true;if(obs)obs.disconnect();setTimeout(function(){h.classList.add("gx-launched");setTimeout(function(){h.classList.remove("gx-launching","gx-launched")},420)},Math.max(0,900-performance.now()))};if(ready())end();else{obs=new MutationObserver(function(){if(ready())end()});obs.observe(root,{childList:true,subtree:true});setTimeout(end,8000)}})();`;

/** Notes and cards drifting softly behind (left/top in %, width in px,
 *  tilt in deg, how long one sway lasts in s). */
const DRIFT: { card?: boolean; x: number; y: number; w: number; tilt: number; s: number }[] = [
  { x: 4, y: 5, w: 74, tilt: -18, s: 7 },
  { card: true, x: 42, y: 3, w: 48, tilt: 8, s: 9 },
  { card: true, x: 74, y: 7, w: 66, tilt: 14, s: 8 },
  { card: true, x: 16, y: 21, w: 54, tilt: -10, s: 10 },
  { x: 72, y: 23, w: 60, tilt: 20, s: 7.5 },
  { x: -6, y: 38, w: 84, tilt: 12, s: 9.5 },
  { card: true, x: 84, y: 41, w: 70, tilt: -16, s: 8.5 },
  { card: true, x: 4, y: 60, w: 62, tilt: 22, s: 7 },
  { x: 70, y: 61, w: 76, tilt: -12, s: 10 },
  { x: 32, y: 74, w: 58, tilt: 16, s: 8 },
  { card: true, x: 76, y: 80, w: 58, tilt: -22, s: 9 },
  { x: 2, y: 84, w: 70, tilt: -8, s: 8.5 },
  { card: true, x: 46, y: 90, w: 52, tilt: 10, s: 7.5 },
];

export function LaunchSplash() {
  return (
    <div id="gx-splash" aria-hidden="true">
      <div className="gx-splash-drift">
        {DRIFT.map((d, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={d.card ? "/icons/card.png" : "/icons/cash.png"}
            alt=""
            width={132}
            height={d.card ? 75 : 68}
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.w,
                "--tilt": `${d.tilt}deg`,
                "--sway": `${d.s}s`,
                "--from": `${-((i * 1.7) % d.s)}s`,
                "--dx": `${i % 2 ? 14 : -14}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="gx-splash-logo">
        <span>GX</span>
      </div>
      <p className="gx-splash-name">GX Salaire</p>
      <div className="gx-splash-bar">
        <span />
      </div>
    </div>
  );
}

export function LaunchSplashEnd() {
  return <script dangerouslySetInnerHTML={{ __html: LAUNCH_END_SCRIPT }} />;
}
