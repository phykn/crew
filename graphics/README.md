# graphics

캠프 그림을 만들 때 쓰는 작업 파일. 앱은 이 폴더를 읽지 않아서 통째로 지워도 돌아가고, 최종본 코드는 `src/frontend/camp/`에 있다.

## 폴더

물체마다 폴더 하나, 안에는 `brief.md` 하나와 그림만 둔다.

- `props/<물체>/`: 캠프에 놓이는 소품. 그림이 한 장이면 `image.png`, 여러 장이면 차이를 이름으로 쓴다(lantern: `image.png`, `light.png`).
- `ground/<종류>/`: 바닥 질감(grass, dirt, worn, edge)
- `effects/<효과>/`: 불꽃, 연기, 불티, 마법진
- `characters/<역할>/`: 동작별 최종 그림(`idle`, `walk`, `sit`, `cast-start`, `cast-loop`, `cast-end`)과, 마스터 프롬프트, 동작 프롬프트, 메모를 합친 `brief.md`
- `characters/trace.py`: 동작 그림 한 칸을 `figures.js`의 글자 그림으로 바꾸는 스크립트(`python graphics/characters/trace.py interpreter idle 0 4`)
- `preview.html`: 앱 코드로 소품을 그려 보는 페이지

이름에 버전(`v1`), `-prompt`, `-pack` 같은 꼬리는 붙이지 않는다. 후보 그림과 예전 프롬프트는 git 기록에만 남긴다.

## 미리보기

저장소 루트에서 서버를 띄운다.

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

- 전체: http://127.0.0.1:8766/graphics/preview.html
- 하나만: `?kind=wagon` (종류: hearth, crates, drum, hay, log, bench, well, wagon, tent, lantern, torch, pine, fern, tuft, rock, woodpile)
- 확대: `&zoom=6`
- 캠프 전체 바닥과 소품: `?ground` (소품 없이 바닥만: `?ground&bare`)
- 사람: `?figure=interpreter` (불 왼쪽, 없음, 오른쪽)

각 소품은 캠프에서 놓이는 자리에 그려지므로, 모닥불 빛도 앱에서와 똑같이 받는다.

## 코드

`src/frontend/camp/art/`:

- `solids.js`: 3D 소품 렌더러. 모양을 거리 함수(SDF)로 정의하고, 캠프 투영 그대로 픽셀마다 광선을 쏜다. 다루는 것:
  - 툰 명암
  - 재질별 색 단계(WOOD, BARK, IRON, ROCK, HAY, CANVAS, WATER, BLAZE)
  - 모닥불과 횃불 빛(바닥 그림자는 빛 지도 몫)
- `props.js`: 소품 하나에 함수 하나. 부품(`box`, `round`, `rod`, `facets`)을 조합하고 `paint`로 색을 칠한다.
- `ground.js`: 바닥과 모닥불 자리
- `sprites.js`: 지금 캠프의 사람
- `figures.js`: 새 사람 그림. 글자 하나가 픽셀 하나, 역할마다 색과 줄, 불 쪽 가장자리를 데우는 빛
- `finish.js`: 구운 그림 다듬기(확대, 외곽선, 림 라이트, 그레인)
- `casters.js`: 모닥불과 횃불 빛을 가리는 물체 목록(긴 그림자용)

색은 `src/frontend/camp/palette.js`, 자리는 `layout.js`, 투영은 `projection.js`에 있다.

## 작업 순서

1. 물체 하나를 고른다.
2. 브리프를 먼저 쓴다. 모양, 부품, 색 단계, 피할 것을 적는다.
3. 참고 그림은 분위기만 맞춘다. 캠프 전체와 어울리는 것이 먼저다.
4. `preview.html`에서 그 물체만 확인한다.

피할 것:

- 지저분한 결, 무작위 선
- 울퉁불퉁하거나 레이스 같은 가장자리
- 쇠테의 밝은 줄
- 바위의 금과 이끼
