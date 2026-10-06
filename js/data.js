'use strict';

const W = 960, H = 600;
const GROUND_Y = 488;   // where walking monsters and pumpkins stand
const PLAYER_Y = 562;   // the player's path (feet)
const TAP_WALK_Y = 505; // taps below this line walk instead of shoot
const TAU = Math.PI * 2;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

const WEAPONS = [
  { id: 'candy',     name: 'Candy Cannon',        icon: '🍬', rate: 0.26, unlock: 1, desc: 'Bonks monsters with candy!' },
  { id: 'bubble',    name: 'Bubble Blaster',      icon: '🫧', rate: 0.42, unlock: 1, desc: 'Traps monsters in bubbles. Catch ghosts for your Ghost Book!' },
  { id: 'sparkle',   name: 'Sparkle Wand',        icon: '✨', rate: 0.13, unlock: 2, desc: 'Fires super fast colorful stars!' },
  { id: 'cupcake',   name: 'Cupcake Launcher',    icon: '🧁', rate: 0.6,  unlock: 3, desc: 'Big cupcakes that splash sprinkles!' },
  { id: 'broom',     name: 'Witch Broom Blaster', icon: '🧹', rate: 0.45, unlock: 4, desc: 'Shoots three magical leaves at once!' },
  { id: 'boomerang', name: 'Bat Boomerang',       icon: '🦇', rate: 0.75, unlock: 5, desc: 'A friendly bat flies out and comes back!' },
  { id: 'potion',    name: 'Potion Popper',       icon: '🧪', rate: 0.7,  unlock: 6, desc: 'Silly potion clouds make monsters dance away!' },
  { id: 'rainbow',   name: 'Rainbow Ray',         icon: '🌈', rate: 0.32, unlock: 7, desc: 'Turns monsters into harmless rainbows!' },
];
const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

const ENEMY_TYPES = {
  ghost:    { name: 'Boo Ghost',          art: 'ghost',    base: 30, r: 30, hp: 1,  pts: 10,  fly: true,  ghost: true, defeat: 'poof',     desc: 'Pops in and out while saying "Boo!"' },
  zombie:   { name: 'Baby Zombie',        art: 'zombie',   base: 32, r: 32, hp: 2,  pts: 15,  walk: true, defeat: 'pieces',   desc: 'Shuffles around carrying a teddy bear.' },
  goblin:   { name: 'Goblin',             art: 'goblin',   base: 32, r: 32, hp: 2,  pts: 15,  walk: true, defeat: 'bonk',     desc: 'Throws candy wrappers at you!' },
  bat:      { name: 'Bat Swarm',          art: 'bat',      base: 30, r: 24, hp: 1,  pts: 8,   fly: true,  defeat: 'dizzy',    desc: 'Flies in silly zigzags.' },
  spider:   { name: 'Giggle Spider',      art: 'spider',   base: 30, r: 26, hp: 1,  pts: 12,  defeat: 'scream',   desc: 'Drops down, laughs, then scurries away.' },
  witch:    { name: 'Mini Witch',         art: 'witch',    base: 32, r: 32, hp: 2,  pts: 20,  fly: true,  defeat: 'witchfly', desc: 'Flies around on a tiny broom.' },
  skeleton: { name: 'Dancing Skeleton',   art: 'skeleton', base: 32, r: 32, hp: 2,  pts: 18,  walk: true, defeat: 'skull',    desc: 'Does a little dance before attacking.' },
  vampire:  { name: 'Tiny Vampire',       art: 'vampire',  base: 32, r: 30, hp: 2,  pts: 22,  fly: true,  defeat: 'poof',     desc: 'Turns into a bat to escape!' },
  werewolf: { name: 'Werewolf Pup',       art: 'werewolf', base: 32, r: 32, hp: 2,  pts: 18,  walk: true, defeat: 'bonk',     desc: 'Howls… then gets embarrassed.' },
  troll:    { name: 'Baby Troll',         art: 'troll',    base: 32, r: 30, hp: 2,  pts: 20,  walk: true, defeat: 'bonk',     desc: 'Hides behind pumpkins. Aim carefully!' },
  cheer:    { name: 'Zombie Cheerleader', art: 'cheer',    base: 32, r: 32, hp: 2,  pts: 20,  walk: true, defeat: 'pieces',   desc: 'Waves pompoms while chasing you.' },
  blob:     { name: 'Ghost Blob',         art: 'blob',     base: 30, r: 40, hp: 1,  pts: 15,  fly: true,  ghost: true, defeat: 'split', desc: 'Splits into two smaller ghosts!' },
  vbat:     { name: 'Vampire Bat',        art: 'vbat',     base: 30, r: 24, hp: 1,  pts: 14,  fly: true,  defeat: 'dizzy',    desc: 'Tries to steal your candy!' },
  ghoul:    { name: 'Graveyard Ghoul',    art: 'ghoul',    base: 32, r: 30, hp: 2,  pts: 18,  defeat: 'sink',     desc: 'Pops out of a gravestone.' },
  tiny:     { name: 'Tiny Ghost',         art: 'ghost',    base: 30, r: 16, hp: 1,  pts: 3,   fly: true,  ghost: true, defeat: 'poof', minor: true, desc: 'Comes in big bunches from TRICK houses.' },
  grump:    { name: 'Candy Grump',        art: 'grump',    base: 32, r: 54, hp: 10, pts: 100, walk: true, defeat: 'bonk', minor: true, desc: '"WHO TOOK MY CANDY?!"' },
};
const BESTIARY_ORDER = ['ghost', 'zombie', 'goblin', 'bat', 'spider', 'witch', 'skeleton', 'vampire', 'werewolf', 'troll', 'cheer', 'blob', 'vbat', 'ghoul', 'tiny', 'grump'];

const ALL_MONSTERS = ['ghost', 'zombie', 'goblin', 'bat', 'spider', 'witch', 'skeleton', 'vampire', 'werewolf', 'troll', 'cheer', 'blob', 'vbat', 'ghoul'];

const LEVELS = [
  { id: 1,  name: 'Pumpkin Patch',        icon: '🎃', bg: 'patch',     pool: ['ghost', 'ghost', 'ghost', 'bat'], goal: 12, rate: 1.7, max: 4, pumpkins: 5, houses: 1, friends: ['fghost'], boss: 'king',
    tip: 'Cute ghosts pop up between the pumpkins!' },
  { id: 2,  name: 'Spooky Forest',        icon: '🌲', bg: 'forest',    pool: ['bat', 'bat', 'spider', 'spider', 'goblin'], goal: 16, rate: 1.5, max: 5, pumpkins: 4, houses: 1, friends: ['spiderf', 'babybat'], boss: null,
    tip: 'Bats, giggle spiders and goblins live here.' },
  { id: 3,  name: 'Candy Village',        icon: '🍭', bg: 'candy',     pool: ['zombie', 'zombie', 'cheer', 'vbat', 'goblin'], goal: 18, rate: 1.5, max: 5, pumpkins: 4, houses: 2, friends: ['fghost', 'babybat'], boss: 'chef',
    tip: 'Zombie candy thieves! Watch your candy!' },
  { id: 4,  name: "Witch's Garden",       icon: '🧙', bg: 'garden',    pool: ['witch', 'witch', 'bat', 'spider', 'ghost'], goal: 18, rate: 1.4, max: 5, pumpkins: 4, houses: 1, friends: ['fwitch', 'spiderf'], boss: 'queen',
    tip: 'Mini witches, magical plants and potion creatures.' },
  { id: 5,  name: 'Haunted School',       icon: '🏫', bg: 'school',    pool: ['skeleton', 'skeleton', 'cheer', 'troll', 'ghost'], goal: 20, rate: 1.4, max: 6, pumpkins: 4, houses: 1, friends: ['fghost', 'fvamp'], boss: null,
    tip: 'Skeletons dance out of the lockers!' },
  { id: 6,  name: 'Moonlit Graveyard',    icon: '🌙', bg: 'graveyard', pool: ['ghoul', 'ghoul', 'ghost', 'blob', 'zombie', 'werewolf'], goal: 22, rate: 1.3, max: 6, pumpkins: 4, houses: 1, friends: ['fghost', 'babybat'], boss: null,
    tip: 'Ghosts, ghouls and zombie pets.' },
  { id: 7,  name: 'Vampire Castle',       icon: '🏰', bg: 'castle',    pool: ['vampire', 'vampire', 'vbat', 'bat', 'bat'], goal: 22, rate: 1.25, max: 6, pumpkins: 4, houses: 2, friends: ['fvamp', 'babybat'], boss: 'count',
    tip: 'Tiny vampires and bat swarms!' },
  { id: 8,  name: 'Monster Carnival',     icon: '🎪', bg: 'carnival',  pool: ALL_MONSTERS, goal: 26, rate: 1.15, max: 7, pumpkins: 5, houses: 2, friends: ['fghost', 'fwitch', 'fvamp', 'babybat'], boss: null,
    tip: 'EVERY creature comes to the carnival!' },
  { id: 9,  name: 'Cloudy Ghost Kingdom', icon: '☁️', bg: 'clouds',    pool: ['ghost', 'ghost', 'ghost', 'blob', 'blob', 'bat'], goal: 24, rate: 1.1, max: 7, pumpkins: 4, houses: 1, friends: ['fghost', 'babybat'], boss: 'boo',
    tip: 'Floating islands full of adorable ghosts. Bring bubbles!' },
  { id: 10, name: 'The Halloween Moon',   icon: '🌕', bg: 'moon',      pool: ALL_MONSTERS, goal: 26, rate: 1.1, max: 7, pumpkins: 5, houses: 2, friends: ['fghost', 'fwitch', 'fvamp', 'babybat', 'spiderf'], boss: 'moon',
    tip: 'A giant Halloween party in the sky!' },
];

const BOSSES = {
  king:  { name: '👑 The Pumpkin King',         sub: "He can't be shot — PROTECT HIM!",          hp: 20 },
  chef:  { name: '🧟‍♂️ The Zombie Chef',           sub: 'Pop his flying cupcakes!',                 hp: 40 },
  queen: { name: '🧙‍♀️ The Witch Queen',           sub: 'Pop her portals and bonk her broom!',      hp: 44 },
  count: { name: '🦇 Count Fluffula',            sub: 'Too fluffy! Shoot the GARLIC to scare him!', hp: 30 },
  boo:   { name: '👻 The Giant Boo',             sub: 'He is VERY bad at scaring people.',        hp: 32 },
  moon:  { name: '🌕 The Hungry Halloween Moon', sub: 'Feed it magic candy — shoot the moon!',    hp: 40 },
};

const GHOSTS = [
  { id: 'baby',      name: 'Baby Ghost',      desc: 'Says "goo-goo-BOO!" and naps 23 hours a day.' },
  { id: 'sleepy',    name: 'Sleepy Ghost',    desc: 'Haunts pillows. Has never stayed awake for the scary part.' },
  { id: 'rainbow',   name: 'Rainbow Ghost',   desc: 'Tried to be spooky. Ended up fabulous.' },
  { id: 'pirate',    name: 'Pirate Ghost',    desc: 'Says "BOO-arrr!" Hunting for the lost treasure of Candy Island.' },
  { id: 'cowboy',    name: 'Cowboy Ghost',    desc: 'Rides a ghost horse named Neigh-boo. Yee-haunt!' },
  { id: 'princess',  name: 'Princess Ghost',  desc: 'Royal rule #1: everyone eats dessert first.' },
  { id: 'ninja',     name: 'Ninja Ghost',     desc: "So sneaky even she doesn't know where she is." },
  { id: 'wizard',    name: 'Wizard Ghost',    desc: 'Knows exactly one spell: broccoli into cookies.' },
  { id: 'giant',     name: 'Giant Ghost',     desc: 'Very big. Very soft. Gives the best hugs in the haunted world.' },
  { id: 'invisible', name: 'Invisible Ghost', desc: 'You caught him! (We think. Is he still there?)' },
];
const GHOST_BY_ID = Object.fromEntries(GHOSTS.map(g => [g.id, g]));

const COLLECTIBLES = [
  { id: 'sticker', name: 'Pumpkin Sticker',  icon: '🎃' },
  { id: 'badge',   name: 'Bat Badge',        icon: '🦇' },
  { id: 'hat',     name: 'Witch Hat',        icon: '🎩' },
  { id: 'broom',   name: 'Broom',            icon: '🧹' },
  { id: 'web',     name: 'Spider Web',       icon: '🕸️' },
  { id: 'potion',  name: 'Potion Bottle',    icon: '🧪' },
  { id: 'moon',    name: 'Moon Fragment',    icon: '🌙' },
  { id: 'star',    name: 'Halloween Star',   icon: '⭐' },
];
const COL_BY_ID = Object.fromEntries(COLLECTIBLES.map(c => [c.id, c]));

const POWERUPS = [
  { id: 'storm',   name: 'Candy Storm',  icon: '🍭', dur: 6,  desc: 'Candy rains from the sky!' },
  { id: 'magnet',  name: 'Ghost Magnet', icon: '👻', dur: 8,  desc: 'Nearby ghosts get captured!' },
  { id: 'shield',  name: 'Pumpkin Shield', icon: '🎃', dur: 10, desc: 'Pumpkins protect you!' },
  { id: 'buddy',   name: 'Bat Buddy',    icon: '🦇', dur: 12, desc: 'A friendly bat helps you!' },
  { id: 'sparkle', name: 'Sparkle Mode', icon: '✨', dur: 10, desc: 'Triple sparkly shots & double points!' },
  { id: 'sugar',   name: 'Sugar Rush',   icon: '🍬', dur: 8,  desc: 'Super speedy!' },
  { id: 'moon',    name: 'Moonbeam',     icon: '🌙', dur: 5,  desc: 'Monsters freeze!' },
  { id: 'witch',   name: 'Witch Hat',    icon: '🧙', dur: 10, desc: 'You become a witch! Magic shots find monsters.' },
];
const POWER_BY_ID = Object.fromEntries(POWERUPS.map(p => [p.id, p]));

const FRIEND_TYPES = {
  fghost:  { name: 'Friendly Ghost', r: 26 },
  babybat: { name: 'Baby Bat',       r: 20 },
  fwitch:  { name: 'Friendly Witch', r: 28 },
  fvamp:   { name: 'Friendly Vampire', r: 26 },
  spiderf: { name: 'Cute Spider',    r: 22 },
};

const LINES = {
  pumpkin: ["I'm on your team!", 'Go, Patrol, go!', "You're doing great!", 'Watch out for that ghost!', 'I love candy corn!',
    'Psst… nice shot!', 'Pumpkin power!', 'Gourd job!', 'Squash those monsters!', 'Hi! 👋', "I'm a pumpkin. Hehe!"],
  pumpkinOops: ["Hey! I'm on your team!", "Ouch! I'm a pumpkin!", 'Gourd grief!', "Not me! I'm a FRIEND!", 'Oof! My stem!'],
  friendOops: ["Hey! I'm a friend!", 'Ow! Friend here!', "I'm nice, I promise!", 'Bonk the MONSTERS, silly!'],
  friendHi: ['Hi friend!', 'Hello, Patroller!', "Don't bonk me!", 'Happy Halloween!', 'You can do it!'],
  zombie: ['Hugs?', 'Braaains… I mean BRAIDS!', 'Meet Mr. Teddy!', 'Uuuuh… candy?'],
  cheer: ['Gimme a B! Gimme an OO!', 'Go monsters!', 'Rah rah BOO!'],
  goblin: ['Catch!', 'Wrapper toss!', 'Hee hee!', 'Litter bug attack!'],
  witch: ['Wheee!', 'Broom broom!', 'Hocus pocus!'],
  skeleton: ['♪ Bone dance! ♪', '♪ Rattle rattle! ♪', '♪ Shake it! ♪'],
  vampire: ['Bleh bleh!', 'I vant… a cookie!'],
  troll: ['Peekaboo!', "Can't see me!", 'Hee hee!', 'Hiding!'],
  ghoul: ['Boo-gah!', 'Surprise!', 'I was napping!'],
  king: ['Oops! I sneezed out a ghost!', 'Protect your king, brave Patroller!', 'Achoo! Sorry!', 'My royal tummy is ticklish!', 'Hooray for the Patrol!'],
  chef: ['Order up!', 'Who wants a cupcake?!', 'Extra frosting!', 'Taste my sprinkles!'],
  queen: ['Portals, open!', 'Mwa-ha-hee!', 'Bats, assemble!'],
  count: ["Too fluffy for you!", 'I vant to suck… your juice box!', 'Bleh! Bleh!'],
  countScared: ['EEK! GARLIC!', 'NOT THE GARLIC!', 'Stinky! Stinky!'],
  boo: ['B-boo?', 'Boo! …was that scary?', "I'm SO spooky. Right?", 'Booooo… please?', 'BOO! (Did I do it right?)'],
  moon: ['NOM NOM NOM!', 'MORE CANDY!', 'So… hungry…', 'Mmm, candy!'],
};
