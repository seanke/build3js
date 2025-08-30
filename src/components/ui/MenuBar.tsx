import React from 'react';
import * as Menubar from '@radix-ui/react-menubar';
import { File, Folder, Eye, RotateCcw, HelpCircle } from 'lucide-react';
import { ViewMode } from '../../modules/app/AppController';

interface MenuBarProps {
  onNewMap: () => void;
  onOpenMap: (file: File) => void;
  onSaveMap: () => void;
  onOpenGrp: (file: File) => void;
  onExploreGrp: () => void;
  onResetCamera: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasMap: boolean;
}

export function MenuBar({
  onNewMap,
  onOpenMap,
  onSaveMap,
  onOpenGrp,
  onExploreGrp,
  onResetCamera,
  viewMode,
  onViewModeChange,
  hasMap
}: MenuBarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const grpInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenMapClick = () => fileInputRef.current?.click();
  const handleOpenGrpClick = () => grpInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onOpenMap(file);
    e.target.value = ''; // Reset input
  };

  const handleGrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onOpenGrp(file);
    e.target.value = ''; // Reset input
  };

  return (
    <>
      <Menubar.Root className="menu-bar">
        {/* File Menu */}
        <Menubar.Menu>
          <Menubar.Trigger className="menu-trigger">
            <File size={16} />
            File
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="menu-content">
              <Menubar.Item className="menu-item" onClick={onNewMap}>
                New Map
                <span className="menu-shortcut">Ctrl+N</span>
              </Menubar.Item>
              <Menubar.Separator className="menu-separator" />
              <Menubar.Item className="menu-item" onClick={handleOpenMapClick}>
                Open Map...
                <span className="menu-shortcut">Ctrl+O</span>
              </Menubar.Item>
              <Menubar.Item 
                className="menu-item" 
                onClick={onSaveMap}
                disabled={!hasMap}
              >
                Save Map
                <span className="menu-shortcut">Ctrl+S</span>
              </Menubar.Item>
              <Menubar.Separator className="menu-separator" />
              <Menubar.Item className="menu-item" onClick={handleOpenGrpClick}>
                Open GRP...
              </Menubar.Item>
              <Menubar.Item className="menu-item" onClick={onExploreGrp}>
                GRP Explorer...
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>

        {/* View Menu */}
        <Menubar.Menu>
          <Menubar.Trigger className="menu-trigger">
            <Eye size={16} />
            View
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="menu-content">
              <Menubar.RadioGroup value={viewMode} onValueChange={onViewModeChange as any}>
                <Menubar.RadioItem className="menu-radio-item" value="2d">
                  <Menubar.ItemIndicator className="menu-indicator">•</Menubar.ItemIndicator>
                  2D View
                  <span className="menu-shortcut">F2</span>
                </Menubar.RadioItem>
                <Menubar.RadioItem className="menu-radio-item" value="3d">
                  <Menubar.ItemIndicator className="menu-indicator">•</Menubar.ItemIndicator>
                  3D View
                  <span className="menu-shortcut">F3</span>
                </Menubar.RadioItem>
                <Menubar.RadioItem className="menu-radio-item" value="split">
                  <Menubar.ItemIndicator className="menu-indicator">•</Menubar.ItemIndicator>
                  Split View
                  <span className="menu-shortcut">F4</span>
                </Menubar.RadioItem>
              </Menubar.RadioGroup>
              <Menubar.Separator className="menu-separator" />
              <Menubar.Item className="menu-item" onClick={onResetCamera}>
                <RotateCcw size={16} />
                Reset Camera
                <span className="menu-shortcut">Home</span>
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>

        {/* Help Menu */}
        <Menubar.Menu>
          <Menubar.Trigger className="menu-trigger">
            <HelpCircle size={16} />
            Help
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="menu-content">
              <Menubar.Item 
                className="menu-item" 
                onClick={() => alert('BUILD3JS — a TypeScript + three.js viewer for BUILD-era maps.')}
              >
                About BUILD3JS
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar.Root>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".map"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={grpInputRef}
        type="file"
        accept=".grp"
        onChange={handleGrpChange}
        style={{ display: 'none' }}
      />
    </>
  );
}