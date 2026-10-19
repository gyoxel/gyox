// The launch screen: on the first page of a visit — the installed app, or a
// phone's browser — the GX mark between a bundle of notes and the card, a
// bar filling, until the page is there; then it fades away. It's plain HTML
// and CSS shown by two inline scripts, so it never waits for the app's
// JavaScript and never holds the page back: it goes as soon as the page's
// content has arrived (after 0.7 s at the least, so it doesn't just flash).

/** In <head>, before the first paint: whether this load gets the launch
 *  screen (once per visit, not in the tab swipe's preload frames). */
export const LAUNCH_BOOT_SCRIPT = `(function(){try{if(window.self!==window.top)return;var s=sessionStorage;if(s.getItem("gx-launched"))return;s.setItem("gx-launched","1");var m=function(q){return matchMedia(q).matches};if(!m("(display-mode: standalone)")&&!m("(display-mode: fullscreen)")&&!m("(pointer: coarse)"))return;document.documentElement.classList.add("gx-launching")}catch(e){}})();`;

/** At the end of <body>: fades the launch screen once the page's content
 *  is there instead of the loading skeleton (streamed in after the shell),
 *  and at the latest after 8 s. */
const LAUNCH_END_SCRIPT = `(function(){var h=document.documentElement;if(!h.classList.contains("gx-launching"))return;var root=document.getElementById("page-root"),done=false,obs;var ready=function(){return !root||!!root.querySelector(':scope>:not([aria-busy="true"]):not(template):not(script)')};var end=function(){if(done)return;done=true;if(obs)obs.disconnect();setTimeout(function(){h.classList.add("gx-launched");setTimeout(function(){h.classList.remove("gx-launching","gx-launched")},420)},Math.max(0,700-performance.now()))};if(ready())end();else{obs=new MutationObserver(function(){if(ready())end()});obs.observe(root,{childList:true,subtree:true});setTimeout(end,8000)}})();`;

export function LaunchSplash() {
  return (
    <div id="gx-splash" aria-hidden="true">
      <div className="gx-splash-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/cash.png" alt="" width={132} height={68} className="gx-splash-cash" />
        <div className="gx-splash-logo">GX</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/card.png" alt="" width={132} height={75} className="gx-splash-card" />
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
