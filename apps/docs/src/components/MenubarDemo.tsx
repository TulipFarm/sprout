import { useState, type ReactNode } from 'react';
import { Copy } from 'reicon-react/icons/Copy';
import { Export } from 'reicon-react/icons/Export';
import { FilePlus } from 'reicon-react/icons/FilePlus';
import { History } from 'reicon-react/icons/History';
import { Keyboard } from 'reicon-react/icons/Keyboard';
import { Printer } from 'reicon-react/icons/Printer';
import { Redo } from 'reicon-react/icons/Redo';
import { Scissors } from 'reicon-react/icons/Scissors';
import { Trash } from 'reicon-react/icons/Trash';
import { Undo } from 'reicon-react/icons/Undo';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@tulipfarm/sprout/menubar';
import { Example } from './dialog-demo-parts';
import '../styles/menubar-demo.css';

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="menubar-demo-status">
      {children}
    </p>
  );
}

/** The application menu from Cloud's overlay playground, with the same local-only actions. */
export function MenubarPlayground() {
  const [sidebar, setSidebar] = useState(true);
  const [density, setDensity] = useState('comfortable');
  const [result, setResult] = useState('No action selected.');
  return (
    <section className="menubar-demo-playground" aria-label="Menubar playground">
      <div className="menubar-demo-stage">
        <Menubar aria-label="Application menu">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => setResult('New draft selected locally.')}>
                New draft<MenubarShortcut>⌘ N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem disabled>Print</MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                variant="destructive"
                onClick={() => setResult('Discard draft selected locally. No data was deleted.')}
              >
                Discard draft
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked={sidebar} onCheckedChange={setSidebar}>
                Show sidebar
              </MenubarCheckboxItem>
              <MenubarRadioGroup value={density} onValueChange={setDensity}>
                <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
                <MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSub>
                <MenubarSubTrigger>More</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem onClick={() => setResult('Zoom in selected locally. Page zoom was not changed.')}>
                    Zoom in
                  </MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
      <div className="menubar-demo-readout">
        <p>
          Sample sidebar: {sidebar ? 'shown' : 'hidden'} · Density: {density === 'compact' ? 'Compact' : 'Comfortable'}
        </p>
        <Status>{result}</Status>
      </div>
    </section>
  );
}

const recent = [
  'Q3 greenhouse planting plan.md',
  'Field notes from the north greenhouse, week 14 — irrigation and seedling counts.md',
  'Supplier contacts.md',
];

/** A document editor bar with icons, labels, inset rows, and both item variants. */
export function MenubarEditor() {
  const [panels, setPanels] = useState<Record<string, boolean>>({
    outline: true,
    ruler: false,
  });
  const [width, setWidth] = useState('readable');
  const [result, setResult] = useState('');
  const act = (message: string) => () => setResult(message);
  return (
    <Example
      title="Document editor"
      description="Icons, labels, inset rows, disabled rows, and a destructive action. Actions only update the message below."
    >
      <div className="menubar-demo-editor">
        <Menubar aria-label="Editor menu">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={act('New draft selected.')}>
                <FilePlus aria-hidden="true" />
                New draft<MenubarShortcut>⌘ N</MenubarShortcut>
              </MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger>
                  <History aria-hidden="true" />
                  Open recent
                </MenubarSubTrigger>
                <MenubarSubContent>
                  {recent.map(name => (
                    <MenubarItem key={name} onClick={act(`Opened ${name}.`)}>
                      <span className="menubar-demo-truncate">{name}</span>
                    </MenubarItem>
                  ))}
                </MenubarSubContent>
              </MenubarSub>
              <MenubarItem onClick={act('Export as PDF selected.')}>
                <Export aria-hidden="true" />
                Export as PDF<MenubarShortcut>⇧ ⌘ E</MenubarShortcut>
              </MenubarItem>
              <MenubarItem disabled>
                <Printer aria-hidden="true" />
                Print<MenubarShortcut>⌘ P</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem variant="destructive" onClick={act('Move to trash selected. Nothing was deleted.')}>
                <Trash aria-hidden="true" />
                Move to trash<MenubarShortcut>⌘ ⌫</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={act('Undo selected.')}>
                <Undo aria-hidden="true" />
                Undo<MenubarShortcut>⌘ Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem disabled>
                <Redo aria-hidden="true" />
                Redo<MenubarShortcut>⇧ ⌘ Z</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={act('Cut selected.')}>
                <Scissors aria-hidden="true" />
                Cut<MenubarShortcut>⌘ X</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={act('Copy selected.')}>
                <Copy aria-hidden="true" />
                Copy<MenubarShortcut>⌘ C</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel inset>Panels</MenubarLabel>
                <MenubarCheckboxItem
                  checked={panels.outline}
                  onCheckedChange={checked => setPanels(p => ({ ...p, outline: checked }))}
                >
                  Outline
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={panels.ruler}
                  onCheckedChange={checked => setPanels(p => ({ ...p, ruler: checked }))}
                >
                  Ruler
                </MenubarCheckboxItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarGroup>
                <MenubarLabel inset>Page width</MenubarLabel>
                <MenubarRadioGroup value={width} onValueChange={setWidth}>
                  <MenubarRadioItem value="readable">Readable</MenubarRadioItem>
                  <MenubarRadioItem value="full">Full width</MenubarRadioItem>
                  <MenubarRadioItem value="print" disabled>
                    Print layout
                  </MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarItem
                inset
                onClick={() => {
                  setPanels({ outline: true, ruler: false });
                  setWidth('readable');
                  setResult('View reset.');
                }}
              >
                Reset view
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent align="end" alignOffset={-4}>
              <MenubarItem onClick={act('Keyboard shortcuts selected.')}>
                <Keyboard aria-hidden="true" />
                Keyboard shortcuts<MenubarShortcut>⌘ /</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <p className="menubar-demo-summary">
          Outline: {panels.outline ? 'on' : 'off'} · Ruler: {panels.ruler ? 'on' : 'off'} · Width:{' '}
          {width === 'full' ? 'Full width' : 'Readable'}
        </p>
        <Status>{result}</Status>
      </div>
    </Example>
  );
}
