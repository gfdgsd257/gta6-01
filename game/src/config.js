// Solmar Bay — shared tuning numbers and world dimensions.
// Every other module reads its constants from here so the whole game
// stays in tune from one place.
export const STEP = 1 / 60;

export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_SPACING = 420;
export const ROAD_W = 96;
export const BLOCK = ROAD_SPACING - ROAD_W;

// The sea hugs the south edge; the pier and the bridge cross it.
export const SEA_Y = 2280;
export const BRIDGE_X = 1800;
export const BRIDGE_W = 150;

export const PLAYER_RADIUS = 14;
export const PLAYER_WALK_SPEED = 170;
export const PLAYER_RUN_SPEED = 265;

export const CAR_LENGTH = 58;
export const CAR_WIDTH = 28;
export const TRAFFIC_COUNT = 26;
export const PED_COUNT = 34;
export const POLICE_MAX = 8;

export const WANTED_DECAY_SECONDS = 18;
export const STAR_DROP_SECONDS = 9;

export const START_MONEY = 60;
export const START_HEALTH = 100;
export const PISTOL_AMMO_START = 12;

export const SAVE_KEY = 'solmar-bay-save-v1';

// Colour palette: warm late-afternoon sun over a coastal city.
export const PALETTE = {
  grass: '#7fae62',
  parkGrass: '#6da356',
  road: '#3c3f46',
  roadEdge: '#2e3138',
  lane: '#e8d44d',
  sidewalk: '#b9b3a4',
  buildingRoof: '#c98f5f',
  buildingRoofAlt: '#8fa3b8',
  buildingWall: '#e8dcc8',
  sea: '#2f7fb8',
  sand: '#e5cf9e',
  bridge: '#5a5f6a',
  hudPanel: 'rgba(12, 16, 24, 0.72)',
  hudText: '#f4f1e6',
  accent: '#ffb03a',
};

export const CAR_TYPES = {
  sedan: { name: 'Sedan', color: '#4a7fb5', accel: 210, top: 330, grip: 2.6 },
  taxi: { name: 'Taxi', color: '#e8b93a', accel: 200, top: 320, grip: 2.6 },
  truck: { name: 'Truck', color: '#7a6a55', accel: 130, top: 230, grip: 2.0 },
  sports: { name: 'Sports', color: '#c93a3a', accel: 320, top: 470, grip: 3.4 },
  police: { name: 'Interceptor', color: '#20242c', accel: 280, top: 420, grip: 3.2 },
  van: { name: 'Van', color: '#5f8a6a', accel: 160, top: 270, grip: 2.2 },
};

export const CAR_TYPE_KEYS = ['sedan', 'taxi', 'truck', 'sports', 'van'];
