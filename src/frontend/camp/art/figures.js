// A person is a pixel picture at the size the camp shows them (about two screen pixels to a world pixel), one letter
// a pixel and each letter a shade from the role's colors, darkest first. graphics/characters/trace.py makes them from
// the approved sheets, repainting each part (hair, skin, coat, ...) in a few flat shades so it reads clean at this
// size. The fire lights the edge of the figure turned toward it

const PEOPLE = {
  // Silver hair swept up and aside, a teal coat trimmed in gold over an ivory shirt and a coral scarf, a brown belt
  // with its pouch, navy trousers, and tall brown boots
  interpreter: {
    standing: {
      colors: [
        '#160300',
        '#281208',
        '#251f22',
        '#3e1e0c',
        '#2d2c3d',
        '#523026',
        '#353345',
        '#753305',
        '#2f3f42',
        '#363446',
        '#70412f',
        '#3b5254',
        '#9d4c02',
        '#405755',
        '#5d4a4c',
        '#864c37',
        '#9e5b42',
        '#bb6d1a',
        '#b45646',
        '#aa6745',
        '#c0782c',
        '#b76f48',
        '#c9624e',
        '#cc624e',
        '#9f8062',
        '#a79092',
        '#e09662',
        '#e2a45d',
        '#e89d69',
        '#c7b2af',
        '#e1c0a2',
        '#f4d8be',
        '#ffe9d7',
        '#fcf3e4',
        '#fffaec',
      ],
      rows: [
        '...............ooo..........',
        '.........oz...zozooo........',
        '..........ozDDDzzzzo........',
        '.........DzDDDDDzzzzo.......',
        '.......DDDzDDDDDzooozz......',
        '....zDDDDDDDDDDzooozzzD.....',
        '....ozzDDDDDDzzzoozDDDDzo...',
        '...zzzzDDDDDzozzzDDDDDDzo...',
        '..zzzzzDDDDzooozDDDDDDDDz...',
        '..zzzzDDDDDACCozDDDDDDDDz...',
        '..oozzDDDDAACCCzDDDDDDDDDzoo',
        '...zzDzzzzAACCCCzDDDzzDDzooo',
        'ooozzzzzzzAAACCAzzDDzzzzzoo.',
        '.ooozzzqzAACACCcCzzzzzzzoo..',
        '..ooooqqqAAAACCAAozzzooooo..',
        '..ooooqcAAAAabcCCooooooooo..',
        '..ooooqdGCAAchHCCooAqAoooo..',
        '..ooooquCCCCrmICCooAAAoooo..',
        '.....AACCCCCCCCCooAAACoo....',
        '......AACCCCCCCCCAAAAoo.....',
        '......AACCCCCCCCAcqqo.......',
        '.......AAACCCCAAqqqo........',
        '........AAAAAAAAqqq.........',
        '.........qqqqqqqqqqA........',
        '........qqqqqqqqqqqA........',
        '.......EEFqxxxxwqFFyy.......',
        '......iEEFfswwssFFEyc.......',
        '.....iilcfwsssssEFiiiii.....',
        '....cilnffwsssppciiililc....',
        '....cllnnxxwwwpppBiillnc....',
        '....clclnwwwwsfpBBBillnn....',
        '....llcinxxxxfflvviillll....',
        '...clliinnxxkcnnliiillllc...',
        '...nnniilvvEycnlliciilnnn...',
        '..ccnniinvEFyyllliciiinncc..',
        '...cccccnnFFEylliicciBBcc...',
        '....ycccncEFEElliiccccEyy...',
        '...yEEEccEEEEvliiicccEEEy...',
        '...yFFEcccyEycikccc.yEFFEy..',
        '..yFFFEcccpkfffkkpk.yEFFFy..',
        '.yyEFEEcccpppkfpkkk.yyFFEyy.',
        '.yEFEyyiiccppccckkccyyFFFyy.',
        '.EFFEyyilnccccllcpkcyyFFFEEp',
        'yEFFEyclnnccccicppkkcyEFFFFk',
        '.yFFFEllnnccccnlppffcyEFFkp.',
        '.qAkkclnnccgcnncppcccyyfkk..',
        '.AACkclnncggennliiiii.fCCA..',
        'qACCCclnncggecnnlilllkCCCAA.',
        'AqAAcqAnCcccecnnnnnnkkCCCCA.',
        'fqAqAcAACcccccBnnBBccpCCCCC.',
        'fqAqqcccceecccBBBccccfCfCAA.',
        '.fAqfcjcceecccccccceckkpAAq.',
        '..ff.cjjjjgc.ccceeeeckkqqq..',
        '.....cjjjjge.ceeegeec.pq....',
        '.....cjjjgec.cgggjeec.......',
        '.....cjjjgec.cgggjgcc.......',
        '......gjgecc.cggjjjjc.......',
        '......gggeec..cjjjjjc.......',
        '.....cgggeec..cjjjgec.......',
        '.....cceeeecc.cjjjggcc......',
        '......eeegggc..cjjjjcc......',
        '......cecgec...ccgjjjc......',
        '.....ccgegcc...cegjjge......',
        '.....qcjggccc...egggeec.....',
        '....cqqccccppc.cccjeccpp....',
        '....cqqqqppppc.kcccccqpp....',
        '....cppqqppppc.pptvttqqp....',
        '.....ckqqpppc..pppvttqqk....',
        '......fcccccc..cppvttqkk....',
        '......ffffffc...ccccccfc....',
        '......ckkkff....cffkkffc....',
        '......cppkkf.....kkkkff.....',
        '......kkkkkfc....kkpkkf.....',
        '.....cppkkkff....cpppkk.....',
        '...qcpppkkfff....ppppkfc....',
        '..qqqqppkkffc...cppppkff....',
        '.cqqqqppkfcff...cppppkff....',
        '.ckkkkkkffcfc..tttvppkff....',
        '.cfffffff......kttvppkfc....',
        '..cffffc.......kkkkkkfc.....',
        '...............kffffff......',
        '...............ccfffc.......',
      ],
    },
  },
};

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
// The letters, in the order of a role's colors
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
    const lit = [...row].map((ch) => ch !== '.' && Math.max(...rgb[LETTERS.indexOf(ch)]) > DARK),
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
      img.data.set([...warm(rgb[LETTERS.indexOf(ch)], warmth[x]), 255], (y * W + x) * 4);
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
