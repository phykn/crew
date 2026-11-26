# graphics

캠프 그림을 만들 때 쓰는 작업 파일. 앱은 이 폴더 없이 실행되고, 최종본 코드는 `src/frontend/camp/`에 있다.

## 폴더

- `preview/`: 앱 코드로 소품만 그려 보는 페이지
- `props/`: 소품 참고 그림(`<이름>.png`)과 그 그림을 만든 브리프(`<이름>.md`)
- `characters/`: 캐릭터 참고 그림, 브리프, 내보내기 스크립트(`scripts/`)
- `assets.md`: 참고 그림 목록과 평가
- `plan.md`: 그림 개선 계획

## 미리보기

저장소 루트에서 서버를 띄운다.

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

- 전체: http://127.0.0.1:8766/graphics/preview/
- 하나만: `?kind=wagon` (종류: crates, drum, hay, log, bench, well, wagon, tent, lantern, pine, fern, tuft, rock, woodpile)
- 확대: `&zoom=6`

각 소품은 캠프에 놓이는 자리에 그려져서, 모닥불 빛도 앱과 똑같이 받는다.

## 코드

`src/frontend/camp/art/`:

- `solids.js`: 3D 소품 렌더러. 거리 함수(SDF)로 모양을 정의하고, 캠프 투영 그대로 픽셀마다 광선을 쏜다. 툰 명암, 재질 색 단계(WOOD, BARK, IRON, ROCK, HAY, CANVAS, WATER), 모닥불과 횃불 빛, 실제 모양대로 떨어지는 바닥 그림자를 다룬다.
- `props.js`: 소품 하나마다 함수 하나. 부품(`box`, `round`, `rod`, `facets`)을 조합하고 `paint`로 색을 칠한다.
- `ground.js`: 바닥과 모닥불 자리
- `sprites.js`: 사람
- `finish.js`: 구운 뒤 다듬기(확대, 외곽선, 림 라이트, 그레인)
- `shapes.js`: 2D 도형과 그림자, 불빛을 가리는 물체 목록(casters)

색은 `src/frontend/camp/palette.js`, 자리는 `layout.js`, 투영은 `projection.js`에 있다.

## 작업 순서

1. 소품 하나를 고른다.
2. 브리프를 먼저 쓴다: 모양, 부품, 색 단계, 피할 것.
3. 참고 그림은 분위기만 맞춘다. 캠프 전체와 어울리는 게 우선이다.
4. `preview/`에서 그 소품만 확인한다.
5. 피할 것: 지저분한 결, 무작위 선, 울퉁불퉁하거나 레이스 같은 가장자리, 쇠테의 밝은 줄, 바위의 금과 이끼
