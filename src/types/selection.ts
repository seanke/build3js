import { BuildMap, SectorType, WallType, SpriteType } from '../modules/build/types';

export type SelectionInfo = {
  type: 'wall' | 'sector' | 'sprite' | 'vertex' | 'multiple';
  indices: number[];
  objects: (WallType | SectorType | SpriteType)[];
  map: BuildMap;
};

export function getObjectInfo(map: BuildMap, type: string, index: number): any {
  switch (type) {
    case 'wall':
      return {
        ...map.walls[index],
        index,
        type: 'wall',
        connectedWall: map.walls[index].nextwall >= 0 ? map.walls[map.walls[index].nextwall] : null,
        connectedSector: map.walls[index].nextsector >= 0 ? map.sectors[map.walls[index].nextsector] : null,
      };
    case 'sector':
      return {
        ...map.sectors[index],
        index,
        type: 'sector',
        wallCount: map.sectors[index].wallnum,
        walls: Array.from({ length: map.sectors[index].wallnum }, (_, i) => 
          map.walls[map.sectors[index].wallptr + i]
        ),
      };
    case 'sprite':
      return {
        ...map.sprites[index],
        index,
        type: 'sprite',
        sector: map.sprites[index].sectnum >= 0 ? map.sectors[map.sprites[index].sectnum] : null,
      };
    default:
      return null;
  }
}