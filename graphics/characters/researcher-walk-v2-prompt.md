# Corrected eight-phase walk

## Request

Correct awkward walking and move casting effect to a conspicuous ground circle. Generate one candidate per sheet, preserve prior source art. App remains unchanged.

## Generation prompt

Use case: identity-preserve sprite animation correction.
Reference image is the exact researcher/diviner identity. Preserve the reduced-head cute anime face, chestnut hair, cream tunic, sage vest, short ochre mantle, brown trousers and boots, and amber orb secured in belt cradle. Generate ONE replacement WALK sprite sheet with EIGHT frames in FOUR columns by TWO rows, chronological row-major order. No magic, no props, no extra views. A consistent orthographic front-three-quarter character faces screen lower-left in ALL cells; right-facing is a later horizontal flip.

PRIMARY FIX: NATURAL ALTERNATING GAIT
The old walk looked like bent knees crossing and shuffling. Use a compact slow relaxed biped walk, not a run, march, knee-high dance, sideways scissor kick, or hopping. Two complete legs attach at stable hips with consistent thigh/shin lengths. Knees bend forward with the feet, not backwards. Both boots retain size and shape. Near and far legs alternate forward and back, with appropriate occlusion, never merge into a twisted central leg. Forward boot is close to the floor; rear boot lifts only slightly. Modest stride, each boot travels at most around one boot length from standing. Show the far leg visibly taking the forward role in the second half; do not repeat the same leading leg.

EIGHT EXACT PHASES
1. Near leg forward with heel touching floor, far leg back with toe touching; far arm gently forward.
2. Weight settles on near leg, slight knee flexion; far heel lifts and leg begins recovery.
3. Near leg supports under hips; far foot passes forward just above floor, knee only modestly bent.
4. Far leg extends toward next contact; near heel starts lifting. Torso at most one logical pixel higher.
5. Far leg forward heel contact, near leg back toe contact; NEAR arm now gently forward. This is the opposite-leg counterpart of frame 1, not a mirrored character.
6. Weight settles on far leg; near leg recovers.
7. Far leg supports under hips; near foot passes forward just above floor.
8. Near leg extends toward initial contact; far heel lifts, preparing frame 1.
Arm swings are opposite the forward leg and small. Head size, face, torso and orb stay consistent; mantle follow-through is minimal. No huge foot rotations, crossed knees, thigh squashing or teleported feet. Boots follow a continuous trajectory, not random posing.

GRID AND ANCHORS
Eight equal square cells, 4x2, conceptually each 64x64 logical pixels. SAME scale, cell-local hip center and camera throughout. Proposed contact baseline local y=58 and root center x=32, figure about 54 units high. No lateral translation of the character within cells. Toe/heel contact at the baseline in support phases, swinging feet above it, never below. Do not vertically auto-center each pose. Consistent relative cell margins and no cropping, head/hands/feet fully visible. No grid lines, labels or numbers.

CRAFT AND ALPHA
Crisp deliberate pixel-art clusters consistent with reference, limited coordinated colors, upper-left neutral light. Actual alpha outside the character and limb gaps. The reference brown halo is a defect: remove it. No haze, glow, motion blur, floor, cast shadow, backdrop, written markings, extra orb, weapon, book or text. One animation sheet only. Cute body and smaller-head proportions preserved.

## Review

Candidate only. Verify frame progression, identity/anchor stability, clean alpha and GIF playback before reporting.
