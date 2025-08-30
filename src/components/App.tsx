import React, { useRef, useEffect, useState } from 'react';
import { MenuBar } from './ui/MenuBar';
import { GrpExplorerModal } from './ui/GrpExplorerModal';
import { GrpInfoModal } from './ui/GrpInfoModal';
import { StatusBar } from './ui/StatusBar';
import { ViewContainer } from './ui/ViewContainer';
import { InspectorPanel } from './ui/InspectorPanel';
import { AppController, ViewMode } from '../modules/app/AppController';
import { FileManager } from '../modules/app/FileManager';
import { BuildMap } from '../modules/build/types';
import { GrpArchive } from '../modules/grp/grpParser';
import { SelectionInfo } from '../types/selection';

export function App() {
  // Refs for the app controller and DOM elements
  const appControllerRef = useRef<AppController | null>(null);
  const fileManagerRef = useRef<FileManager | null>(null);
  const view2dRef = useRef<HTMLDivElement>(null);
  const view3dRef = useRef<HTMLDivElement>(null);

  // State
  const [currentMap, setCurrentMap] = useState<BuildMap | null>(null);
  const [currentGrp, setCurrentGrp] = useState<{ arc: GrpArchive; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [status, setStatus] = useState('Initializing...');
  const [isGrpModalOpen, setIsGrpModalOpen] = useState(false);
  const [isGrpInfoModalOpen, setIsGrpInfoModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Initialize app controller
  useEffect(() => {
    if (!view2dRef.current || !view3dRef.current || appControllerRef.current) return;

    const app = new AppController();
    const fileManager = new FileManager();
    
    appControllerRef.current = app;
    fileManagerRef.current = fileManager;

    // Initialize with DOM elements
    app.initWithElements(view2dRef.current, view3dRef.current);

    // Set up callbacks
    app.onMapChange = (map) => setCurrentMap(map);
    app.onGrpChange = (grp) => setCurrentGrp(grp);
    app.onStatusChange = (msg) => setStatus(msg);
    
    // Set up selection callback for 2D view
    app.setSelectionCallback((selection) => {
      setSelectionInfo(selection);
      setIsInspectorOpen(selection !== null);
    });
    
    app.startRenderLoop();

    // Auto-load default GRP file
    loadDefaultGrp(app, fileManager);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Auto-load default GRP file on startup
  const loadDefaultGrp = async (app: AppController, fileManager: FileManager) => {
    try {
      setStatus('Loading built-in DUKE3D.GRP...');
      const buf = await fileManager.fetchBuiltinGrp();
      const arc = await fileManager.loadGrpFromBuffer(buf);
      app.setCurrentGrp(arc, 'DUKE3D.GRP');
      setStatus('Ready. Drop a .map file or use GRP Explorer to load maps.');
    } catch (e: any) {
      console.warn('Could not load built-in GRP:', e);
      setStatus('Ready. Please open a GRP file to begin.');
    }
  };

  // Handle view mode changes
  useEffect(() => {
    if (appControllerRef.current) {
      appControllerRef.current.setViewMode(viewMode);
    }
  }, [viewMode]);

  // Handle resize observers for views
  useEffect(() => {
    if (!view2dRef.current || !view3dRef.current || !appControllerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        if (appControllerRef.current) {
          appControllerRef.current.resize();
        }
      }, 0);
    });

    // Observe both view containers
    resizeObserver.observe(view2dRef.current);
    resizeObserver.observe(view3dRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleWindowResize = () => {
      if (appControllerRef.current) {
        appControllerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Handle drag and drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.target === document.body) {
        setIsDragOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      
      const name = file.name.toLowerCase();
      if (name.endsWith('.map')) {
        await handleOpenMap(file);
      } else if (name.endsWith('.grp')) {
        await handleOpenGrp(file);
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleNewMap = () => {
    if (!fileManagerRef.current || !appControllerRef.current) return;
    
    const map = fileManagerRef.current.createNewMap();
    appControllerRef.current.setCurrentMap(map);
    setStatus('New map created');
  };

  const handleSaveMap = () => {
    if (!fileManagerRef.current || !currentMap) {
      setStatus('No map to save');
      return;
    }
    
    try {
      fileManagerRef.current.saveMapToFile(currentMap);
      setStatus('Map saved to download');
    } catch (e: any) {
      console.error(e);
      setStatus('Failed to save map');
    }
  };

  const handleOpenMap = async (file: File) => {
    if (!fileManagerRef.current || !appControllerRef.current) return;
    
    setStatus(`Loading ${file.name} …`);
    try {
      const map = await fileManagerRef.current.loadMapFile(file);
      appControllerRef.current.setCurrentMap(map);
      setStatus(
        `Loaded: ${file.name} — sectors: ${map.sectors.length}, ` +
        `walls: ${map.walls.length}, sprites: ${map.sprites.length}`
      );
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed to load: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const handleOpenGrp = async (file: File) => {
    if (!fileManagerRef.current || !appControllerRef.current) return;
    
    setStatus(`Loading GRP ${file.name} …`);
    try {
      const arc = await fileManagerRef.current.loadGrpFile(file);
      appControllerRef.current.setCurrentGrp(arc, file.name);
      setStatus(`Loaded GRP: ${file.name} — files: ${arc.count}`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed to load GRP: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const handleResetCamera = () => {
    if (appControllerRef.current) {
      appControllerRef.current.resetCamera();
    }
  };

  return (
    <div className="app-container">
      <MenuBar
        onNewMap={handleNewMap}
        onOpenMap={handleOpenMap}
        onSaveMap={handleSaveMap}
        onOpenGrp={handleOpenGrp}
        onExploreGrp={() => setIsGrpModalOpen(true)}
        onResetCamera={handleResetCamera}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasMap={currentMap !== null}
      />
      
      <ViewContainer 
        ref2d={view2dRef}
        ref3d={view3dRef}
        viewMode={viewMode}
      />
      
      <InspectorPanel
        isOpen={isInspectorOpen}
        onClose={() => {
          setIsInspectorOpen(false);
          setSelectionInfo(null);
        }}
        selectionInfo={selectionInfo}
        onResize={() => {
          if (appControllerRef.current) {
            appControllerRef.current.resize();
          }
        }}
      />
      
      <StatusBar 
        status={status} 
        currentGrp={currentGrp} 
        onGrpClick={() => setIsGrpInfoModalOpen(true)}
      />
      
      {isDragOver && (
        <div className="dropzone-overlay">
          <div className="dropzone-content">
            Drop a BUILD .map or .grp file here
          </div>
        </div>
      )}
      
      <GrpExplorerModal
        isOpen={isGrpModalOpen}
        onClose={() => setIsGrpModalOpen(false)}
        grp={currentGrp}
        fileManager={fileManagerRef.current}
        appController={appControllerRef.current}
        onStatusChange={setStatus}
      />
      
      <GrpInfoModal
        isOpen={isGrpInfoModalOpen}
        onClose={() => setIsGrpInfoModalOpen(false)}
        grp={currentGrp}
      />
    </div>
  );
}