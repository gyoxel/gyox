// Every page has the same night header — the browser's bar (theme-color)
// takes its colour so the app looks full screen.
import { HEADER_COLOR, SIMPLE_HEADER } from "./theme";

/** Runs in <head> after THEME_BOOT_SCRIPT, before the first paint: the
 *  browser's bar already has the header's colour (the simple theme's plain
 *  header colour with it) instead of a default one until hydration. */
export const THEME_COLOR_BOOT_SCRIPT = `(function(){try{var r=document.documentElement,d=r.classList.contains("dark"),c=r.classList.contains("simple")?${JSON.stringify(SIMPLE_HEADER)}:${JSON.stringify(HEADER_COLOR)};var m=document.createElement("meta");m.name="theme-color";m.content=d?c.dark:c.light;document.head.appendChild(m)}catch(e){}})();`;
