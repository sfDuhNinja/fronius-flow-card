# Fronius Flow Card

A Home Assistant Lovelace card that shows PV / grid / battery / house power
flow as an animated diamond, styled after the Fronius Solar.web app's
"current power" widget (thin ring gauges, a red hub, and animated balls
tracing energy flow between nodes).


## Features

- Four nodes (PV, house, grid, battery) around a central hub, each with a
  thin progress ring showing its share of max power (or state of charge for
  the battery).
- Animated flow: balls travel from active sources into the hub, then out to
  active sinks — inbound and outbound never overlap, so the direction of
  flow is always unambiguous.
- Grid and battery each accept either one signed entity (`+`/`-` for
  import/export or discharge/charge) or two separate entities, one per
  direction — whichever you have available.
- A built-in visual editor (entity pickers, filtered to `power`/`battery`
  device classes) — no YAML required.
- Units (W/kW) are read from each entity's own `unit_of_measurement` and
  normalized automatically.

## Installation

### HACS (recommended)

1. HACS → Frontend → ⋮ → Custom repositories → add this repo's URL, category
   "Lovelace".
2. Install "Fronius Flow Card", then add the resource if HACS didn't do it
   automatically (Settings → Dashboards → Resources).

### Manual

1. Copy `fronius-flow-card.js` into `<config>/www/`.
2. Settings → Dashboards → Resources → Add → `/local/fronius-flow-card.js`,
   type "JavaScript Module".

## Configuration

Add the card via the dashboard UI (search "Fronius Flow Card") or YAML:

```yaml
type: custom:fronius-flow-card
pv_power: sensor.pv_power
load_power: sensor.house_load_power   # optional — computed from the others if omitted
grid_power: sensor.grid_power          # signed: + import, - export
battery_power: sensor.battery_power    # signed: + discharge, - charge
battery_soc: sensor.battery_soc
max_pv: 6000
max_grid: 6000
max_battery: 6000
```

### Two entities instead of one signed entity

```yaml
type: custom:fronius-flow-card
pv_power: sensor.pv_power
grid_import_power: sensor.grid_import_power
grid_export_power: sensor.grid_export_power
battery_discharge_power: sensor.battery_discharge_power
battery_charge_power: sensor.battery_charge_power
battery_soc: sensor.battery_soc
```

| Option | Required | Description |
|---|---|---|
| `pv_power` | yes | PV production entity |
| `grid_power` | no | Signed grid power (+import/-export) |
| `grid_import_power` / `grid_export_power` | no | Unsigned pair; wins over `grid_power` if either is set |
| `battery_power` | no | Signed battery power (+discharge/-charge) |
| `battery_discharge_power` / `battery_charge_power` | no | Unsigned pair; wins over `battery_power` if either is set |
| `battery_soc` | no | Battery state of charge (%), shown inside the battery icon |
| `max_pv` / `max_grid` / `max_battery` / `max_load` | no | Full-scale watts for each ring gauge (default 10000) |

## License

MIT
