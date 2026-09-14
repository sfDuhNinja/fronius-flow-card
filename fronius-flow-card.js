// Fronius Solar.web power-flow widget, "app" style (thin ring + bold external
// labels), rebuilt to match the Solar.web mobile app rather than the desktop
// site's thick-donut widget.
class FroniusFlowCard extends HTMLElement {
  setConfig(config) {
    if (!config.pv_power) throw new Error('pv_power entity required');
    this._config = {
      max_pv: 10000, max_grid: 10000, max_battery: 10000, max_load: 10000, // watts, ring full-scale
      ...config,
    };
    if (!this._built) this._build();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 4; }

  static getConfigElement() {
    return document.createElement('fronius-flow-card-editor');
  }

  static getStubConfig(hass) {
    const pv = Object.keys(hass.states).find((e) => e.startsWith('sensor.') && /pv|solar/i.test(e));
    return { pv_power: pv || '', max_pv: 6000, max_grid: 6000, max_battery: 6000, max_load: 6000 };
  }

  _build() {
    this._built = true;
    // R/HUBR/icon ratios and node spacing measured directly off a Solar.web
    // app screenshot (hub = 0.46x node radius, icon = 0.75x node radius,
    // node<->hub gap = 1.39x node radius).
    const R = 43.2, HUBR = 22; // R shrunk 10%; ring stroke-width stays fixed
    const NODES = {
      pv:   { cx: 103, cy: 103, color: '#F7C002', icon: ICONS.sun,     labelPos: 'above' },
      load: { cx: 297, cy: 103, color: '#5B9BD1', icon: ICONS.house,   labelPos: 'above' },
      grid: { cx: 103, cy: 297, color: '#9AA0A6', icon: ICONS.pylon,   labelPos: 'below' },
      // The battery glyph is a wide, short pill in the app (measured ~1.75:1,
      // not square like the other icons) — sized so its own width/height
      // match the app's ratio to the ring, not forced into the same square
      // box as the round icons.
      batt: { cx: 297, cy: 297, color: '#5FB863', icon: ICONS.battery, labelPos: 'below', iconSize: 56 },
    };
    for (const n of Object.values(NODES)) n.iconSize ??= 36;
    const hub = { cx: 200, cy: 200 };
    this._hub = hub;
    this._nodeCenters = NODES;
    const line = (id, n) => {
      const dx = hub.cx - n.cx, dy = hub.cy - n.cy;
      const d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const x1 = n.cx + R * ux, y1 = n.cy + R * uy;
      const x2 = hub.cx - HUBR * ux, y2 = hub.cy - HUBR * uy;
      return `<line id="ff-${id}-line" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    };

    // 10px feather around every circle (4 nodes + hub): lines/balls fade to
    // nothing as they approach a ring instead of hitting its edge sharply.
    const FADE = 10;
    const fadeCircles = [...Object.values(NODES).map((n) => ({ ...n, r: R })), { ...hub, r: HUBR }];
    const fadeGradients = fadeCircles.map((c, i) => {
      const inner = (c.r / (c.r + FADE) * 100).toFixed(2);
      return `<radialGradient id="ff-fade-${i}" gradientUnits="userSpaceOnUse" cx="${c.cx}" cy="${c.cy}" r="${c.r + FADE}">
        <stop offset="0%" stop-color="#000"/>
        <stop offset="${inner}%" stop-color="#000"/>
        <stop offset="100%" stop-color="#fff"/>
      </radialGradient>`;
    }).join('');
    const fadeMaskShapes = fadeCircles.map((c, i) =>
      `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r + FADE}" fill="url(#ff-fade-${i})"/>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <ha-card>
        <div class="ff-wrap">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="ff-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.8" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              ${fadeGradients}
              <mask id="ff-fade-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
                <rect x="0" y="0" width="400" height="400" fill="#fff"/>
                ${fadeMaskShapes}
              </mask>
              ${Object.entries(NODES).map(([id, n]) => `
                <linearGradient id="ff-trail-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">
                  <stop offset="0%" stop-color="${n.color}" stop-opacity="0"/>
                  <stop offset="100%" stop-color="${n.color}" stop-opacity="1"/>
                </linearGradient>`).join('')}
            </defs>
            <g class="ff-lines" mask="url(#ff-fade-mask)">
              ${Object.entries(NODES).map(([id, n]) => line(id, n)).join('')}
            </g>
            <g id="ff-dots" mask="url(#ff-fade-mask)"></g>
            ${Object.entries(NODES).map(([id, n]) => this._node(id, n, R)).join('')}
            <circle cx="${hub.cx}" cy="${hub.cy}" r="${HUBR}" fill="#E2001A"/>
            <g transform="translate(${hub.cx - 13.5},${hub.cy - 13.5})">${ICONS.hub}</g>
          </svg>
        </div>
      </ha-card>
      <style>
        ha-card{padding:0}
        .ff-wrap{padding:8px;aspect-ratio:1/1;box-sizing:border-box}
        svg{width:100%;height:100%;display:block;font-family:inherit}
        .ff-lines line{stroke:var(--divider-color,#444);stroke-width:3.5}
        .ff-value{font-size:22px;font-weight:700;text-anchor:middle;fill:var(--primary-text-color)}
        .ff-unit{font-size:12px;font-weight:400;fill:var(--secondary-text-color,#888)}
        .ff-soc{font-size:15px;font-weight:700;text-anchor:middle}
      </style>`;
    this.appendChild(wrap);
    this._svg = wrap.querySelector('svg');
    this._dotsLayer = wrap.querySelector('#ff-dots');
    requestAnimationFrame((t) => this._tick(t));
  }

  _node(id, n, R) {
    const labelY = n.labelPos === 'above' ? n.cy - R - 16 : n.cy + R + 27;
    return `
      <g>
        <circle cx="${n.cx}" cy="${n.cy}" r="${R}" fill="none" stroke="${n.color}" stroke-opacity="0.25" stroke-width="4.5"/>
        <circle id="ff-${id}-ring" cx="${n.cx}" cy="${n.cy}" r="${R}" fill="none" stroke="${n.color}"
                stroke-width="4.5" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"
                transform="rotate(-90 ${n.cx} ${n.cy})"/>
        <g transform="translate(${n.cx - n.iconSize / 2},${n.cy - n.iconSize / 2})" style="color:${n.color}">${n.icon}</g>
        ${id === 'batt' ? `<text id="ff-batt-soc" class="ff-soc" x="${n.cx - 2}" y="${n.cy + 4}" fill="${n.color}"></text>` : ''}
        <text id="ff-${id}-text" x="${n.cx}" y="${labelY}"></text>
      </g>`;
  }

  // Reads a sensor and normalizes to watts using its own unit_of_measurement
  // (handles entities reported in kW instead of W).
  _num(entityId) {
    const s = this._hass?.states[entityId];
    if (!s) return 0;
    const v = parseFloat(s.state);
    if (Number.isNaN(v)) return 0;
    return s.attributes?.unit_of_measurement === 'kW' ? v * 1000 : v;
  }

  // Grid/battery accept either one signed entity or two unsigned entities
  // (one per direction) — whichever the user configured. Two-entity wins if
  // either half of that pair is set.
  _signedPair(entityMinus, entityPlus, signedEntity) {
    if (entityMinus || entityPlus) {
      const plus = entityPlus ? Math.abs(this._num(entityPlus)) : 0;
      const minus = entityMinus ? Math.abs(this._num(entityMinus)) : 0;
      return plus - minus;
    }
    return signedEntity ? this._num(signedEntity) : 0;
  }

  _render() {
    if (!this._built) return;
    const c = this._config;
    const pv = this._num(c.pv_power);
    // + = import, - = export
    const grid = this._signedPair(c.grid_export_power, c.grid_import_power, c.grid_power);
    // + = discharge, - = charge
    const batt = this._signedPair(c.battery_charge_power, c.battery_discharge_power, c.battery_power);
    const soc = c.battery_soc ? this._num(c.battery_soc) : null;
    // House consumption isn't its own sensor: energy balance gives it to us
    // (production + net import + net discharge = consumption).
    const load = pv + grid + batt;

    const setRing = (id, pct) => {
      const el = this._svg.querySelector(`#ff-${id}-ring`);
      el.setAttribute('stroke-dasharray', `${Math.max(0, Math.min(100, pct * 100)).toFixed(1)} 100`);
    };
    const setLabel = (id, watts) => {
      this._svg.querySelector(`#ff-${id}-text`).innerHTML = this._labelHtml(watts);
    };
    // Load's ring isn't scaled against a fixed wattage like the others — it
    // shows what fraction of the currently-available sources (production +
    // any import + any discharge) the house is actually using. Grid follows
    // the same idea: import/export's share of total power moving through
    // the system right now (production + |grid| + |batt| + load), so it
    // reads as "how much of all current traffic is grid", not an arbitrary
    // wattage scale.
    const sourcesSum = pv + Math.max(grid, 0) + Math.max(batt, 0);
    const totalFlow = pv + Math.abs(grid) + Math.abs(batt) + Math.abs(load);
    setRing('pv', Math.abs(pv) / c.max_pv); setLabel('pv', pv);
    setRing('grid', totalFlow > 0 ? Math.abs(grid) / totalFlow : 0); setLabel('grid', grid);
    setRing('load', sourcesSum > 0 ? Math.abs(load) / sourcesSum : 0); setLabel('load', load);
    setRing('batt', soc != null ? soc / 100 : Math.abs(batt) / c.max_battery); setLabel('batt', batt);
    if (soc != null) this._svg.querySelector('#ff-batt-soc').textContent = `${soc.toFixed(0)}`;

    this._flows = {
      pv: { line: 'pv-line', power: pv, color: '#F7C002', toHub: true },
      grid: { line: 'grid-line', power: grid, color: '#9AA0A6', toHub: grid >= 0 },
      load: { line: 'load-line', power: load, color: '#5B9BD1', toHub: false },
      batt: { line: 'batt-line', power: batt, color: '#5FB863', toHub: batt >= 0 },
    };
  }

  // Bold value + lighter unit, comma decimal (ro-RO) to match the app.
  _labelHtml(w) {
    const abs = Math.abs(w);
    const [value, unit] = abs >= 1000
      ? [(abs / 1000).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'kW']
      : [Math.round(abs).toString(), 'W'];
    return `<tspan class="ff-value">${value}</tspan><tspan class="ff-unit"> ${unit}</tspan>`;
  }

  // Incoming and outgoing balls never coexist: the cycle is split in two
  // halves. First half — every "into the hub" line travels source-node
  // center -> hub center. Second half — every "out of the hub" line travels
  // hub center -> receiver-node center. Full center-to-center, not edge-to-
  // edge, so nothing pops in/out at a ring boundary — it's just covered by
  // the node's icon/hub artwork along the way. All lines share one clock and
  // the same length (symmetric diamond), so speed stays identical across
  // every scenario.
  _tick(t) {
    requestAnimationFrame((t2) => this._tick(t2));
    if (!this._flows) return;
    const LEG_S = 2.15; // inbound leg, then outbound leg, no pause between
    const elapsed = (t / 1000) % (LEG_S * 2);
    if (elapsed < LEG_S) { this._leg = 'in'; this._legPhase = elapsed / LEG_S; }
    else { this._leg = 'out'; this._legPhase = (elapsed - LEG_S) / LEG_S; }
    this._paintDots();
  }

  // The trail is one continuous gradient-faded line (tail transparent, head
  // opaque) plus a bright dot at the head — not a string of discrete circles,
  // which read as choppy/stepped rather than a smooth comet.
  _paintDots() {
    const SPAN = 0.19, R = 4.5; // teardrop: rounded head, tapering faded tail
    const inbound = this._leg === 'in';
    const localPhase = this._legPhase || 0;
    const hub = this._hub;
    let html = '';
    for (const [key, flow] of Object.entries(this._flows || {})) {
      if (Math.abs(flow.power) < 1) continue;
      if (flow.toHub !== inbound) continue; // the other direction is silent this half
      const node = this._nodeCenters[key];
      if (!node) continue;
      const [sx, sy, ex, ey] = flow.toHub
        ? [node.cx, node.cy, hub.cx, hub.cy]
        : [hub.cx, hub.cy, node.cx, node.cy];
      const headT = localPhase, tailT = Math.max(0, localPhase - SPAN);
      const dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      const hx = sx + dx * headT, hy = sy + dy * headT;
      const tx = sx + dx * tailT, ty = sy + dy * tailT;
      const b1x = hx + px * R, b1y = hy + py * R;
      const b2x = hx - px * R, b2y = hy - py * R;
      // Tail tapers down to the connector line's own width (not a point),
      // so it visually picks up where the line leaves off.
      const halfLine = 1.75; // half of .ff-lines stroke-width (3.5)
      const t1x = tx + px * halfLine, t1y = ty + py * halfLine;
      const t2x = tx - px * halfLine, t2y = ty - py * halfLine;
      // Circle (rounded head) + trapezoid (tapering tail) instead of an arc
      // path — a 180°-sweep elliptical arc is a degenerate edge case that
      // rendered as a straight edge instead of a curve (sharp arrowhead, not
      // a rounded teardrop).
      const grad = this._svg.querySelector(`#ff-trail-${key}`);
      grad.setAttribute('x1', tx.toFixed(2)); grad.setAttribute('y1', ty.toFixed(2));
      grad.setAttribute('x2', hx.toFixed(2)); grad.setAttribute('y2', hy.toFixed(2));
      html += `<polygon points="${t1x.toFixed(2)},${t1y.toFixed(2)} ${b1x.toFixed(2)},${b1y.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)} ${t2x.toFixed(2)},${t2y.toFixed(2)}" fill="url(#ff-trail-${key})" filter="url(#ff-glow)"/>
               <circle cx="${hx.toFixed(2)}" cy="${hy.toFixed(2)}" r="${R}" fill="${flow.color}" filter="url(#ff-glow)"/>`;
    }
    this._dotsLayer.innerHTML = html;
  }
}

// Simplified outline icon set matching the app's flat/sleek style
// (the desktop widget's filled icons didn't fit this look).
const ICONS = {
  sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
      `<line x1="12" y1="3" x2="12" y2="5.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" transform="rotate(${a} 12 12)"/>`
    ).join('')}
  </svg>`,
  house: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
    <path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10M12,7.7L6,12.19V18H8V12H16V18H18V12.19L12,7.7Z"/>
  </svg>`,
  pylon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
    <path fill="currentColor" d="M13.38,8.54V6.63H18.3V8.06h.95V5.7l-6.35-1L12,2l-1,2.8-6.25.9V8.07H5.6V6.63h4.84V8.54l-7.59,1.9v2.84H3.8V11.76H9.87L6.93,22H9.11l.57-2.46h4.59L14.8,22h2.27L14.13,11.76H20.2v1.52h.95V10.44Zm-3.32,8.81L12,11.11l1.91,6.24Z"/>
  </svg>`,
  battery: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="56" height="56">
    <rect x="2" y="6.5" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="20.5" y="9.25" width="2" height="5.5" rx="1" fill="currentColor"/>
  </svg>`,
  hub: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="27" height="27">
    <path fill="#fff" d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M12,5C15.09,5 17.82,7.04 18.7,10H16A1,1 0 0,0 15,11V13A1,1 0 0,0 16,14H18.71C17.82,16.97 15.09,19 12,19A7,7 0 0,1 5,12A7,7 0 0,1 12,5M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z"/>
  </svg>`,
};

// Visual editor: entity pickers + number fields, using HA's own
// ha-entity-picker/ha-textfield elements (already loaded by the frontend —
// no bundling, no new dependency).
class FroniusFlowCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._built) this._syncHass();
    else this._render();
  }

  _render() {
    if (!this._hass || !this._config || this._built) return;
    this._built = true;
    this.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;">
        <ha-entity-picker id="pv" label="PV power (required)" allow-custom-entity></ha-entity-picker>

        <div style="font-size:13px;opacity:0.7">Grid — either one signed entity, or one per direction (the pair wins if either is set)</div>
        <ha-entity-picker id="grid" label="Grid power, signed (+import/-export)" allow-custom-entity></ha-entity-picker>
        <div style="display:flex;gap:8px;">
          <ha-entity-picker id="grid_import" label="Grid import power" allow-custom-entity style="flex:1"></ha-entity-picker>
          <ha-entity-picker id="grid_export" label="Grid export power" allow-custom-entity style="flex:1"></ha-entity-picker>
        </div>

        <div style="font-size:13px;opacity:0.7">Battery — either one signed entity, or one per direction (the pair wins if either is set)</div>
        <ha-entity-picker id="batt" label="Battery power, signed (+discharge/-charge)" allow-custom-entity></ha-entity-picker>
        <div style="display:flex;gap:8px;">
          <ha-entity-picker id="batt_discharge" label="Battery discharge power" allow-custom-entity style="flex:1"></ha-entity-picker>
          <ha-entity-picker id="batt_charge" label="Battery charge power" allow-custom-entity style="flex:1"></ha-entity-picker>
        </div>
        <ha-entity-picker id="soc" label="Battery state of charge (%)" allow-custom-entity></ha-entity-picker>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <label style="flex:1;min-width:120px;font-size:13px;display:flex;flex-direction:column;gap:4px">Max PV (<span id="max_pv_unit">W</span>)
            <input id="max_pv" type="number" step="any" style="padding:8px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#fff);border:1px solid var(--divider-color,#444);border-radius:4px"/>
          </label>
          <label style="flex:1;min-width:120px;font-size:13px;display:flex;flex-direction:column;gap:4px">Max grid (<span id="max_grid_unit">W</span>)
            <input id="max_grid" type="number" step="any" style="padding:8px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#fff);border:1px solid var(--divider-color,#444);border-radius:4px"/>
          </label>
          <label style="flex:1;min-width:120px;font-size:13px;display:flex;flex-direction:column;gap:4px">Max battery (<span id="max_battery_unit">W</span>)
            <input id="max_battery" type="number" step="any" style="padding:8px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#fff);border:1px solid var(--divider-color,#444);border-radius:4px"/>
          </label>
          <label style="flex:1;min-width:120px;font-size:13px;display:flex;flex-direction:column;gap:4px">Max load (W)
            <input id="max_load" type="number" style="padding:8px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#fff);border:1px solid var(--divider-color,#444);border-radius:4px"/>
          </label>
        </div>
      </div>`;
    this._units = { pv: 'W', grid: 'W', battery: 'W' };
    this._wire();
    this._syncHass();
    for (const f of ['pv', 'grid', 'battery']) this._refreshMaxUnit(f);
  }

  // Which entity (in priority order) decides a max-field's unit.
  _maxUnitSources = {
    pv: ['pv_power'],
    grid: ['grid_import_power', 'grid_export_power', 'grid_power'],
    battery: ['battery_discharge_power', 'battery_charge_power', 'battery_power'],
  };

  _entityUnit(entityId) {
    const u = entityId && this._hass?.states[entityId]?.attributes?.unit_of_measurement;
    return u === 'kW' ? 'kW' : 'W';
  }

  // Reads the currently-picked entity for a max-field, matches the field's
  // displayed unit to it, and reformats the input (the stored config value
  // stays in watts either way — only the on-screen number/unit changes).
  _refreshMaxUnit(fieldKey) {
    let unit = 'W';
    for (const configKey of this._maxUnitSources[fieldKey]) {
      if (this._config[configKey]) { unit = this._entityUnit(this._config[configKey]); break; }
    }
    this._units[fieldKey] = unit;
    const label = this.querySelector(`#max_${fieldKey}_unit`);
    if (label) label.textContent = unit;
    const input = this.querySelector(`#max_${fieldKey}`);
    const watts = this._config[`max_${fieldKey}`];
    if (input) input.value = watts == null ? '' : (unit === 'kW' ? watts / 1000 : watts);
  }

  _syncHass() {
    for (const id of ['pv', 'grid', 'grid_import', 'grid_export', 'batt', 'batt_discharge', 'batt_charge', 'soc']) {
      const el = this.querySelector(`#${id}`);
      if (el) el.hass = this._hass;
    }
    // Restrict pickers to their matching sensor device_class so the list
    // only offers power (W/kW) entities, or % for the SOC field.
    const powerIds = ['pv', 'grid', 'grid_import', 'grid_export', 'batt', 'batt_discharge', 'batt_charge'];
    for (const id of powerIds) {
      const el = this.querySelector(`#${id}`);
      if (el) { el.includeDomains = ['sensor']; el.includeDeviceClasses = ['power']; }
    }
    const soc = this.querySelector('#soc');
    if (soc) { soc.includeDomains = ['sensor']; soc.includeDeviceClasses = ['battery']; }
  }

  _wire() {
    const entityFields = {
      pv: ['pv_power', 'pv'],
      grid: ['grid_power', 'grid'], grid_import: ['grid_import_power', 'grid'], grid_export: ['grid_export_power', 'grid'],
      batt: ['battery_power', 'battery'], batt_discharge: ['battery_discharge_power', 'battery'], batt_charge: ['battery_charge_power', 'battery'],
      soc: ['battery_soc', null],
    };
    for (const [id, [key, maxField]] of Object.entries(entityFields)) {
      const el = this.querySelector(`#${id}`);
      el.value = this._config[key] || '';
      el.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        this._update(key, ev.detail.value || undefined);
        if (maxField) this._refreshMaxUnit(maxField);
      });
    }
    for (const fieldKey of ['pv', 'grid', 'battery']) {
      const el = this.querySelector(`#max_${fieldKey}`);
      el.addEventListener('input', () => {
        const raw = parseFloat(el.value);
        const watts = Number.isFinite(raw) ? Math.round(this._units[fieldKey] === 'kW' ? raw * 1000 : raw) : undefined;
        this._update(`max_${fieldKey}`, watts);
      });
    }
    const loadEl = this.querySelector('#max_load');
    loadEl.value = this._config.max_load ?? '';
    loadEl.addEventListener('input', () => {
      const v = parseInt(loadEl.value, 10);
      this._update('max_load', Number.isFinite(v) ? v : undefined);
    });
  }

  _update(key, value) {
    const next = { ...this._config };
    if (value === undefined) delete next[key];
    else next[key] = value;
    this._config = next;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: next }, bubbles: true, composed: true }));
  }
}
customElements.define('fronius-flow-card-editor', FroniusFlowCardEditor);

customElements.define('fronius-flow-card', FroniusFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'fronius-flow-card',
  name: 'Fronius Flow Card',
  description: 'Solar.web app-style power flow widget',
});
