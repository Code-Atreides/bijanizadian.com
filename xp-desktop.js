/*!
 * xp-desktop.js — drop-in retro desktop UI (self-contained: CSS, icons, wallpaper, behavior)
 *
 * Usage (plain HTML):
 *   <div id="desk" style="height:100vh"></div>
 *   <script src="xp-desktop.js"></script>
 *   <script>
 *     XPDesktop.mount('#desk', {
 *       name: 'Bijan Izadian', subtitle: 'New York City', mark: 'B',
 *       items: [
 *         { id: 'about', label: 'About', icon: 'notepad', title: 'About', body: '<p>…</p>', openOnLoad: true },
 *         { id: 'fomo',  label: 'fomo',  icon: 'bell',    title: 'fomo',  body: '<p>…</p>', link: 'https://fomo.family', linkLabel: 'Open fomo' },
 *         { id: 'bin',   label: 'Recycle Bin', icon: 'bin', title: 'Recycle Bin', body: '<p>Empty.</p>', corner: true }
 *       ],
 *       startLeft:  ['about', { label: 'GitHub', desc: 'Code', href: 'https://github.com/you', icon: 'form' }],
 *       startHeading: 'Projects',
 *       startRight: ['fomo']
 *     });
 *   </script>
 *
 * Usage (React / Vite):
 *   import './xp-desktop.js';
 *   useEffect(() => { const d = window.XPDesktop.mount(ref.current, config); return () => d.destroy(); }, []);
 *
 * Item fields: id, label, icon, title, body (HTML), link, linkLabel, extra [{label, href}],
 *              status (small grey text after the title), corner (bottom-right), openOnLoad, menuDesc
 * Built-in icons: notepad, globe, cup, building, form, mail, doc, bin, bell, art — or pass raw '<svg …>' markup.
 * Options: name, subtitle, mark (letter in the start button), wallpaper ('hill' | any CSS background | false),
 *          startLeft / startRight (item ids or {label, desc, href, icon}), startHeading.
 * mount() returns { open(id), close(id), closeAll(), destroy(), root }.
 * The host element controls the size — give it a height.
 */
(function (global) {
  'use strict';

  var CSS = '\
.xpd{position:relative;width:100%;height:100%;min-height:480px;overflow:hidden;background:#245edb;color:#000;font:11px/1.4 Tahoma,Verdana,"Segoe UI",Geneva,sans-serif;-webkit-font-smoothing:antialiased;\
  --xpd-title-a:#4a9cff;--xpd-title-b:#0058ee;--xpd-title-c:#0349cc;--xpd-frame:#0a52e0;--xpd-frame-off:#7ea3ec;--xpd-taskbar:#245edb;--xpd-tray:#0f83dc;\
  --xpd-start:#3c9d2a;--xpd-start-hi:#5dbd45;--xpd-face:#ece9d8;--xpd-sel:#316ac5;--xpd-link:#0033cc;--xpd-display:"Trebuchet MS",Tahoma,Verdana,sans-serif}\
.xpd *,.xpd *::before,.xpd *::after{box-sizing:border-box}\
.xpd button{font:inherit;color:inherit}\
.xpd a{color:var(--xpd-link)}\
.xpd [hidden]{display:none!important}\
.xpd-sprite{position:absolute;width:0;height:0;overflow:hidden}\
.xpd-desktop{position:absolute;inset:0 0 30px 0;overflow:hidden}\
.xpd-wall{position:absolute;inset:0;width:100%;height:100%;display:block}\
.xpd-icons{position:absolute;inset:12px}\
.xpd-icon{position:absolute;width:78px;padding:6px 2px 5px;display:flex;flex-direction:column;align-items:center;gap:5px;background:none;border:1px solid transparent;border-radius:2px;color:#fff;cursor:default;text-align:center;transition:left .07s ease-out,top .07s ease-out}\
.xpd-icon__img{width:34px;height:34px;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.55))}\
.xpd-icon__label{text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 5px rgba(0,0,0,.55);line-height:1.25;word-break:break-word}\
.xpd-icon:hover{background:rgba(255,255,255,.14)}\
.xpd-icon.is-selected{background:rgba(49,106,197,.6);border-color:rgba(255,255,255,.4)}\
.xpd-icon.is-dragging{opacity:.75;z-index:6;transition:none}\
.xpd-icon:focus-visible{outline:1px dotted #fff;outline-offset:-2px}\
.xpd-icon--corner{position:absolute;right:12px;bottom:12px}\
.xpd-rubberband{position:absolute;display:none;border:1px solid rgba(255,255,255,.95);background:rgba(130,175,255,.28);z-index:5;pointer-events:none}\
.xpd-noselect,.xpd-noselect *{user-select:none!important}\
.xpd-windows{position:absolute;inset:0;pointer-events:none}\
.xpd-win{position:absolute;pointer-events:auto;width:460px;max-width:calc(100% - 16px);display:flex;flex-direction:column;padding:0 3px 3px;border-radius:8px 8px 0 0;background:var(--xpd-frame-off);box-shadow:0 8px 24px rgba(0,0,0,.35);animation:xpd-pop .14s ease-out}\
.xpd-win.is-active{background:var(--xpd-frame);box-shadow:0 10px 30px rgba(0,0,0,.45)}\
@keyframes xpd-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}\
.xpd-win.is-dragging{user-select:none}\
.xpd-win__title{height:29px;display:flex;align-items:center;gap:6px;padding:0 5px 0 7px;color:#fff;touch-action:none;border-radius:7px 7px 0 0;background:linear-gradient(180deg,#9cc4ff 0,#7ea3ec 2px,#7ea3ec 100%)}\
.xpd-win.is-active .xpd-win__title{background:linear-gradient(180deg,#8dc0ff 0,var(--xpd-title-a) 2px,var(--xpd-title-b) 11px,#0553e6 60%,var(--xpd-title-c) 100%)}\
.xpd-win__icon{width:16px;height:16px;flex:none}\
.xpd-win__name{flex:1;font:700 13px/1 var(--xpd-display);text-shadow:1px 1px 0 rgba(10,36,106,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.xpd-win__ctl{display:flex;gap:2px}\
.xpd-win__btn{width:21px;height:21px;padding:0;display:grid;place-items:center;border:1px solid rgba(255,255,255,.85);border-radius:3px;cursor:default;background:linear-gradient(#5f9dff,#2e6fe6 55%,#2160d1)}\
.xpd-win__btn--close{background:linear-gradient(#f1946b,#d9542a 50%,#c43f18)}\
.xpd-win__btn:hover{filter:brightness(1.12)}\
.xpd-win__btn svg{width:10px;height:10px;fill:none;stroke:#fff;stroke-width:1.9;stroke-linecap:round}\
.xpd-win:not(.is-active) .xpd-win__btn{background:linear-gradient(#a9c6f7,#86aaee)}\
.xpd-win:not(.is-active) .xpd-win__btn--close{background:linear-gradient(#f3b59a,#e28a66)}\
.xpd-win__body{background:var(--xpd-face);display:flex;gap:16px;padding:16px 18px 16px 16px;font-size:12.5px;line-height:1.55}\
.xpd-win__bigicon{width:48px;height:48px;flex:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}\
.xpd-win__text{flex:1;min-width:0;max-width:60ch}\
.xpd-win__text h2{margin:0 0 6px;font:700 14px/1.2 var(--xpd-display)}\
.xpd-win__text h2 small{font:400 11px Tahoma,Verdana,sans-serif;color:#5f5f5f;margin-left:6px}\
.xpd-win__text p{margin:0 0 9px}\
.xpd-win__actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;padding-top:12px;border-top:1px solid #d6d2c4}\
.xpd-btn{display:inline-flex;align-items:center;justify-content:center;min-width:76px;height:23px;padding:0 12px;font-size:11px;color:#000;text-decoration:none;cursor:pointer;background:linear-gradient(#fff,#f3f2ec 45%,#e2e0d7);border:1px solid #003c74;border-radius:3px;box-shadow:inset 0 0 0 1px #fff}\
.xpd-btn:hover{box-shadow:inset 0 0 0 1px #fff,inset 0 0 0 2px #f9c46b}\
.xpd-btn--primary{box-shadow:inset 0 0 0 1px #fff,inset 0 0 0 2px #86b5f2}\
.xpd-btn:focus-visible{outline:1px dotted #000;outline-offset:-4px}\
.xpd-taskbar{position:absolute;left:0;right:0;bottom:0;height:30px;z-index:1000;display:flex;align-items:stretch;background:linear-gradient(180deg,#3369d8 0,#4f8ef8 6%,#2a66df 30%,var(--xpd-taskbar) 60%,#1d4dbf 100%)}\
.xpd-start{display:flex;align-items:center;gap:7px;padding:0 24px 0 10px;margin-right:10px;border:0;border-radius:0 12px 12px 0;color:#fff;cursor:default;font:italic 700 16px/1 var(--xpd-display);text-shadow:1px 1px 0 rgba(0,0,0,.35);background:linear-gradient(180deg,#7fd66a 0,var(--xpd-start-hi) 8%,var(--xpd-start) 45%,#2d8a1f 100%);box-shadow:inset -2px 0 4px rgba(0,0,0,.3),inset 0 -1px 2px rgba(0,0,0,.3)}\
.xpd-start:hover{filter:brightness(1.08)}\
.xpd-start.is-open{background:linear-gradient(180deg,#2d8a1f,var(--xpd-start) 60%);box-shadow:inset 2px 2px 5px rgba(0,0,0,.45)}\
.xpd-start:focus-visible{outline:1px dotted #fff;outline-offset:-4px}\
.xpd-start__mark{width:20px;height:20px;border-radius:5px;display:grid;place-items:center;font:700 12px/1 var(--xpd-display);font-style:normal;color:#1f4f12;background:linear-gradient(#fff,#e2f5d8);box-shadow:0 1px 1px rgba(0,0,0,.3)}\
.xpd-tasks{flex:1;display:flex;gap:3px;padding:3px 4px;overflow:hidden}\
.xpd-task{height:24px;min-width:110px;max-width:170px;padding:0 8px;display:flex;align-items:center;gap:6px;border:1px solid #1c4fb8;border-radius:3px;color:#fff;cursor:default;background:linear-gradient(#6aa0fb,#3f7de8 40%,#3873df);white-space:nowrap;overflow:hidden}\
.xpd-task span{overflow:hidden;text-overflow:ellipsis}\
.xpd-task:hover{background:linear-gradient(#7fb0ff,#4f8bef)}\
.xpd-task.is-active{background:#1e52c3;box-shadow:inset 1px 1px 3px rgba(0,0,0,.45);font-weight:700}\
.xpd-task__icon{width:16px;height:16px;flex:none}\
.xpd-tray{display:flex;align-items:center;gap:9px;padding:0 12px 0 10px;color:#fff;background:linear-gradient(180deg,#1a9df3 0,#1590e8 40%,var(--xpd-tray) 70%,#0b74cf 100%);box-shadow:inset 2px 0 5px rgba(0,0,0,.28)}\
.xpd-tray__glyph{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:1.4;opacity:.9}\
.xpd-clock{min-width:56px;text-align:center}\
.xpd-startmenu{position:absolute;left:0;bottom:30px;width:380px;max-width:100%;z-index:1001;background:#fff;border:1px solid #1e48b5;border-radius:6px 6px 0 0;overflow:hidden;box-shadow:3px -1px 10px rgba(0,0,0,.45)}\
.xpd-sm__head{height:56px;display:flex;align-items:center;gap:10px;padding:0 10px;color:#fff;font:700 15px/1 var(--xpd-display);text-shadow:1px 1px 0 rgba(10,36,106,.9);background:linear-gradient(180deg,#3b8cf5,#1f5fd7)}\
.xpd-sm__avatar{width:38px;height:38px;border-radius:5px;display:grid;place-items:center;font:700 19px/1 var(--xpd-display);color:#1f4f12;background:linear-gradient(#fff,#e2f5d8);border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.35)}\
.xpd-sm__head small{display:block;font:11px Tahoma,Verdana,sans-serif;text-shadow:none;opacity:.9;margin-top:3px}\
.xpd-sm__cols{display:grid;grid-template-columns:1fr 1fr}\
.xpd-sm__col{padding:6px;display:flex;flex-direction:column;gap:2px}\
.xpd-sm__col--right{background:#d3e5fa;border-left:1px solid #9bbbea}\
.xpd-sm__heading{margin:4px 8px 6px;font-size:11px;font-weight:700;color:#1c3f8f}\
.xpd-sm__item{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;background:none;border:0;border-radius:3px;text-align:left;text-decoration:none;color:#000;cursor:default}\
.xpd-sm__item svg{width:22px;height:22px;flex:none}\
.xpd-sm__item b{display:block;font-weight:700}\
.xpd-sm__item small{display:block;color:#666;font-size:10px}\
.xpd-sm__item:hover,.xpd-sm__item:focus-visible{background:var(--xpd-sel);color:#fff;outline:0}\
.xpd-sm__item:hover small,.xpd-sm__item:focus-visible small{color:#dfe9ff}\
.xpd-sm__foot{height:38px;display:flex;justify-content:flex-end;align-items:center;gap:6px;padding:0 8px;background:linear-gradient(180deg,#2f6fe0,#1e50c4)}\
.xpd-sm__off{display:flex;align-items:center;gap:6px;padding:4px 8px;border:0;border-radius:3px;background:none;color:#fff;cursor:default}\
.xpd-sm__off:hover{background:rgba(255,255,255,.18)}\
.xpd-sm__off i{width:16px;height:16px;border-radius:3px;background:linear-gradient(#f7b25a,#e07a1d);display:inline-block}\
.xpd--narrow{font-size:12px}\
.xpd--narrow .xpd-icons{inset:8px}\
.xpd--narrow .xpd-icon{width:72px}\
.xpd--narrow .xpd-win{left:8px!important;top:8px!important;width:calc(100% - 16px);max-height:calc(100% - 16px);overflow:auto}\
.xpd--narrow .xpd-win__body{flex-direction:column;gap:10px;font-size:13.5px}\
.xpd--narrow .xpd-win__bigicon{width:40px;height:40px}\
.xpd--narrow .xpd-task{min-width:34px;max-width:40px;padding:0 8px;justify-content:center}\
.xpd--narrow .xpd-task span{display:none}\
.xpd--narrow .xpd-start{padding-right:18px}\
.xpd--narrow .xpd-startmenu{width:100%}\
@media (prefers-reduced-motion:reduce){.xpd-win{animation:none}}';

  var SPRITE = '<svg class="xpd-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>\
<radialGradient id="xpd-gGlobe" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#a6d7ff"/><stop offset="1" stop-color="#1c63c9"/></radialGradient>\
<linearGradient id="xpd-gBin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d4e3f6"/><stop offset=".5" stop-color="#aac2e2"/><stop offset="1" stop-color="#8fabd1"/></linearGradient>\
<linearGradient id="xpd-gCup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa5f5"/><stop offset="1" stop-color="#1f6fd6"/></linearGradient>\
<linearGradient id="xpd-gBell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe38a"/><stop offset="1" stop-color="#f2b834"/></linearGradient>\
<symbol id="xpd-ic-notepad" viewBox="0 0 32 32"><path d="M6 5h20v24H6z" fill="#fff" stroke="#8a8a8a"/><path d="M6 5h20v3.5H6z" fill="#dfe6f2" stroke="#8a8a8a"/><path d="M9.5 13h13M9.5 17h13M9.5 21h13M9.5 25h8" stroke="#a6bddc" fill="none"/><g fill="#6b6b6b"><circle cx="10" cy="6.7" r="1.1"/><circle cx="16" cy="6.7" r="1.1"/><circle cx="22" cy="6.7" r="1.1"/></g></symbol>\
<symbol id="xpd-ic-globe" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12.5" fill="url(#xpd-gGlobe)" stroke="#0d3f8f"/><path d="M9 11c3-3 6-2 8 0s5 2 6-1c1 3 0 6-3 7s-4 4-2 7c-4 1-8-1-10-4s-1-7 1-9z" fill="#5fb43c" opacity=".9"/><path d="M4 16h24" stroke="#0d3f8f" opacity=".3" fill="none"/><ellipse cx="16" cy="16" rx="5" ry="12.5" fill="none" stroke="#0d3f8f" opacity=".3"/></symbol>\
<symbol id="xpd-ic-cup" viewBox="0 0 32 32"><path d="M7 8h16v13.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 7 21.5z" fill="#f6f6f6" stroke="#8a8a8a"/><path d="M23 11.5h2.5a3.5 3.5 0 0 1 0 7H23" fill="none" stroke="#8a8a8a" stroke-width="1.5"/><path d="M8 14.5h14v7a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 8 21.5z" fill="url(#xpd-gCup)"/><path d="M8 14.5h14" stroke="#b4dcff" stroke-width="1.6" fill="none"/></symbol>\
<symbol id="xpd-ic-building" viewBox="0 0 32 32"><path d="M6 28V8.5l10-4.5 10 4.5V28z" fill="#e8e1c9" stroke="#8a7d5a"/><path d="M6 8.5l10-4.5 10 4.5" fill="#cdbd94" stroke="#8a7d5a"/><g fill="#3c8ff0" stroke="#1f5fb8" stroke-width=".6"><rect x="9" y="11" width="3.5" height="3.5"/><rect x="14.25" y="11" width="3.5" height="3.5"/><rect x="19.5" y="11" width="3.5" height="3.5"/><rect x="9" y="17" width="3.5" height="3.5"/><rect x="14.25" y="17" width="3.5" height="3.5"/><rect x="19.5" y="17" width="3.5" height="3.5"/></g><rect x="13.5" y="22.5" width="5" height="5.5" fill="#7a5a2a"/><path d="M25 2.5l1 2.2 2.4.2-1.8 1.6.6 2.4L25 7.6l-2.2 1.3.6-2.4-1.8-1.6 2.4-.2z" fill="#f5b400"/></symbol>\
<symbol id="xpd-ic-form" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="23" rx="1.5" fill="#d9a460" stroke="#8a5a22"/><rect x="8.5" y="9" width="15" height="18" fill="#fff" stroke="#c4c4c4"/><rect x="12" y="4" width="8" height="4" rx="1" fill="#777"/><path d="M11 14l1.5 1.5L15 12.5M11 19l1.5 1.5L15 17.5" fill="none" stroke="#3c8ff0" stroke-width="1.5"/><path d="M17 14h5M17 19h5M11 24h11" stroke="#a5a5a5" fill="none"/></symbol>\
<symbol id="xpd-ic-mail" viewBox="0 0 32 32"><rect x="4" y="8" width="24" height="17" rx="2" fill="#fff" stroke="#8a8a8a"/><path d="M5 9h22l-11 8.5z" fill="#e7eef8"/><path d="M4.5 9.5L16 18l11.5-8.5" fill="none" stroke="#8a8a8a"/><path d="M4.5 24.5L13 16M27.5 24.5L19 16" stroke="#c2c2c2" fill="none"/></symbol>\
<symbol id="xpd-ic-doc" viewBox="0 0 32 32"><path d="M8 3h11l6 6v20H8z" fill="#fff" stroke="#8a8a8a"/><path d="M19 3v6h6" fill="#e4e4e4" stroke="#8a8a8a"/><path d="M11 15h10M11 19h10M11 23h7" stroke="#bdbdbd" fill="none"/><circle cx="13.5" cy="10.5" r="2" fill="#3c8ff0"/></symbol>\
<symbol id="xpd-ic-bin" viewBox="0 0 32 32"><path d="M8 9l1.5 19h13L24 9z" fill="url(#xpd-gBin)" stroke="#5c6f8a"/><path d="M12 12l.8 14M16 12v14M20 12l-.8 14" stroke="#5c6f8a" opacity=".45" fill="none"/><ellipse cx="16" cy="9" rx="8.5" ry="2.5" fill="#e4edf9" stroke="#5c6f8a"/></symbol>\
<symbol id="xpd-ic-bell" viewBox="0 0 32 32"><path d="M16 4.5c-4.5 0-7.5 3.4-7.5 8v5.5L6 22.5h20l-2.5-4.5V12.5c0-4.6-3-8-7.5-8z" fill="url(#xpd-gBell)" stroke="#8a6a1f"/><path d="M13 24.5a3 3 0 0 0 6 0" fill="#d9a460" stroke="#8a6a1f"/><rect x="15" y="2.5" width="2" height="3" rx="1" fill="#8a6a1f"/><circle cx="24" cy="8" r="4" fill="#e63c3c" stroke="#fff" stroke-width="1.2"/></symbol>\
<symbol id="xpd-ic-art" viewBox="0 0 32 32"><path d="M14 4.5C7.6 4.5 3 8.9 3 14.2c0 3.7 2.9 6 6.2 6 1.8 0 2.5-1 2.5-2.1 0-1-.8-1.6-.8-2.6 0-1.2 1-2 2.3-2H18c4.2 0 7.7-2.5 7.7-5.6C25.7 7.1 20.4 4.5 14 4.5z" fill="#f4f0e5" stroke="#8a7d5a"/><circle cx="8.6" cy="10" r="1.8" fill="#e63c3c"/><circle cx="13" cy="7.4" r="1.8" fill="#3c8ff0"/><circle cx="18.3" cy="7.8" r="1.8" fill="#f5b400"/><circle cx="21.8" cy="11.3" r="1.8" fill="#5fb43c"/><circle cx="10" cy="15.3" r="1.9" fill="#fff" stroke="#8a7d5a"/><path d="M17.6 27.5 24.5 15a1.7 1.7 0 0 1 3 1.7l-6.8 12.6z" fill="#dfe0e2" stroke="#8a8a8a"/><path d="m17.6 27.5 1.2-4 2.8 1.6z" fill="#d9a460" stroke="#8a5a22"/><path d="M18.8 23.5 21.6 25.1" stroke="#8a8a8a"/></symbol>\
</defs></svg>';

  var WALLPAPER = '<svg class="xpd-wall" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>\
<linearGradient id="xpd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e6fd6"/><stop offset=".55" stop-color="#5aa7ee"/><stop offset="1" stop-color="#cfe8fb"/></linearGradient>\
<linearGradient id="xpd-hill" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#a5d94f"/><stop offset=".45" stop-color="#5faa25"/><stop offset="1" stop-color="#2d6f12"/></linearGradient>\
<linearGradient id="xpd-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c9420"/><stop offset="1" stop-color="#1f5410"/></linearGradient>\
<filter id="xpd-soft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>\
<filter id="xpd-softer" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="30"/></filter>\
</defs>\
<rect width="1600" height="1000" fill="url(#xpd-sky)"/>\
<g fill="#fff" filter="url(#xpd-soft)" opacity=".92"><ellipse cx="1180" cy="170" rx="170" ry="48"/><ellipse cx="1260" cy="140" rx="110" ry="60"/><ellipse cx="1100" cy="150" rx="90" ry="45"/><ellipse cx="420" cy="110" rx="130" ry="34"/><ellipse cx="480" cy="90" rx="80" ry="40"/><ellipse cx="1420" cy="330" rx="150" ry="36"/><ellipse cx="1490" cy="310" rx="90" ry="44"/><ellipse cx="820" cy="260" rx="100" ry="24"/></g>\
<g fill="#fff" filter="url(#xpd-softer)" opacity=".5"><ellipse cx="1300" cy="450" rx="260" ry="40"/><ellipse cx="200" cy="300" rx="180" ry="30"/></g>\
<path d="M0 470 C 220 330, 560 300, 860 400 C 1080 470, 1300 640, 1600 610 L1600 1000 L0 1000 Z" fill="url(#xpd-hill)"/>\
<ellipse cx="520" cy="420" rx="360" ry="70" fill="#d8f29a" opacity=".35" filter="url(#xpd-softer)"/>\
<path d="M0 780 C 300 700, 700 720, 1000 800 C 1250 870, 1450 860, 1600 830 L1600 1000 L0 1000 Z" fill="url(#xpd-hill2)" opacity=".85"/>\
</svg>';

  var TRAY_GLYPH = '<svg class="xpd-tray__glyph" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3" width="9" height="7" rx="1"/><rect x="5.5" y="6" width="9" height="7" rx="1" fill="#0f83dc"/></svg>';

  var DEFAULTS = { name: 'Your Name', subtitle: '', mark: 'B', wallpaper: 'hill', startHeading: 'Projects', startLeft: [], startRight: [], items: [] };

  function ensureCss() {
    if (document.getElementById('xpd-css')) return;
    var s = document.createElement('style');
    s.id = 'xpd-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function iconHtml(icon, cls) {
    icon = icon || 'doc';
    if (/^\s*<svg/i.test(icon)) return icon.replace(/<svg\b/i, '<svg class="' + cls + '" aria-hidden="true"');
    return '<svg class="' + cls + '" aria-hidden="true"><use href="#xpd-ic-' + esc(icon) + '"></use></svg>';
  }

  function mount(target, config) {
    var cfg = Object.assign({}, DEFAULTS, config || {});
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error('XPDesktop: mount target not found');
    ensureCss();

    var byId = {};
    cfg.items.forEach(function (it) { byId[it.id] = it; });

    function menuEntries(list) {
      return (list || []).map(function (e) {
        if (typeof e === 'string') e = { open: e };
        if (e.open) {
          var it = byId[e.open];
          if (!it) return '';
          return '<button type="button" class="xpd-sm__item" data-open="' + esc(it.id) + '">' + iconHtml(e.icon || it.icon, '') +
            '<span><b>' + esc(e.label || it.title || it.label) + '</b>' + ((e.desc || it.menuDesc) ? '<small>' + esc(e.desc || it.menuDesc) + '</small>' : '') + '</span></button>';
        }
        return '<a class="xpd-sm__item" href="' + esc(e.href) + '" target="_blank" rel="noopener">' + iconHtml(e.icon, '') +
          '<span><b>' + esc(e.label) + '</b>' + (e.desc ? '<small>' + esc(e.desc) + '</small>' : '') + '</span></a>';
      }).join('');
    }

    root.classList.add('xpd');
    root.innerHTML =
      SPRITE +
      '<div class="xpd-desktop">' + (cfg.wallpaper === 'hill' ? WALLPAPER : '') +
        '<div class="xpd-icons"></div><div class="xpd-windows"></div><div class="xpd-rubberband"></div></div>' +
      '<div class="xpd-taskbar">' +
        '<button type="button" class="xpd-start" aria-haspopup="true" aria-expanded="false"><span class="xpd-start__mark" aria-hidden="true">' + esc(cfg.mark) + '</span>start</button>' +
        '<div class="xpd-tasks"></div>' +
        '<div class="xpd-tray">' + TRAY_GLYPH + '<span class="xpd-clock"></span></div>' +
      '</div>' +
      '<nav class="xpd-startmenu" hidden aria-label="Start menu">' +
        '<div class="xpd-sm__head"><span class="xpd-sm__avatar" aria-hidden="true">' + esc(cfg.mark) + '</span><div>' + esc(cfg.name) + (cfg.subtitle ? '<small>' + esc(cfg.subtitle) + '</small>' : '') + '</div></div>' +
        '<div class="xpd-sm__cols">' +
          '<div class="xpd-sm__col">' + menuEntries(cfg.startLeft) + '</div>' +
          '<div class="xpd-sm__col xpd-sm__col--right">' + (cfg.startHeading ? '<div class="xpd-sm__heading">' + esc(cfg.startHeading) + '</div>' : '') + menuEntries(cfg.startRight) + '</div>' +
        '</div>' +
        '<div class="xpd-sm__foot"><button type="button" class="xpd-sm__off"><i aria-hidden="true"></i>Log off</button></div>' +
      '</nav>';

    var desktop = root.querySelector('.xpd-desktop');
    if (cfg.wallpaper && cfg.wallpaper !== 'hill') desktop.style.background = cfg.wallpaper;
    var iconsEl = root.querySelector('.xpd-icons');
    var winsEl = root.querySelector('.xpd-windows');
    var tasksEl = root.querySelector('.xpd-tasks');
    var startBtn = root.querySelector('.xpd-start');
    var startMenu = root.querySelector('.xpd-startmenu');
    var clock = root.querySelector('.xpd-clock');
    var narrow = function () { return root.classList.contains('xpd--narrow'); };

    // ---- responsive: based on the host element's width, not the viewport ----
    var applyNarrow = function () { root.classList.toggle('xpd--narrow', root.clientWidth < 640); if (typeof layoutIcons === 'function') layoutIcons(); };
    applyNarrow();
    var ro = null;
    if ('ResizeObserver' in global) { ro = new ResizeObserver(applyNarrow); ro.observe(root); }
    else global.addEventListener('resize', applyNarrow);

    // ---- desktop icons ----
    var rubberEl = root.querySelector('.xpd-rubberband');
    var iconEls = [];
    var selectedSet = new Set();
    var DRAG_THRESHOLD = 4;
    function setIconSelected(btn, on) {
      if (on === selectedSet.has(btn)) return;
      if (on) { selectedSet.add(btn); btn.classList.add('is-selected'); }
      else { selectedSet.delete(btn); btn.classList.remove('is-selected'); }
    }
    function clearSelection() { selectedSet.forEach(function (b) { b.classList.remove('is-selected'); }); selectedSet.clear(); }
    function selectOnly(btn) { clearSelection(); if (btn) setIconSelected(btn, true); }
    function noSelect(on) { root.classList.toggle('xpd-noselect', on); }

    // Every icon is absolutely positioned and laid out on a grid in JS, column-major
    // like Windows. A CSS column-wrap flex container can't be trusted here: with no
    // definite width it collapses every icon onto the origin. Dropped icons snap back
    // to the grid ("Align to grid"); once an icon is moved, auto-layout stops.
    var CELL_H = 84;
    var cellW = function () { return narrow() ? 76 : 80; };
    var iconsMoved = false;

    function layoutIcons() {
      if (iconsMoved || !iconEls || !iconEls.length) return;
      var w = iconsEl.clientWidth || (root.clientWidth - 24);
      var h = iconsEl.clientHeight || (root.clientHeight - 54);
      var cw = cellW();
      var flow = iconEls.filter(function (b) { return !b.__corner; });
      if (narrow()) {
        var perRow = Math.max(1, Math.floor(w / cw));
        flow.forEach(function (b, i) {
          b.style.left = (i % perRow) * cw + 'px';
          b.style.top = Math.floor(i / perRow) * CELL_H + 'px';
        });
      } else {
        var perCol = Math.max(1, Math.floor(h / CELL_H));
        flow.forEach(function (b, i) {
          b.style.left = Math.floor(i / perCol) * cw + 'px';
          b.style.top = (i % perCol) * CELL_H + 'px';
        });
      }
    }

    function onIconPointerDown(e, btn, item) {
      if (e.button !== 0) return;
      var additive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (additive) { setIconSelected(btn, !selectedSet.has(btn)); e.preventDefault(); return; }
      if (!selectedSet.has(btn)) selectOnly(btn);
      e.preventDefault();
      var group = Array.from(selectedSet);
      // corner icons sit on CSS right/bottom in the desktop layer until first grabbed —
      // move them into the icon layer and seed explicit left/top so drag maths match
      group.forEach(function (el) {
        if (!el.style.left) {
          if (el.parentElement !== iconsEl) iconsEl.appendChild(el);
          var pr = iconsEl.getBoundingClientRect(), r = el.getBoundingClientRect();
          el.style.left = (r.left - pr.left) + 'px';
          el.style.top = (r.top - pr.top) + 'px';
          el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.margin = '0';
        }
      });
      var starts = group.map(function (el) { return { el: el, left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0 }; });
      var sx = e.clientX, sy = e.clientY, moved = false;
      var bounds = iconsEl.getBoundingClientRect();
      btn.setPointerCapture(e.pointerId);

      function onMove(ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          moved = true;
          noSelect(true);
          group.forEach(function (el) { el.classList.add('is-dragging'); });
        }
        if (!moved) return;
        starts.forEach(function (s) {
          s.el.style.left = Math.max(-20, Math.min(bounds.width - 40, s.left + dx)) + 'px';
          s.el.style.top = Math.max(0, Math.min(bounds.height - 20, s.top + dy)) + 'px';
        });
      }
      function onUp() {
        btn.releasePointerCapture(e.pointerId);
        btn.removeEventListener('pointermove', onMove);
        btn.removeEventListener('pointerup', onUp);
        btn.removeEventListener('pointercancel', onUp);
        if (!moved) { openWindow(item); return; }
        group.forEach(function (el) { el.classList.remove('is-dragging'); });
        noSelect(false);
        iconsMoved = true;
        var cw = cellW();
        group.forEach(function (el) {
          var L = Math.round((parseFloat(el.style.left) || 0) / cw) * cw;
          var T = Math.round((parseFloat(el.style.top) || 0) / CELL_H) * CELL_H;
          el.style.left = Math.max(0, Math.min(bounds.width - 78, L)) + 'px';
          el.style.top = Math.max(0, Math.min(bounds.height - 60, T)) + 'px';
        });
      }
      btn.addEventListener('pointermove', onMove);
      btn.addEventListener('pointerup', onUp);
      btn.addEventListener('pointercancel', onUp);
    }

    cfg.items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'xpd-icon' + (item.corner ? ' xpd-icon--corner' : '');
      b.__corner = !!item.corner;
      b.innerHTML = iconHtml(item.icon, 'xpd-icon__img') + '<span class="xpd-icon__label">' + esc(item.label) + '</span>';
      b.addEventListener('pointerdown', function (e) { onIconPointerDown(e, b, item); });
      iconEls.push(b);
      (item.corner ? desktop : iconsEl).appendChild(b);
    });
    layoutIcons();
    if (global.requestAnimationFrame) global.requestAnimationFrame(layoutIcons);

    // rubber-band drag-select, like a real desktop
    desktop.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('.xpd-icon')) return;
      if (!(e.target.closest('.xpd-wall') || e.target === desktop || e.target === iconsEl)) return;
      e.preventDefault();
      var additive = e.shiftKey || e.ctrlKey || e.metaKey;
      var base = additive ? new Set(selectedSet) : new Set();
      if (!additive) clearSelection();
      var rect = desktop.getBoundingClientRect();
      var sx = e.clientX, sy = e.clientY, moved = false;
      desktop.setPointerCapture(e.pointerId);

      function bandRect(cx, cy) {
        var x1 = Math.min(sx, cx), x2 = Math.max(sx, cx);
        var y1 = Math.min(sy, cy), y2 = Math.max(sy, cy);
        rubberEl.style.left = (x1 - rect.left) + 'px';
        rubberEl.style.top = (y1 - rect.top) + 'px';
        rubberEl.style.width = (x2 - x1) + 'px';
        rubberEl.style.height = (y2 - y1) + 'px';
        return { x1: x1, x2: x2, y1: y1, y2: y2 };
      }
      function overlaps(a, r) { return !(r.left > a.x2 || r.right < a.x1 || r.top > a.y2 || r.bottom < a.y1); }

      function onMove(ev) {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_THRESHOLD) { moved = true; noSelect(true); rubberEl.style.display = 'block'; }
        if (!moved) return;
        var band = bandRect(ev.clientX, ev.clientY);
        iconEls.forEach(function (btn) {
          setIconSelected(btn, base.has(btn) || overlaps(band, btn.getBoundingClientRect()));
        });
      }
      function onUp() {
        desktop.releasePointerCapture(e.pointerId);
        desktop.removeEventListener('pointermove', onMove);
        desktop.removeEventListener('pointerup', onUp);
        desktop.removeEventListener('pointercancel', onUp);
        rubberEl.style.display = 'none';
        noSelect(false);
      }
      desktop.addEventListener('pointermove', onMove);
      desktop.addEventListener('pointerup', onUp);
      desktop.addEventListener('pointercancel', onUp);
    });

    // ---- windows ----
    var z = 10, cascade = 0, open = new Map();

    function openWindow(item) {
      if (!item) return;
      if (open.has(item.id)) {
        var w0 = open.get(item.id);
        w0.el.hidden = false;
        focusWin(w0);
        return;
      }
      var el = document.createElement('section');
      el.className = 'xpd-win';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', item.title);
      var external = item.link && /^https?:/.test(item.link) ? ' target="_blank" rel="noopener"' : '';
      el.innerHTML =
        '<div class="xpd-win__title">' + iconHtml(item.icon, 'xpd-win__icon') +
          '<span class="xpd-win__name">' + esc(item.title) + '</span>' +
          '<span class="xpd-win__ctl">' +
            '<button type="button" class="xpd-win__btn" data-act="min" aria-label="Minimize"><svg viewBox="0 0 10 10"><path d="M2 7.5h6"/></svg></button>' +
            '<button type="button" class="xpd-win__btn xpd-win__btn--close" data-act="close" aria-label="Close"><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6"/></svg></button>' +
          '</span></div>' +
        '<div class="xpd-win__body">' + iconHtml(item.icon, 'xpd-win__bigicon') +
          '<div class="xpd-win__text"><h2>' + esc(item.title) + (item.status ? '<small>' + esc(item.status) + '</small>' : '') + '</h2>' +
            (item.body || '') +
            '<div class="xpd-win__actions">' +
              (item.link ? '<a class="xpd-btn xpd-btn--primary" href="' + esc(item.link) + '"' + external + '>' + esc(item.linkLabel || 'Open') + '</a>' : '') +
              (item.extra || []).map(function (x) { return '<a class="xpd-btn" href="' + esc(x.href) + '" target="_blank" rel="noopener">' + esc(x.label) + '</a>'; }).join('') +
              '<button type="button" class="xpd-btn" data-act="close">Close</button>' +
            '</div></div></div>';
      var w = { item: item, el: el, task: null };
      open.set(item.id, w);
      winsEl.appendChild(el);
      place(el);
      el.addEventListener('pointerdown', function () { focusWin(w); });
      el.querySelectorAll('[data-act]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (b.getAttribute('data-act') === 'close') closeWin(w); else minWin(w);
        });
      });
      makeDraggable(el, el.querySelector('.xpd-win__title'));
      addTask(w);
      focusWin(w);
    }

    function place(el) {
      if (narrow()) { el.style.left = '8px'; el.style.top = '8px'; return; }
      var W = desktop.clientWidth, H = desktop.clientHeight;
      var step = (cascade++ % 6) * 28;
      var left = Math.max(110, Math.min(W - el.offsetWidth - 20, W * 0.28 + step));
      var top = Math.max(10, Math.min(H - el.offsetHeight - 20, 70 + step));
      el.style.left = left + 'px';
      el.style.top = top + 'px';
    }

    function focusWin(w) {
      w.el.style.zIndex = ++z;
      open.forEach(function (o) {
        o.el.classList.toggle('is-active', o === w);
        if (o.task) o.task.classList.toggle('is-active', o === w && !o.el.hidden);
      });
    }
    function minWin(w) { w.el.hidden = true; w.task.classList.remove('is-active'); }
    function closeWin(w) { w.el.remove(); w.task.remove(); open.delete(w.item.id); }

    function addTask(w) {
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'xpd-task';
      t.title = w.item.title;
      t.innerHTML = iconHtml(w.item.icon, 'xpd-task__icon') + '<span>' + esc(w.item.title) + '</span>';
      t.addEventListener('click', function () {
        if (w.el.hidden) { w.el.hidden = false; focusWin(w); }
        else if (w.el.classList.contains('is-active')) minWin(w);
        else focusWin(w);
      });
      tasksEl.appendChild(t);
      w.task = t;
    }

    function makeDraggable(el, handle) {
      handle.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button') || narrow()) return;
        e.preventDefault();
        var W = desktop.clientWidth, H = desktop.clientHeight;
        var sx = e.clientX, sy = e.clientY, sl = el.offsetLeft, st = el.offsetTop, ww = el.offsetWidth;
        handle.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
        var move = function (ev) {
          el.style.left = Math.max(-(ww - 80), Math.min(W - 80, sl + ev.clientX - sx)) + 'px';
          el.style.top = Math.max(0, Math.min(H - 34, st + ev.clientY - sy)) + 'px';
        };
        var up = function () {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          el.classList.remove('is-dragging');
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
    }

    // ---- start menu ----
    function toggleStart(force) {
      var show = force === undefined ? startMenu.hidden : force;
      startMenu.hidden = !show;
      startBtn.classList.toggle('is-open', show);
      startBtn.setAttribute('aria-expanded', String(show));
    }
    startBtn.addEventListener('click', function () { toggleStart(); });
    var onDocDown = function (e) {
      if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) toggleStart(false);
    };
    var onDocKey = function (e) { if (e.key === 'Escape') toggleStart(false); };
    document.addEventListener('pointerdown', onDocDown);
    document.addEventListener('keydown', onDocKey);
    startMenu.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { toggleStart(false); openWindow(byId[b.getAttribute('data-open')]); });
    });
    root.querySelector('.xpd-sm__off').addEventListener('click', function () {
      Array.from(open.values()).forEach(closeWin);
      toggleStart(false);
    });

    // ---- clock ----
    var tick = function () { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
    tick();
    var timer = setInterval(tick, 15000);

    // ---- open on load ----
    cfg.items.filter(function (i) { return i.openOnLoad; }).forEach(openWindow);

    return {
      root: root,
      open: function (id) { openWindow(byId[id]); },
      close: function (id) { if (open.has(id)) closeWin(open.get(id)); },
      closeAll: function () { Array.from(open.values()).forEach(closeWin); },
      destroy: function () {
        clearInterval(timer);
        if (ro) ro.disconnect(); else global.removeEventListener('resize', applyNarrow);
        document.removeEventListener('pointerdown', onDocDown);
        document.removeEventListener('keydown', onDocKey);
        root.innerHTML = '';
        root.classList.remove('xpd', 'xpd--narrow');
      }
    };
  }

  var XPDesktop = { mount: mount };
  global.XPDesktop = XPDesktop;
  if (typeof module === 'object' && module.exports) module.exports = XPDesktop;
})(typeof window !== 'undefined' ? window : this);
