/**
 * Runs before first paint to stamp the theme on <html>, so switching to dark
 * never flashes a white page. Kept as a raw string because it must execute
 * synchronously, ahead of React hydration.
 *
 * Defaults to light rather than following the OS — the app opens light on a
 * fresh device regardless of system preference; dark is an explicit choice
 * via the nav toggle or Settings → Appearance ("System" is still available
 * there for anyone who wants OS-follow behaviour).
 */
const script = `(function () {
  try {
    var stored = localStorage.getItem('soyo-theme') || 'light';
    var dark = stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';

    var accent = localStorage.getItem('soyo-accent');
    if (accent) document.documentElement.style.setProperty('--accent', accent);
  } catch (e) {}
})();`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
