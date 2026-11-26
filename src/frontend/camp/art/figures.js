// A person is a pixel picture at the size the camp shows them (about two screen pixels to a world pixel), one letter
// a pixel and each letter a shade from the role's colors, darkest first; graphics/characters/trace.py makes them from
// the approved sheets. The fire lights the edge of the figure turned toward it

const PEOPLE = {
  // Silver hair swept up and aside, a teal coat trimmed in gold over an ivory shirt and a coral scarf, a brown belt
  // with its pouch, navy trousers, and tall brown boots
  interpreter: {
    standing: {
      colors: [
        '#160300',
        '#1a1a20',
        '#39231c',
        '#282a35',
        '#553125',
        '#753305',
        '#343645',
        '#524243',
        '#6c4230',
        '#3c5355',
        '#9d4c02',
        '#8b4e39',
        '#6a5655',
        '#bb6d1a',
        '#b06944',
        '#907874',
        '#cc654e',
        '#ca8751',
        '#a79190',
        '#b8977c',
        '#e89e68',
        '#c5b0ac',
        '#dcbea7',
        '#fbcd7a',
        '#f2d9c3',
        '#fffaec',
      ],
      rows: [
        '................hhh...........',
        '..........hm...hsvvhh.........',
        '...........vvvvvvmsvs.........',
        '..........hhpvvvvvmpvh........',
        '........hyyvvssvvspmshh.......',
        '.....vpyyysvvvvhsphhsvvv......',
        '.....hvvvsyvvvvvphmvvsvvvh....',
        '....hsmmpyyywhhshvvpvyvzph....',
        '...mvvvsyyyymhmmvvvysyyvvh....',
        '...svmpvvwwprruhmyyywvvvvw....',
        '...phpvvsvvlruuuevvyvvvpvvhhh.',
        '....mvvspvmquuuuuvvpvvmvvvssh.',
        '.hmhvvvsmvhuurluuhvvsmsvvhmh..',
        '..hsspphivluiuurblpvvshpvpm...',
        '...hhpporiluuuuuuumpvvppppp...',
        '...hppheaouueaabrumphgppmph...',
        '...hphheczuuubfzuuhplucmmmh...',
        '...hphhrnuuuunkzuuphooummmh...',
        '......huuouuuuuuuhhrouumh.....',
        '.......uuuuuuuuuuuuuuueh......',
        '.......euurrouuuuuciic........',
        '........ruuuuuuuulchh.........',
        '.........iuuuurllrch..........',
        '..........ecccoqorcti.........',
        '.........ptpeoqreleyp.........',
        '........yytlqqqqqeyyyi........',
        '.......dhyteqqqolwyymc........',
        '......djjbcqiloocypdjjjd......',
        '.....bjjjclqqqqlwbgjjdjjb.....',
        '.....bjdjqqlqloicxxejjjjd.....',
        '.....bjdjeqqooqceoxrdjjjj.....',
        '.....jjbjjlqqqehjrldgjjjj.....',
        '....bjjdjjoqqlcjjgjgjjjjgd....',
        '....gjjggjumlvbjjjjbgjgjjj....',
        '...duujgdguywwdjjjgbggjjurb...',
        '....dbuobjuyyyujjggbdguubb....',
        '.....tbbdjbyytujjjgboubtwi....',
        '....iyttbgmtvtojjggbdbtwyp....',
        '....tyywcccxxrbddbbc.wwyyyi...',
        '...iyyytcibiieclelle.hyyyyw...',
        '..iyyywtbiaileeiellc.iyyywwi..',
        '..tpwwwtddbrrobcbiecbiwywppm..',
        '..yyytpgjdjidbhjgcelbppvyyyyi.',
        '.myyyywbjjubdamjdxlleayyyyyyi.',
        '..iwywtjjjubdbujercicbiyyyii..',
        '..eoiebjjjudgdrjcrecbbiweel...',
        '..ruuibjjubgggljjdgggd.erur...',
        '.euuuudjjubgdgbjjjjjggcuuuui..',
        '.euoucrrjxbddgbujjjjrreuuuuu..',
        '.eueucbeuubdbbbujpuuobiuruuu..',
        '.cuiuebdcidddbduurcbbbeueuur..',
        '..iuuebgddgddbdbbddddbecirue..',
        '...ec.bgggggd.ddddggdberuoe...',
        '......bgggggd.bgggggdb.ce.....',
        '......bggggdd.bgggggdb........',
        '......bggggdd.bgggggdb........',
        '.......ggggdb.bggggggb........',
        '.......gggddb..dgggggb........',
        '......bdggddb..bggggdb........',
        '......bdggggdb.bggggddb.......',
        '.......ddddgdb..bggggdb.......',
        '.......dddggb...bdggggb.......',
        '......cbgggdb...bddgggg.......',
        '......lbdgddbi...ggggddc......',
        '.....clraabeolc.cbdgdbboc.....',
        '.....cllooolllc.iobbbooll.....',
        '.....clloollllc.illoollll.....',
        '......cioollic..elloollli.....',
        '.......ccccccb..cllooollc.....',
        '.......eeeeeeb...ccccccec.....',
        '.......ciiiee....ceeeeeec.....',
        '.......ciiiie.....iiiiic......',
        '.......lllleec....eiiiie......',
        '......ciieiiee....clllic......',
        '....cclllleeee....illllec.....',
        '...oooollleeec...celleeec.....',
        '..clooolllccee...clllllec.....',
        '..cillllieecec..cooolllec.....',
        '..cieeeeee......iooollicc.....',
        '...cccccc.......elliiiec......',
        '................eeeeeie.......',
        '................cccccc........',
      ],
    },
  },
};

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
// A shade a little toward the flames' color
const warm = ([r, g, b], f) => [r + (255 - r) * f, g + (170 - g) * f, b + (90 - b) * f];
// The picture's own outline and its darkest shadows stay dark in any light
const DARK = 60;

// fire: the screen side the fire is on (-1 left, 1 right, 0 none); along each row, the first three pixels past the
// outline on that side warm, less the further in, so the light fades in rather than drawing a band
function paint({ colors, rows }, fire) {
  const W = rows[0].length,
    img = new ImageData(W, rows.length),
    rgb = colors.map(channels);
  rows.forEach((row, y) => {
    const lit = [...row].map((ch) => ch !== '.' && Math.max(...rgb[ch.charCodeAt(0) - 97]) > DARK),
      order = fire < 0 ? [...lit.keys()] : [...lit.keys()].reverse();
    const warmth = new Float32Array(W);
    let seen = 0;
    for (const x of fire ? order : []) {
      if (!lit[x]) continue;
      warmth[x] = [0.2, 0.13, 0.06][seen] ?? 0;
      if (++seen === 3) break;
    }
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      img.data.set([...warm(rgb[ch.charCodeAt(0) - 97], warmth[x]), 255], (y * W + x) * 4);
    });
  });
  const canvas = new OffscreenCanvas(W, rows.length);
  canvas.getContext('2d').putImageData(img, 0, 0);
  return canvas;
}

const made = new Map();
// A person's picture for a role, pose, and fire side, painted once
export function personPicture(role, fire = 0, pose = 'standing') {
  const key = `${role}|${pose}|${fire}`;
  if (!made.has(key)) made.set(key, paint(PEOPLE[role][pose], fire));
  return made.get(key);
}
