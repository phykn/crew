import { type ReactNode, useEffect, useState } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Chip, ChipButton, ToggleChip } from './ui/Chip';
import { Choice } from './ui/Choice';
import { Confirm } from './ui/Confirm';
import { Dialog, DialogActions, DialogClose, DialogHead, DialogTitle } from './ui/Dialog';
import { Empty } from './ui/Empty';
import { Checkbox, Input, Label, TextArea } from './ui/Field';
import { Fold } from './ui/Fold';
import { Tab, TabList, Tabs } from './ui/Tabs';
import { ListMenu, ListOption } from './ui/Menu';
import { Segmented } from './ui/Segmented';
import { Switch } from './ui/Switch';
import { Toolbar, ToolbarEnd } from './ui/Toolbar';
import { PencilIcon, TabIcon, TrashIcon } from './components/Icons';

const OPTIONS = [
  { value: 'a', label: '첫째', hint: '설명이 붙은 항목' },
  { value: 'b', label: '둘째' },
];
const noop = () => {};

// Every part in every variant and state with the app's own CSS, and the tokens they are made of
export function Gallery() {
  const [view, setView] = useState('a');
  const [on, setOn] = useState(true);
  const [chip, setChip] = useState(true);
  const [pick, setPick] = useState('a');
  const [open, setOpen] = useState<'dialog' | 'confirm' | null>(null);
  const [tab, setTab] = useState('a');
  const [fold, setFold] = useState(true);
  return (
    <main className="gallery">
      <Section title="버튼">
        <Row label="secondary">
          <Button>기본</Button>
          <Button pressed>눌림</Button>
          <Button disabled>비활성</Button>
          <Button dirty>저장 안 함</Button>
        </Row>
        <Row label="primary">
          <Button variant="primary">기본</Button>
          <Button variant="primary" disabled>
            비활성
          </Button>
          <Button variant="primary" tone="danger">
            위험
          </Button>
        </Row>
        <Row label="크기">
          <Button size="sm">작게</Button>
          <Button size="md">보통</Button>
          <Button size="lg">크게</Button>
          <Button size="lg" iconOnly aria-label="아이콘">
            <PencilIcon />
          </Button>
        </Row>
        <Row label="quiet">
          <Button variant="quiet">조용히</Button>
          <Button variant="quiet" iconOnly aria-label="편집">
            <PencilIcon />
          </Button>
          <Button variant="quiet" tone="danger" iconOnly aria-label="삭제">
            <TrashIcon />
          </Button>
          <Button variant="quiet" disabled>
            비활성
          </Button>
        </Row>
        <Row label="row">
          <Button variant="row" className="gallery-row">
            한 줄 전체
          </Button>
          <Button variant="row" className="gallery-row" aria-current>
            고른 줄
          </Button>
          <Button variant="row" className="gallery-row" aria-expanded>
            펼친 줄
          </Button>
          <Button variant="row" size="md" tone="muted" className="gallery-row">
            흐린 줄
          </Button>
        </Row>
        <Row label="link">
          <Button variant="link">글자 버튼</Button>
          <Button variant="link" size="sm" tone="muted">
            흐린 글자
          </Button>
          <Button variant="link" tone="danger">
            중단
          </Button>
        </Row>
      </Section>

      <Section title="묶기">
        <Row label="tabs">
          <Tabs value={tab} onValueChange={setTab}>
            <TabList>
              <Tab value="a" name="대화" icon={<TabIcon tab="chat" />} />
              <Tab value="b" name="로그" icon={<TabIcon tab="log" />} waiting />
            </TabList>
          </Tabs>
        </Row>
        <Row label="fold">
          <Fold size="lg" label="크게" open={fold} onOpenChange={setFold}>
            <span>펼친 내용</span>
          </Fold>
          <Fold label="작게">
            <span>펼친 내용</span>
          </Fold>
        </Row>
        <Row label="label">
          <Label text="이름">
            <Input aria-label="이름" />
          </Label>
          <Label inline text="고용">
            <Switch label="고용" checked={on} onChange={setOn} />
          </Label>
        </Row>
      </Section>

      <Section title="고르기">
        <Row label="segmented">
          <Segmented
            label="보기"
            value={view}
            options={[
              { value: 'a', label: '위키' },
              { value: 'b', label: '기억' },
            ]}
            onChange={setView}
          />
        </Row>
        <Row label="choice">
          <Choice label="작게" size="sm" value={pick} options={OPTIONS} onChange={setPick} />
          <Choice label="보통" value={pick} options={OPTIONS} onChange={setPick} />
          <Choice label="크게" size="lg" value={pick} options={OPTIONS} onChange={setPick} />
        </Row>
        <Row label="menu">
          <ListMenu label="명령">
            <ListOption selected onPick={noop}>
              <b>/clear</b> <span className="muted">새 세션</span>
            </ListOption>
            <ListOption selected={false} onPick={noop}>
              <b>/help</b>
            </ListOption>
          </ListMenu>
        </Row>
        <Row label="switch">
          <Switch label="켜짐" checked={on} onChange={setOn} />
          <Switch label="꺼짐" checked={!on} onChange={(v) => setOn(!v)} />
        </Row>
        <Row label="chip">
          <ToggleChip checked={chip} onChange={() => setChip(!chip)}>
            켜짐
          </ToggleChip>
          <ToggleChip checked={!chip} onChange={() => setChip(!chip)}>
            꺼짐
          </ToggleChip>
          <Chip>
            고정 <Choice label="접근" size="sm" value={pick} options={OPTIONS} onChange={setPick} />
          </Chip>
          <ChipButton onClick={noop}>+ 더 보기</ChipButton>
        </Row>
      </Section>

      <Section title="입력과 표시">
        <Row label="field">
          <Input aria-label="작게" placeholder="작게" />
          <Input size="md" aria-label="보통" placeholder="보통" />
          <Input aria-label="비활성" value="비활성" disabled readOnly />
          <Checkbox checked readOnly>
            확인
          </Checkbox>
        </Row>
        <Row label="textarea">
          <TextArea aria-label="여러 줄" defaultValue="여러 줄 입력" />
        </Row>
        <Row label="badge">
          <Badge>보통</Badge>
          <Badge tone="ok">추가</Badge>
          <Badge tone="wait">수정</Badge>
          <Badge tone="bad">삭제</Badge>
        </Row>
        <Row label="toolbar">
          <div className="gallery-wide">
            <Toolbar>
              <Button pressed>왼쪽</Button>
              <ToolbarEnd>
                <Button>오른쪽</Button>
              </ToolbarEnd>
            </Toolbar>
          </div>
        </Row>
        <Row label="empty">
          <Empty>아직 없습니다</Empty>
        </Row>
        <Row label="dialog">
          <Button onClick={() => setOpen('dialog')}>대화상자 열기</Button>
          <Button onClick={() => setOpen('confirm')}>확인 창 열기</Button>
        </Row>
      </Section>

      <Tokens />

      <Dialog open={open === 'dialog'} onClose={() => setOpen(null)}>
        <DialogHead>
          <DialogTitle>대화상자</DialogTitle>
          <DialogClose />
        </DialogHead>
        <p>나무 테두리 안의 양피지입니다.</p>
        <DialogActions>
          <Button variant="primary">저장</Button>
        </DialogActions>
      </Dialog>
      {open === 'confirm' && (
        <Confirm
          label="삭제 확인"
          text="되돌릴 수 없습니다."
          actions={[{ label: '삭제', danger: true, run: () => setOpen(null) }]}
          onCancel={() => setOpen(null)}
        />
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="gallery-section" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="gallery-line">
      <span className="gallery-label">{label}</span>
      <div className="gallery-items">{children}</div>
    </div>
  );
}

// Read from the stylesheet itself, so a token added or renamed shows here without a list to keep
function Tokens() {
  const [tokens, setTokens] = useState<[string, string][]>([]);
  useEffect(() => {
    const root = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .find((r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText === ':root');
    if (!root) return;
    const style = getComputedStyle(document.documentElement);
    setTokens(
      [...root.style]
        .filter((name) => name.startsWith('--'))
        .map((name) => [name, style.getPropertyValue(name).trim()]),
    );
  }, []);
  const roles = tokens.filter(([name, v]) => CSS.supports('color', v) && !/-\d+$/.test(name));
  const of = (prefix: string) => tokens.filter(([name]) => name.startsWith(prefix));
  return (
    <>
      <Section title="색 역할">
        <div className="gallery-swatches">
          {roles.map(([name]) => (
            <div key={name} className="gallery-swatch">
              <span style={{ background: `var(${name})` }} />
              {name}
            </div>
          ))}
        </div>
      </Section>
      <Section title="척도">
        <Row label="간격">
          {of('--sp-').map(([name]) => (
            <span key={name} className="gallery-space" style={{ width: `var(${name})` }} title={name} />
          ))}
        </Row>
        <Row label="글자">
          {of('--fs-').map(([name]) => (
            <span key={name} style={{ fontSize: `var(${name})` }}>
              {name}
            </span>
          ))}
        </Row>
        <Row label="모서리">
          {tokens
            .filter(([name]) => /^--r(-|$)/.test(name))
            .map(([name]) => (
              <span key={name} className="gallery-corner" style={{ borderRadius: `var(${name})` }}>
                {name}
              </span>
            ))}
        </Row>
        <Row label="높이">
          {['--h-sm', '--h-md', '--h-lg'].map((name) => (
            <span key={name} className="gallery-height" style={{ height: `var(${name})` }}>
              {name}
            </span>
          ))}
        </Row>
      </Section>
    </>
  );
}
