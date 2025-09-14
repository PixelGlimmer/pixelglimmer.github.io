// ====== НАСТРОЙКИ ДОСТУПА ======
const ACCESS_ENABLED = false;              // отключить экран кода: false
const ACCESS_CODE = "sav3t00ls";          // сменить код доступа здесь

// ====== ЭЛЕМЕНТЫ ======
const gate = document.getElementById('gate');
const input = document.getElementById('access-code');
const enterBtn = document.getElementById('enterBtn');
const err = document.getElementById('error-msg');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const topbar = document.getElementById('topbar');
const app = document.getElementById('app');
const foot = document.getElementById('foot');
const grid = document.getElementById('grid');
const q = document.getElementById('q');
const sortSel = document.getElementById('sort');
const stats = document.getElementById('stats');
const logoutBtn = document.getElementById('logoutBtn');

// меню фильтров
const osMenu = document.getElementById('os-menu');
const tagMenu = document.getElementById('tag-menu');
const dateFromEl = document.getElementById('date-from');
const dateToEl = document.getElementById('date-to');
const resetBtn = document.getElementById('reset-filters');

// ====== ДАННЫЕ ======
const tools = JSON.parse(document.getElementById('tools-data').textContent);
const ALL_OS = [...new Set(tools.flatMap(t => t.os || []))].sort();
const ALL_TAGS = [...new Set(tools.flatMap(t => t.tags || []))].sort();

const state = {
  q: '',
  os: new Set(),
  tags: new Set(),
  sort: 'relevance',
  dFrom: null, // Date | null
  dTo: null    // Date | null
};

// ====== 3D ФОН ======
(function initBackground(){
  const cnv = document.getElementById('bg3d');
  const ctx = cnv.getContext('2d');
  let w, h, cx, cy; let t = 0; let mouse = {x:0, y:0};
  const tiles = Array.from({length: 120}, () => ({
    x: Math.random(), y: Math.random(), z: Math.random(), r: Math.random()*Math.PI*2
  }));

  function resize(){ w = cnv.width = innerWidth; h = cnv.height = innerHeight; cx = w/2; cy = h/2; }
  resize(); addEventListener('resize', resize);
  addEventListener('pointermove', e => { mouse.x = (e.clientX/w - .5)*2; mouse.y = (e.clientY/h - .5)*2; });

  function loop(){
    t += 0.008; ctx.clearRect(0,0,w,h);
    const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.hypot(cx,cy));
    grd.addColorStop(0,'rgba(79,158,9,0.08)');
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);

    for(const s of tiles){
      const depth = (s.z + Math.sin(t + s.x*6)*0.2) + 0.2;
      const px = (s.x - 0.5 + mouse.x*0.05/depth) * w * 0.9 + cx;
      const py = (s.y - 0.5 + mouse.y*0.05/depth) * h * 0.9 + cy;
      const size = (1.2 - depth) * 60;
      const ang = s.r + t*0.6;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang + mouse.x*0.2);
      ctx.globalAlpha = 0.2 + (1-depth)*0.6;
      ctx.fillStyle = 'rgba(79,158,9,0.15)';
      ctx.strokeStyle = 'rgba(79,158,9,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size, -size*0.35);
      ctx.lineTo(size, -size*0.35);
      ctx.lineTo(size*0.9, size*0.35);
      ctx.lineTo(-size*0.9, size*0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

// ====== РЕНДЕР КОНТРОЛОВ ФИЛЬТРОВ ======
function renderOS(){
  osMenu.innerHTML = ALL_OS.map(os => {
    const id = `os_${os.toLowerCase()}`;
    return `<label class="item"><input type="checkbox" id="${id}" data-os="${os}"> ${os}</label>`;
  }).join('');
  osMenu.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const val = e.target.dataset.os;
      if(e.target.checked) state.os.add(val); else state.os.delete(val);
      update();
    });
  });
}

function renderTags(){
  tagMenu.innerHTML = ALL_TAGS.map(tag => {
    const id = `tag_${tag.toLowerCase()}`;
    return `<label class="item"><input type="checkbox" id="${id}" data-tag="${tag}"> #${tag}</label>`;
  }).join('');
  tagMenu.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const val = e.target.dataset.tag;
      if(e.target.checked) state.tags.add(val); else state.tags.delete(val);
      update();
    });
  });
}

dateFromEl.addEventListener('change', () => {
  state.dFrom = dateFromEl.value ? new Date(dateFromEl.value) : null;
  update();
});
dateToEl.addEventListener('change', () => {
  state.dTo = dateToEl.value ? new Date(dateToEl.value) : null;
  // включаем конец дня
  if(state.dTo) state.dTo.setHours(23,59,59,999);
  update();
});
resetBtn.addEventListener('click', () => {
  state.q = '';
  q.value = '';
  state.os.clear();
  state.tags.clear();
  state.dFrom = state.dTo = null;
  osMenu.querySelectorAll('input[type=checkbox]').forEach(i => i.checked = false);
  tagMenu.querySelectorAll('input[type=checkbox]').forEach(i => i.checked = false);
  dateFromEl.value = '';
  dateToEl.value = '';
  update();
});

// ====== РЕНДЕР СЕТКИ ======
function fmtKV(t){ return t && t !== '—' ? t : '—'; }

function renderGrid(items){
  if(!items.length){
    grid.innerHTML = `<div class="empty">Ничего не найдено. Попробуйте изменить фильтры.</div>`;
    stats.textContent = `Показано 0 из ${tools.length}`;
    return;
  }
  const html = items.map(x => `
    <article class="card" role="listitem">
      <div class="hdr">
        <div class="icon" aria-hidden="true"></div>
        <div>
          <h3 class="title">${x.name}</h3>
          <p class="desc">${x.desc || ''}</p>
        </div>
      </div>
      <div class="badges">
        ${(x.os||[]).map(o => `<span class="badge">${o}</span>`).join('')}
        ${(x.tags||[]).map(t => `<span class="badge">#${t}</span>`).join('')}
      </div>
      <div class="kvs">
        <div>Версия: ${fmtKV(x.version)}</div>
        <div>Размер: ${fmtKV(x.size)}</div>
        <div>Обновлено: ${fmtKV(x.updated)}</div>
      </div>
      <div class="row">
        <a class="btn link" href="${x.href}" target="_blank" rel="noopener">Скачать</a>
        <button class="btn ghost" data-copy="${x.href}">Копировать ссылку</button>
      </div>
    </article>`).join('');

  grid.innerHTML = html;
  stats.textContent = `Показано ${items.length} из ${tools.length}`;

  grid.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Скопировано'; setTimeout(()=> b.textContent='Копировать ссылку', 1200); }catch{}
  }));
}

// ====== ПОИСК/ФИЛЬТР/СОРТ ======
function matchQuery(x, qStr){
  if(!qStr) return true;
  const s = (x.name + ' ' + (x.desc||'') + ' ' + (x.tags||[]).join(' ') + ' ' + (x.os||[]).join(' ')).toLowerCase();
  return s.includes(qStr.toLowerCase());
}
function matchOS(x){ if(state.os.size === 0) return true; return (x.os||[]).some(o => state.os.has(o)); }
function matchTags(x){ if(state.tags.size === 0) return true; return (x.tags||[]).some(t => state.tags.has(t)); }
function matchDate(x){
  if(!state.dFrom && !state.dTo) return true;
  const d = x.updated ? new Date(x.updated) : null;
  if(!d) return false;
  if(state.dFrom && d < state.dFrom) return false;
  if(state.dTo && d > state.dTo) return false;
  return true;
}

function toBytes(sz){
  if(!sz || sz==='—') return Infinity;
  const m = /([\d.]+)\s*(KB|MB|GB)/i.exec(sz);
  if(!m) return Infinity;
  const n = parseFloat(m[1]);
  const mul = m[2].toUpperCase()==='KB'?1024: m[2].toUpperCase()==='MB'?1024**2:1024**3;
  return n*mul;
}

function sortItems(arr){
  const byName = (a,b)=> a.name.localeCompare(b.name);
  const byUpdated = (a,b)=> new Date(b.updated||0) - new Date(a.updated||0);
  const bySize = (a,b)=> toBytes(a.size) - toBytes(b.size);
  switch(state.sort){
    case 'name': return arr.sort(byName);
    case 'updated': return arr.sort(byUpdated);
    case 'size': return arr.sort(bySize);
    default: return arr;
  }
}

function update(){
  const filtered = tools.filter(x =>
    matchQuery(x, state.q) &&
    matchOS(x) &&
    matchTags(x) &&
    matchDate(x)
  );
  renderGrid(sortItems(filtered.slice()));
}

// ====== СЛУШАТЕЛИ ======
q.addEventListener('input', e => { state.q = e.target.value.trim(); update(); });
sortSel.addEventListener('change', e => { state.sort = e.target.value; update(); });
logoutBtn.addEventListener('click', () => {
  if(!ACCESS_ENABLED) return;
  topbar.classList.add('hidden'); app.classList.add('hidden'); foot.classList.add('hidden');
  gate.classList.remove('hidden'); input.value='';
});

// ====== ДОСТУП / ЛОАДЕР ======
function grant(){
  gate.classList.add('hidden'); loader.classList.remove('hidden');
  loaderText.textContent = 'Загрузка…';
  setTimeout(()=> loaderText.textContent = 'ACCESS GRANTED…', 900);
  setTimeout(()=> { loader.classList.add('hidden'); topbar.classList.remove('hidden'); app.classList.remove('hidden'); foot.classList.remove('hidden'); }, 1600);
}
function tryEnter(){
  if(!ACCESS_ENABLED){ grant(); return; }
  const val = (input.value||'').trim().toLowerCase();
  if(val === ACCESS_CODE.toLowerCase()) grant(); else { err.style.display='block'; setTimeout(()=> err.style.display='none', 1500); }
}
enterBtn.addEventListener('click', tryEnter);
input?.addEventListener('keydown', e => { if(e.key==='Enter') tryEnter(); });

// ====== СТАРТ ======
function boot(){
  renderOS();
  renderTags();
  update();
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

// сразу показывать без кода (если выключено)
if(!ACCESS_ENABLED){
  document.getElementById('gate').classList.add('hidden');
  topbar.classList.remove('hidden'); app.classList.remove('hidden'); foot.classList.remove('hidden');
}
