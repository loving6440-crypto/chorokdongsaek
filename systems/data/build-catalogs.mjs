/** Generate data-only JSON snapshots from the unmodified C.01 engine. */
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import * as items from '../chorokdongsaek-C01/src/game/items.js';
import * as battle from '../chorokdongsaek-C01/src/game/battle.js';
import * as constants from '../chorokdongsaek-C01/src/game/constants.js';
import * as b05 from '../chorokdongsaek-C01/src/game/itemsB05.js';
import * as b06 from '../chorokdongsaek-C01/src/game/itemsB06.js';
import * as b07 from '../chorokdongsaek-C01/src/game/itemsB07.js';
import * as b08 from '../chorokdongsaek-C01/src/game/itemsB08.js';
import * as v79 from '../chorokdongsaek-C01/src/game/v79Items.js';
import * as sheet from '../chorokdongsaek-C01/src/game/v79SheetData.js';
import * as b16 from '../chorokdongsaek-C01/src/game/itemEffectsB16.js';
import * as sites from '../chorokdongsaek-C01/src/game/huntSites.js';
import * as trails from '../chorokdongsaek-C01/src/game/huntTrails.js';
import * as gather from '../chorokdongsaek-C01/src/game/gather.js';
import * as hunt from '../chorokdongsaek-C01/src/game/hunt.js';
import * as craft from '../chorokdongsaek-C01/src/game/crafting.js';
import * as recipes from '../chorokdongsaek-C01/src/game/recipesB08.js';
import * as hike from '../chorokdongsaek-C01/src/game/hike.js';
const here=dirname(fileURLToPath(import.meta.url));
const choose=(obj,names)=>Object.fromEntries(names.filter(x=>Object.hasOwn(obj,x)).map(x=>[x,obj[x]]));
const stats=choose(constants,['STAT_KEYS','STAT_META','STAT_MIN','STAT_MAX','STAT_START_POINTS','HP_MAX','MP_MAX']);
const enemyPsychics=battle.ALL_ENEMIES.flatMap(e=>['special','special2'].filter(k=>e[k]).map(k=>({enemyId:e.id,enemyName:e.name,tier:e.tier??null,slot:k,...e[k]})));
const tables={
  'items.json':items.ITEMS,
  'enemies.json':battle.ALL_ENEMIES,
  'psychics.json':battle.PSYCHICS,
  'enemy-psychics.json':enemyPsychics,
  'item-data-layers.json':{
    ...choose(b05,['B05_ITEMS']),...choose(b06,['B06_ITEMS','B06_OVERRIDES']),
    ...choose(b07,['B07_ITEMS']),...choose(b08,['B08_SHEET_ITEMS','B08_SHEET_OVERRIDES']),
    ...choose(v79,['V79_ITEMS']),...choose(sheet,['V79_SHEET_DATA']),
    ...choose(b16,['B16_ITEM_EFFECTS','B16_GROUPS']),
  },
  'pioneer-tables.json':{
    ...choose(sites,['HUNT_SIZE','HUNT_COOLDOWN_MS','HUNT_ATTEMPTS','HUNT_KINDS','HUNT_SPECIES','HUNT_BONUSES','HUNT_STAT_KEYS','TRAIL_SITES','HUNT_PATHS','HUNT_SITES']),
    ...choose(trails,['TRAIL_SPECIES','TRAILS']),
    ...choose(gather,['GATHER_TABLES','GATHER_MINUTES']),
    ...choose(hunt,['HUNT_ENEMIES','HUNT_TABLES','HUNT_MINUTES']),
  },
  'crafting-tables.json':{
    ...choose(craft,['RECIPES','WORKSHOP','RECIPE_SHOP']),
    ...choose(recipes,['B08_RECIPES','B08_COOK_RECIPES','B08_WORKSHOP_ITEMS','B08_KITCHEN_ITEMS','B08_ICON_SPECS']),
  },
  'battle-stat-tables.json':{
    ...stats,...choose(battle,['ENEMIES','BESTIARY_ENEMIES','PSYCHICS','PASSIVE_PSYCHICS','INTENTS','ACTIONS','REC_STATS','PS_INFO','REWARD_MULT','SPECIAL_PERCENT']),
    ...choose(items,['EQUIP_SLOTS','DEFAULT_EQUIP','ENH_MAX','ENH_ITEMS','START_MONEY']),
  },
  'hike-tables.json':choose(hike,['GOBLIN_GAMES','HIKE_PATHS','HIKE_SPOT_IDS']),
};
for(const [name,arr] of [['items',items.ITEMS],['enemies',battle.ALL_ENEMIES],['psychics',battle.PSYCHICS]]){
  const ids=arr.map(x=>x.id);
  if (new Set(ids).size!==ids.length) throw Error(`Duplicate ${name} ids`);
}
if(battle.ALL_ENEMIES.length!==battle.ENEMIES.length+battle.BESTIARY_ENEMIES.length) throw Error('Enemy count mismatch');
if(enemyPsychics.some(x=>!x.label)) throw Error('Enemy psychic label missing');
const files=[];
for(const [name,obj] of Object.entries(tables)){
  const txt=JSON.stringify(obj,null,2)+'\n';
  if(!txt) throw Error(`${name} unrepresentable`);
  writeFileSync(join(here,name),txt,'utf8');
  const loaded=JSON.parse(readFileSync(join(here,name),'utf8'));
  if(Array.isArray(obj)&&loaded.length!==obj.length) throw Error(`${name} mismatch`);
  files.push({name,records:Array.isArray(obj)?obj.length:null,bytes:Buffer.byteLength(txt),sha256:createHash('sha256').update(txt).digest('hex')});
}
const manifest={
  project:'秘靈 · 비령',source:'chorokdongsaek-vC.01.zip',sourcePackageVersion:'80.0.18',
  mode:'DATA_ONLY_NOT_WIRED_TO_UI',
  counts:{items:items.ITEMS.length,enemies:battle.ALL_ENEMIES.length,baseEnemies:battle.ENEMIES.length,
    bestiaryEnemies:battle.BESTIARY_ENEMIES.length,playerPsychics:battle.PSYCHICS.length,
    passivePsychics:battle.PASSIVE_PSYCHICS.length,enemyPsychicDefinitions:enemyPsychics.length,
    pioneerSites:Object.keys(sites.HUNT_SITES).length,craftingRecipes:craft.RECIPES.length,
    b08WorkshopRecipes:recipes.B08_RECIPES.length,b08CookingRecipes:recipes.B08_COOK_RECIPES.length},
  files,
  notes:['JSON은 JS 모듈의 현재 값을 복제한 읽기 전용 스냅샷입니다. 계산식/함수는 원본 JS를 참조하세요.',
    'items.json에는 C.01의 덮어쓰기 및 패치가 모두 적용된 최종 아이템 정보가 포함됩니다.',
    '적 고유 영능력은 각 적의 special/special2 슬롯을 빠짐없이 별도 추출했습니다.'],
};
writeFileSync(join(here,'catalog-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.counts,null,2));
console.log('Validated',files.length,'snapshots');
