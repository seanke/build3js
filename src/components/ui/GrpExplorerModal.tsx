import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Folder, File } from 'lucide-react';
import { GrpArchive, GrpEntry } from '../../modules/grp/grpParser';
import { FileManager } from '../../modules/app/FileManager';
import { AppController } from '../../modules/app/AppController';

interface GrpExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  grp: { arc: GrpArchive; name: string } | null;
  fileManager: FileManager | null;
  appController: AppController | null;
  onStatusChange: (status: string) => void;
}

export function GrpExplorerModal({
  isOpen,
  onClose,
  grp,
  fileManager,
  appController,
  onStatusChange
}: GrpExplorerModalProps) {
  const handleTryBuiltin = async () => {
    if (!fileManager || !appController) return;
    
    try {
      onStatusChange('Fetching /DUKE3D.GRP …');
      const buf = await fileManager.fetchBuiltinGrp();
      const arc = await fileManager.loadGrpFromBuffer(buf);
      appController.setCurrentGrp(arc, 'DUKE3D.GRP');
      onStatusChange(`Loaded GRP: DUKE3D.GRP — files: ${arc.count}`);
    } catch (e: any) {
      onStatusChange('Could not fetch built-in GRP. Place it in /public.');
      console.warn(e);
    }
  };

  const handleLoadMap = async (entry: GrpEntry) => {
    if (!grp || !fileManager || !appController) return;
    
    onStatusChange(`Loading ${entry.name} from ${grp.name} …`);
    try {
      const map = await fileManager.loadMapFromGrpEntry(grp.arc, entry);
      appController.setCurrentMap(map);
      onStatusChange(
        `Loaded: ${entry.name} — sectors: ${map.sectors.length}, ` +
        `walls: ${map.walls.length}, sprites: ${map.sprites.length}`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      onStatusChange(`Failed to load map from GRP: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const maps = grp?.arc.entries.filter(e => e.name.endsWith('.MAP')) || [];
  const others = grp?.arc.entries.filter(e => !e.name.endsWith('.MAP')) || [];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content grp-modal">
          <div className="modal-header">
            <Dialog.Title className="modal-title">
              <Folder size={20} />
              GRP Explorer
            </Dialog.Title>
            <Dialog.Close className="modal-close-btn">
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="modal-body">
            {!grp ? (
              <div className="grp-empty">
                <p>No GRP file loaded.</p>
                <button onClick={handleTryBuiltin} className="btn btn-primary">
                  Try Built-in DUKE3D.GRP
                </button>
              </div>
            ) : (
              <>
                <div className="grp-meta">
                  <span>{grp.name} — {grp.arc.count} files</span>
                </div>
                
                <div className="grp-list">
                  {maps.length > 0 && (
                    <div className="grp-section">
                      <h3 className="section-title">Maps</h3>
                      {maps.map((entry, index) => (
                        <div 
                          key={index}
                          className="list-row clickable"
                          onClick={() => handleLoadMap(entry)}
                        >
                          <div className="file-info">
                            <File size={16} />
                            <span className="file-name">{entry.name}</span>
                          </div>
                          <span className="file-size">{entry.size} bytes</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {others.length > 0 && (
                    <div className="grp-section">
                      <h3 className="section-title">Other Files</h3>
                      {others.map((entry, index) => (
                        <div key={index} className="list-row">
                          <div className="file-info">
                            <File size={16} />
                            <span className="file-name">{entry.name}</span>
                          </div>
                          <span className="file-size">{entry.size} bytes</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}