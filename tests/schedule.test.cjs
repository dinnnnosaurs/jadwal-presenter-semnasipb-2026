const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const blob = html.match(/window\.JADWAL_DB=(\{[^\n]+\});/)[1];
const manual = JSON.parse(fs.readFileSync(path.join(root, 'jadwal-1-desember.json'), 'utf8'));
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(value => value.includes('var DB = window.JADWAL_DB;'));
const runtime = script.replace(/\}\)\(\);\s*$/, `
  window.__scheduleTests = {
    records: function(){ return ALL; }, state: state,
    manual: muatJadwalManual, sheets: sinkronkanJadwalGoogleSheets,
    render: render, modal: openModal
  };
})();`);

class Element {
  constructor() {
    this.innerHTML = ''; this.textContent = ''; this.style = {};
    this.listeners = {}; this.attributes = {}; this.hidden = false;
    this.classList = { add(){}, remove(){}, toggle(){} };
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  focus() {}
  remove() {}
}

function createApp() {
  const elements = new Map();
  const scripts = [], requests = [], intervals = [], warnings = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const document = {
    getElementById: element,
    querySelector: element,
    addEventListener(){},
    createElement(){ return new Element(); },
    body: new Element(),
    head: { appendChild(node){ scripts.push(node); } }
  };
  const context = vm.createContext({
    window: { JADWAL_DB: JSON.parse(blob) }, document, URL,
    console: { info(){}, warn(...args){ warnings.push(args); } },
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    },
    setTimeout(){ return 1; }, clearTimeout(){},
    setInterval(callback){ intervals.push(callback); return intervals.length; }
  });
  vm.runInContext(runtime, context);
  return {
    api: context.window.__scheduleTests, element, requests, intervals, warnings,
    records(){ return JSON.parse(JSON.stringify(this.api.records())); },
    respondManual(data, ok = true) {
      const request = requests.shift();
      assert.equal(request.url, './jadwal-1-desember.json');
      assert.equal(request.options.cache, 'no-store');
      request.resolve({ ok, json: async () => data });
    },
    respondSheets(records) {
      const request = scripts.shift();
      const callback = new URL(request.src).searchParams.get('callback');
      context.window[callback]({ ok: true, records });
    },
    failSheets(){ scripts.shift().onerror(); }
  };
}

function sheetRecords() {
  return [
    { hari: '1', nama: 'Tanggal 1 dari Sheets sengaja tidak lengkap' },
    ...[2, 3, 4].map(hari => ({
      hari, nama: 'Peneliti Sheets ' + hari, judul: 'Judul terkini ' + hari,
      skema: 'Skema Sheets', ruang: 'Room ' + hari, jam: '08.45-09.45 WIB'
    }))
  ];
}

async function flush() {
  await new Promise(resolve => setImmediate(resolve));
}

for (const first of ['manual', 'sheets']) {
  test('Sumber tidak saling menimpa ketika respons pertama adalah ' + first, async () => {
    const app = createApp();
    const edited = structuredClone(manual);
    edited.ruang = 'Lokasi manual';
    edited.jam = '11.00-11.30 WIB';
    edited.peserta.push({ nama: 'Nama Manual Terakhir', judul: 'Judul <uji> manual', skema: 'Skema baru' });
    if (first === 'manual') {
      app.respondManual(edited); await flush(); app.respondSheets(sheetRecords());
    } else {
      app.respondSheets(sheetRecords()); await flush(); app.respondManual(edited);
    }
    await flush();
    const records = app.records();
    assert.equal(records.length, edited.peserta.length + 3);
    assert.equal(records.filter(r => r.dayNum === 1).length, edited.peserta.length);
    assert.equal(records[0].room, 'Lokasi manual');
    assert.equal(records[0].time, '11.00-11.30 WIB');
    assert.equal(records.at(-1).name, 'Peneliti Sheets 4');
    assert.deepEqual(records.map(r => r.id), records.map((_, i) => i + 1));

    // Filter, pencarian, batas delapan kartu, dan detail memakai data gabungan.
    app.api.state.day = 1; app.api.render();
    assert.equal((app.element('grid').innerHTML.match(/role="button"/g) || []).length, 8);
    app.api.state.query = 'manual terakhir'; app.api.render();
    assert.match(app.element('grid').innerHTML, /Judul &lt;uji&gt; manual/);
    assert.doesNotMatch(app.element('grid').innerHTML, /Judul <uji> manual/);
    app.api.modal(edited.peserta.length);
    assert.equal(app.element('modalName').textContent, 'Nama Manual Terakhir');
    assert.equal(app.element('modalZoomSection').hidden, true);
    app.api.modal(edited.peserta.length + 1);
    assert.equal(app.element('modalName').textContent, 'Peneliti Sheets 2');
    assert.equal(app.element('modalZoomSection').hidden, false);

    // Pemeriksaan berkala mempertahankan data manual yang sama.
    app.intervals[0]();
    app.respondSheets(sheetRecords()); app.respondManual(edited); await flush();
    assert.deepEqual(app.records().filter(r => r.dayNum === 1), records.filter(r => r.dayNum === 1));
  });
}

test('Kegagalan salah satu sumber mempertahankan data terakhir dari sumber tersebut', async () => {
  const app = createApp();
  app.respondManual(manual); app.respondSheets(sheetRecords()); await flush();
  const valid = app.records();
  app.api.manual(); app.api.sheets();
  app.respondManual({}, false); app.failSheets(); await flush();
  assert.deepEqual(app.records(), valid);
  app.api.manual(); app.api.sheets();
  app.respondManual({ ...manual, peserta: [{ nama: 'Tidak lengkap' }] });
  app.respondSheets([{ hari: 1, nama: 'Diabaikan' }]); await flush();
  assert.deepEqual(app.records(), valid);
  assert.equal(app.warnings.length, 4);
});

test('Peserta manual dapat dihapus, diurutkan, dan diberi ruang/jam khusus', async () => {
  const app = createApp();
  const edited = structuredClone(manual);
  edited.peserta.reverse();
  edited.peserta[0].ruang = 'Ruang khusus';
  edited.peserta[0].jam = '12.00-12.30 WIB';
  app.respondManual(edited); app.respondSheets(sheetRecords()); await flush();
  assert.equal(app.records()[0].name, edited.peserta[0].nama);
  assert.equal(app.records()[0].room, 'Ruang khusus');
  assert.equal(app.records()[0].time, '12.00-12.30 WIB');
  assert.equal(app.records()[1].room, manual.ruang);
  app.api.manual(); app.respondManual({ ...manual, peserta: [] }); await flush();
  assert.equal(app.records().length, 3);
  assert.equal(app.records()[0].id, 1);
  app.api.modal(1);
  assert.equal(app.element('modalName').textContent, 'Peneliti Sheets 2');
});

test('Template tetap sama dengan halaman terbit, selain data cadangan', () => {
  const expected = html.replace(/window\.JADWAL_DB=\{[^\n]+\};/, '/*__DATA_BLOB__*/');
  assert.equal(fs.readFileSync(path.join(root, 'template.html'), 'utf8'), expected);
});
