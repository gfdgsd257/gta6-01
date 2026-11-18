[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/gfdgsd257/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/gfdgsd257/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Bay — Open-World Crime Game

A 2D top-down open-world crime game in the spirit of GTA 6, built from
scratch for make.fun's "Make GTA 6" bounty. You are **Leo Marin**, a
courier trying to buy his way out of the sun-soaked coastal city of
**Solmar Bay**. Steal cars, outrun the police, run story jobs for the
dispatcher **Marta**, and earn enough to leave the city behind.

Everything is original: the city, the characters, the vehicles, the
story, the art and the sounds. No real city, person or game is copied.

## How to play

Serve `game/` with any static server and open `index.html` in a desktop
browser — no build step, no network, no installs:

```
python3 -m http.server --directory game 8080
```

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Walk, run (with Shift) / drive |
| E | Steal a nearby car / get out of a car |
| Space | Handbrake while driving |
| F | Punch |
| Mouse click | Shoot the pistol (aim with the mouse) |
| P / Esc | Pause |
| M | Mute sound |

## Features

- **A city to explore** — a seeded grid of roads, blocks, buildings,
  parks, a beach, a pier and a bridge, with a camera that follows you
  and a live minimap in the HUD.
- **Cars to steal and drive** — sedans, taxis, trucks, sports cars and
  vans with arcade driving physics; traffic follows the road grid.
- **Pedestrians** — locals strolling the sidewalks who flee when a car
  bears down on them or a gun goes off.
- **Wanted level** — five stars. Steal a car, hit a pedestrian or fire
  a gun and the police send interceptors to ram you off the road. Lay
  low and the heat cools off. Get caught on foot and you are busted.
- **Combat** — fists and a pistol with scarce ammo; ammo, health and
  cash pickups are hidden around the city.
- **Story jobs** — three scripted missions with dialogue, map markers
  and cash rewards: a package run, a hot-wheels getaway, and a rescue
  on the pier.
- **HUD** — health, cash, ammo, wanted stars, speed, a clock with a
  day/night cycle, mission objectives and a minimap.
- **Polish** — particles (smoke, sparks, muzzle flashes), screen shake,
  synthesised WebAudio sound effects (engine, siren, gunshots, pickups)
  with a mute toggle, title / pause / game-over screens, and progress
  saved to localStorage.

## Screenshots

Real renders of the game running in a browser (1280×720):

- `screenshots/01-driving.jpg` — driving a sports car through Solmar Bay
- `screenshots/02-street.jpg` — on foot at the market-square intersection
- `screenshots/03-chase.jpg` — a 3-star police chase
- `screenshots/04-mission.jpg` — the first job, with its marker and dialogue

## Project layout

- `main.ts` — the entry program: copies `game/` + `screenshots/` to
  the output directory and writes `dossier.json`.
- `game/index.html` — the page shell.
- `game/src/` — the game's own source, one file per job:
  `config`, `random`, `input`, `audio`, `save`, `particles`, `world`,
  `vehicles`, `pedestrians`, `police`, `combat`, `missions`, `hud`,
  `render`, `player`, `state`, `main`.
- `screenshots/` — real renders of the game running in a browser.

## License

MIT — see `LICENSE`.
