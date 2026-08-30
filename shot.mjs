/* Bộ kiểm thử giao diện — thay cho Playwright, không cần cài gì.
   Điều khiển Chrome đã có sẵn trên máy qua DevTools Protocol bằng WebSocket
   có sẵn trong Node 22+. Không dependency, không npm.

   Chạy:  node shot.mjs            → kiểm thử + chụp ảnh vào anh-chup/
          node shot.mjs --url=http://localhost:8080/   → kiểm bản chạy trên hosting
*/
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const CHROME = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"
].filter(Boolean).find(existsSync);
if (!CHROME) { console.error("Không tìm thấy Chrome hoặc Edge. Đặt biến môi trường CHROME trỏ tới file thực thi."); process.exit(1); }

const arg = k => (process.argv.find(a => a.startsWith("--" + k + "=")) || "").split("=").slice(1).join("=");
const FILE = existsSync("app/index.html") ? "app/index.html" : "La-Ban-Tu-Do-Tai-Chinh.html";
const URL_ = arg("url") || ("file:///" + resolve(FILE).replace(/\\/g, "/"));
const OUT = "anh-chup";
const PORT = 9333 + (process.pid % 200);
const PROFILE = resolve(tmpdir(), "htdtc-chrome-" + process.pid);

mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- khởi động Chrome ---------- */
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--force-color-profile=srgb", "--disable-extensions", "--allow-file-access-from-files",
  "about:blank"
], { stdio: "ignore" });

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const p = list.find(t => t.type === "page");
      if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch { /* chưa lên */ }
    await sleep(250);
  }
  throw new Error("Chrome không mở được cổng debug");
}

/* ---------- lớp bọc CDP mỏng ---------- */
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.waiting = new Map();
    this.errors = []; this.console = [];
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) {
        const { ok, bad } = this.waiting.get(m.id); this.waiting.delete(m.id);
        m.error ? bad(new Error(m.error.message)) : ok(m.result);
      }
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        this.errors.push(d.exception?.description || d.text || "lỗi không rõ");
      }
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
        this.console.push(m.params.args.map(a => a.value ?? a.description ?? "?").join(" "));
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, bad) => {
      this.waiting.set(id, { ok, bad });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); bad(new Error("hết giờ: " + method)); } }, 30000);
    });
  }
  async evalJS(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async viewport(width, height = 900) {
    await this.send("Emulation.setDeviceMetricsOverride",
      { width, height, deviceScaleFactor: 2, mobile: width < 640 });
  }
  async goto(url) {
    await this.send("Page.navigate", { url });
    await sleep(1200);
  }
  async shotVP(name) {   // chỉ khung nhìn — để thấy thanh tab cố định dưới đáy
    const r = await this.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64"));
    return `${OUT}/${name}.png`;
  }
  async shot(name) {
    const m = await this.send("Page.getLayoutMetrics");
    const c = m.cssContentSize || m.contentSize;
    const r = await this.send("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: c.width, height: Math.min(c.height, 12000), scale: 1 }
    });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64"));
    return `${OUT}/${name}.png`;
  }
}

/* ---------- bộ số liệu mẫu để kiểm công thức ---------- */
const SAMPLE = `(()=>{
  const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;e.value=v;
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
  set('i-min',10);set('i-std',14);set('i-want',25);set('i-income',20);
  set('i-passive',7);set('i-ef',60);set('i-assets',450);set('i-debt',0);
  const lg=(d,nw,pi)=>{set('lg-date',d);set('lg-nw',nw);set('lg-pi',pi);document.getElementById('lg-add').click();};
  lg('2026-03',300,3);lg('2026-05',360,4.5);lg('2026-07',410,6);lg('2026-08',450,7);
  ['earned','rental'].forEach(k=>{const c=document.getElementById('src-'+k);if(c&&!c.checked)c.click();});
  const amt=(k,v)=>{const e=document.querySelector('[data-amt="'+k+'"]');if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}};
  amt('earned',20);amt('rental',7);
  [1,2,3,6].forEach(n=>{const c=document.getElementById('les-'+n);if(c&&!c.checked)c.click();});
  const ik=(k,v)=>{const e=document.querySelector('[data-ik="'+k+'"]');if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}};
  ik('a','Viết lách, dạy học, dựng công cụ nhỏ');ik('b','Phân tích số liệu và giải thích cho người không chuyên');
  ik('c','Người trẻ không ai chỉ cho cách quản lý tiền');ik('d','Tư vấn và xây phần mềm nội bộ');
  [1,2,3,4,5].forEach(n=>{const t=document.querySelectorAll('#roadmap .tick')[n-1];if(t)t.click();});

  /* --- Chọn một thứ: hai ứng viên, chấm gần đủ, chốt cái đầu --- */
  document.querySelector('#tabs button[data-t="calc"]').click();
  document.querySelector('#cnav button[data-c="chon"]').click();
  ['no','quy','nhanroi','giam50','khongvay'].forEach(k=>{
    const c=document.getElementById('gate-'+k);if(c&&!c.checked)c.click();});
  const themUV=(loai,ma,ten)=>{
    document.querySelector('#uv-loai button[data-l="'+loai+'"]').click();
    set('uv-ma',ma);set('uv-ten',ten);document.getElementById('uv-add').click();};
  themUV('quy','E1VFVN30','Quỹ ETF mô phỏng một chỉ số rộng');
  const chamHet=v=>document.querySelectorAll('#cham-list .critrow').forEach((r,i)=>{
    const b=r.querySelector('[data-v="'+(i%4===3?v-1:v)+'"]');if(b)b.click();});
  chamHet(2);
  themUV('cp','ABC','Một doanh nghiệp sản xuất giả định');
  chamHet(2);
  const dau=document.querySelector('#uv-list .uvrow [data-chot]');if(dau)dau.click();
  set('ch-pmt',5);set('ch-nam',10);set('ch-ngay',5);set('ch-rate',10);

  /* --- Kỷ luật mỗi ngày: tick hôm nay, đánh dấu vài đợt mua --- */
  document.querySelector('#tabs button[data-t="track"]').click();
  document.querySelector('#tnav button[data-p="kyluat"]').click();
  ['gia','lenh','phim','hoc'].forEach(k=>{
    const c=document.getElementById('kl-'+k);if(c&&!c.checked)c.click();});
  /* lưới tự dựng lại sau mỗi lần bấm, nên phải tìm lại nút mỗi vòng */
  for(let i=0;i<7;i++){const nut=document.querySelectorAll('#mua-grid button')[i];if(nut)nut.click();}
  document.querySelector('#tnav button[data-p="log"]').click();
  document.querySelector('#tabs button[data-t="map"]').click();
  return 'ok';
})()`;

const OVERFLOW = `(()=>{const r=[];
  document.querySelectorAll('#tabs button').forEach(b=>{b.click();
    r.push((b.querySelector('.full')||b).textContent+':'+(document.documentElement.scrollWidth>document.documentElement.clientWidth?'TRÀN':'ok'));});
  const sub=(navId,tabId)=>{const nv=document.getElementById(navId);if(!nv)return;
    document.querySelector('#tabs button[data-t="'+tabId+'"]').click();
    nv.querySelectorAll('button').forEach(b=>{b.click();
      r.push('· '+b.textContent+':'+(document.documentElement.scrollWidth>document.documentElement.clientWidth?'TRÀN':'ok'));});};
  sub('cnav','calc'); sub('tnav','track');
  return r.join(' | ');})()`;

/* kiểm tra công thức hiển thị ra đúng số đã tính tay */
const KIEM = `(()=>{const g=s=>{const n=document.querySelector(s);return n?n.textContent.trim():'(thiếu)';};
  const o={};
  document.querySelector('#tabs button[data-t="calc"]').click();
  document.querySelector('#cnav button[data-c="ngansach"]').click();
  o.budget=[...document.querySelectorAll('#bud-tiles .tile .v')].map(n=>n.textContent).join(' · ');
  document.querySelector('#cnav button[data-c="aiban"]').click();
  o.sanNong=g('#sn-verdict h5'); o.boiSo=g('#qm-tiles .tile .v');
  document.querySelector('#cnav button[data-c="dca"]').click();
  o.dca=[...document.querySelectorAll('#dca-tiles .tile .v')].map(n=>n.textContent).join(' · ');
  o.swr=g('#dca-swr .tile .v');
  document.querySelector('#cnav button[data-c="nha"]').click();
  o.hoaVon=g('#nha-hoavon .tile .v');
  o.nw=[...document.querySelectorAll('#nha-nw .tile .v')].map(n=>n.textContent).join(' vs ');
  o.nhay=[...document.querySelectorAll('#nha-nhay tbody tr')].map(t=>[...t.children].map(c=>c.textContent).join(' ')).join(' | ');
  document.querySelector('#tabs button[data-t="map"]').click();
  o.rungs=[...document.querySelectorAll('#rungs .pct')].map(n=>n.textContent).join(' · ');
  document.querySelector('#tabs button[data-t="track"]').click();
  document.querySelector('#tnav button[data-p="nguon"]').click();
  o.nguon=[...document.querySelectorAll('#src-tiles .tile .v')].map(n=>n.textContent).join(' · ');
  document.querySelector('#tnav button[data-p="cham"]').click();
  o.pri=document.querySelectorAll('#pri-list .chk').length+' nguyên tắc · '+
        document.querySelectorAll('#mis-list .chk').length+' sai lầm · '+
        document.querySelectorAll('#env-list .envrow').length+' môi trường';
  document.querySelector('#cnav button[data-c="chon"]').click();
  o.gate=g('#gate-note .tile .v');
  o.chon=[...document.querySelectorAll('#chon-tiles .tile .v')].map(n=>n.textContent).join(' · ');
  o.uv=[...document.querySelectorAll('#uv-list .uvrow')].map(r=>
        r.querySelector('.ma').textContent+' '+r.querySelector('.sc').textContent.replace(/\s+/g,'')).join(' | ');
  o.chamSo=document.querySelectorAll('#cham-list .critrow').length+' tiêu chí đang chấm';
  document.querySelector('#tabs button[data-t="track"]').click();
  document.querySelector('#tnav button[data-p="kyluat"]').click();
  o.kyLuat=[...document.querySelectorAll('#kl-tiles .tile .v')].map(n=>n.textContent).join(' · ');
  o.mua=[...document.querySelectorAll('#mua-tiles .tile .v')].map(n=>n.textContent).join(' · ')+
        ' · lưới '+document.querySelectorAll('#mua-grid button').length+' ô';
  o.dot30=document.querySelectorAll('#kl-30 i').length+' ô ngày';
  document.querySelector('#tnav button[data-p="ngam"]').click();
  o.ngam=document.querySelectorAll('#ba-thu textarea').length+' ô ba thứ · '+
         document.querySelectorAll('#val-grid textarea').length+' câu hỏi · '+
         document.querySelectorAll('#rb-fields input').length+' ô gây dựng lại';
  o.tuoi=[...document.querySelectorAll('#age-tiles .tile .v')].map(n=>n.textContent).join(' · ');
  return JSON.stringify(o,null,1);})()`;

/* ---------- chạy ---------- */
const wsUrl = await target();
const ws = new WebSocket(wsUrl);
await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = () => bad(new Error("không nối được WebSocket")); });
const cdp = new CDP(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

let bad = 0;
const say = (s) => console.log(s);
say("Nguồn: " + URL_);

const shots = [];
for (const [tenVP, w] of [["desktop", 1180], ["mobile", 360]]) {
  await cdp.viewport(w, w < 640 ? 780 : 1000);
  await cdp.goto(URL_);
  await cdp.evalJS(SAMPLE);

  const ovf = await cdp.evalJS(OVERFLOW);
  say(`\n[${tenVP} ${w}px] ${ovf}`);
  if (ovf.includes("TRÀN")) { bad++; say("  ✗ CÓ TRÀN NGANG"); }

  const kb = await cdp.evalJS(`(()=>{document.querySelector('#tabs button[data-t="kb"]').click();
    return document.querySelectorAll('#kb .kcard').length+'/'+document.querySelectorAll('#chips button').length;})()`);
  say(`  Cẩm nang: ${kb} (thẻ/nhóm — cần 196/52 kể cả chip “Tất cả”)`);
  if (kb !== "196/52") { bad++; say("  ✗ SỐ THẺ CẨM NANG SAI"); }

  const cua = await cdp.evalJS(`(()=>{const q='quỹ khẩn cấp';const i=document.getElementById('q');
    i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}));const a=document.querySelectorAll('#kb .kcard').length;
    i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));
    const chip=[...document.querySelectorAll('#chips button')].find(b=>b.textContent==='Đầu tư');
    chip.click();const b=document.querySelectorAll('#kb .kcard').length;
    document.querySelectorAll('#chips button')[0].click();
    return a+' kết quả tìm · '+b+' thẻ nhóm Đầu tư';})()`);
  say(`  Tìm kiếm & lọc: ${cua}`);

  if (tenVP === "desktop") {
    const so = await cdp.evalJS(KIEM);
    say("  Số liệu:");
    for (const line of so.split("\n")) say("   " + line);
  }

  for (const [ten, theme] of [["sang", "light"], ["toi", "dark"]]) {
    await cdp.evalJS(`document.documentElement.setAttribute('data-theme','${theme}')`);
    for (const tab of ["map", "calc", "track"]) {
      await cdp.evalJS(`document.querySelector('#tabs button[data-t="${tab}"]').click();window.scrollTo(0,0)`);
      await sleep(220);
      shots.push(await cdp.shot(`${tenVP}-${ten}-${tab}`));
    }
    if (tenVP === "mobile") {
      for (const tab of ["map", "calc", "track"]) {
        await cdp.evalJS(`document.querySelector('#tabs button[data-t="${tab}"]').click();window.scrollTo(0,0)`);
        await sleep(220);
        shots.push(await cdp.shotVP(`khung-${ten}-${tab}`));
      }
    }
    if (tenVP === "desktop") {
      for (const c of ["ngansach", "aiban", "dca", "chon", "nha"]) {
        const has = await cdp.evalJS(`(()=>{const b=document.querySelector('#cnav button[data-c="${c}"]');
          if(!b)return false;document.querySelector('#tabs button[data-t="calc"]').click();b.click();window.scrollTo(0,0);return true;})()`);
        if (has) { await sleep(220); shots.push(await cdp.shot(`desktop-${ten}-${c}`)); }
      }
    }
  }
  await cdp.evalJS(`document.documentElement.removeAttribute('data-theme')`);

  const still = await cdp.evalJS(`(()=>{const v=document.getElementById('i-std');return v?v.value:'?';})()`);
  await cdp.goto(URL_);
  const after = await cdp.evalJS(`(()=>{const v=document.getElementById('i-std');return v?v.value:'?';})()`);
  say(`  localStorage: trước reload ${still} → sau reload ${after} ${still === after ? "✓" : "✗ MẤT DỮ LIỆU"}`);
  if (still !== after) bad++;
}

if (cdp.errors.length) { bad++; say("\n✗ pageerror:\n  " + cdp.errors.join("\n  ")); }
else say("\n✓ không có pageerror");
const cons = cdp.console.filter(m => !/fonts\.g|net::ERR|Failed to load resource/i.test(m));
if (cons.length) say("console.error: " + cons.join(" | "));

say(`\nĐã chụp ${shots.length} ảnh vào ${OUT}/`);
ws.close(); chrome.kill();
try { rmSync(PROFILE, { recursive: true, force: true }); } catch { }
say(bad ? `\nKẾT QUẢ: ${bad} vấn đề` : "\nKẾT QUẢ: sạch");
process.exit(bad ? 1 : 0);
