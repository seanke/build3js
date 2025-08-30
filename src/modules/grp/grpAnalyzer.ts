import { GrpArchive } from './grpParser';

export interface GrpInfo {
  filename: string;
  signature: string;
  totalFiles: number;
  totalSize: number;
  mapCount: number;
  artCount: number;
  soundCount: number;
  musicCount: number;
  otherCount: number;
  knownGame: string | null;
  hasCommonFiles: string[];
}

export function analyzeGrp(grp: GrpArchive, filename: string): GrpInfo {
  const entries = grp.entries;
  
  // Calculate total size
  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  
  // Categorize files
  let mapCount = 0;
  let artCount = 0;
  let soundCount = 0;
  let musicCount = 0;
  let otherCount = 0;
  
  const hasCommonFiles: string[] = [];
  
  entries.forEach(entry => {
    const name = entry.name;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    
    // Categorize by extension
    if (ext === 'map') {
      mapCount++;
    } else if (ext === 'art') {
      artCount++;
    } else if (['voc', 'wav'].includes(ext)) {
      soundCount++;
    } else if (['mid', 'midi', 'ogg'].includes(ext)) {
      musicCount++;
    } else {
      otherCount++;
    }
    
    // Check for known common files
    checkCommonFiles(name, hasCommonFiles);
  });
  
  // Identify game based on files present
  const knownGame = identifyGame(entries, filename);
  
  return {
    filename,
    signature: grp.signature,
    totalFiles: grp.count,
    totalSize,
    mapCount,
    artCount,
    soundCount,
    musicCount,
    otherCount,
    knownGame,
    hasCommonFiles
  };
}

function checkCommonFiles(filename: string, hasCommonFiles: string[]) {
  const commonFiles = [
    'PALETTE.DAT',
    'LOOKUP.DAT', 
    'TILES000.ART',
    'TILES001.ART',
    'DEFS.CON',
    'GAME.CON',
    'USER.CON',
    'DUKE3D.DEF'
  ];
  
  if (commonFiles.includes(filename)) {
    hasCommonFiles.push(filename);
  }
}

function identifyGame(entries: any[], filename: string): string | null {
  const filenames = entries.map(e => e.name);
  const lowerFilename = filename.toLowerCase();
  
  // Duke Nukem 3D signatures
  if (lowerFilename.includes('duke3d') || 
      filenames.includes('DEFS.CON') || 
      filenames.includes('GAME.CON')) {
    return 'Duke Nukem 3D';
  }
  
  // Shadow Warrior signatures
  if (lowerFilename.includes('sw') || 
      filenames.includes('SW.DEF')) {
    return 'Shadow Warrior';
  }
  
  // Blood signatures
  if (lowerFilename.includes('blood') || 
      filenames.includes('BLOOD.INI')) {
    return 'Blood';
  }
  
  // Redneck Rampage
  if (lowerFilename.includes('redneck') || 
      filenames.includes('REDNECK.GRP')) {
    return 'Redneck Rampage';
  }
  
  // NAM
  if (lowerFilename.includes('nam') || 
      filenames.includes('NAM.GRP')) {
    return 'NAM';
  }
  
  // Generic BUILD engine game
  if (filenames.some(f => f.endsWith('.MAP')) && 
      filenames.some(f => f.endsWith('.ART'))) {
    return 'BUILD Engine Game';
  }
  
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}