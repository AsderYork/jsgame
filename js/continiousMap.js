class continiousMap {

    tiles = [];
    tilesExtra = [];
    size = {x:0, y:0};

    fillAll(val) {
        let tiles = [];
        for(let y = 0; y < this.size.y; y++) {
            tiles.push([]);
            for(let x = 0; x < this.size.x; x++) {
                tiles[y].push((typeof val === 'object' && val !== null) ? Object.assign({}, val) : val);
            }
        }
        return tiles;
    }

    constructor(size) {

        this.size = size;

        this.tiles = this.fillAll(0);
        this.tilesExtra = this.fillAll({level:0});

    }

    getSize() {
        return this.size;
    }

    getTile(vec) {
        return this.tiles?.[vec.y]?.[vec.x];
    }
    getTileData(vec) {
        return this.tilesExtra?.[vec.y]?.[vec.x]
    }

    setTile(vec, val, extra) {
        if(this.getTile(vec) !== undefined) {
            this.tiles[vec.y][vec.x] = val;

            if(extra !== undefined) {
                this.tilesExtra[vec.y][vec.x] = extra;
            }

        }
    }


}

class TerrainCollisions {

    continiousMapController;

    constructor(continiousMapController) {
        this.continiousMapController = continiousMapController;
    }

    isTileBlocking(vec, level, requireTerrain) {

        let data = this.continiousMapController.getTileDataByWorldPos(vec);
        if(data) {

            if(data.level < 0) {
            }

            return ((data.level === level) && data?.tile?.collide) ||
             ((data.level > level) || 
             ((data.level < level) && requireTerrain));
        }
        return true;

    }

    isBoxCollide(pos, size, level = 0, requireTerrain = false) {

        return this.isTileBlocking(pos, level, requireTerrain)
            || this.isTileBlocking(addXY(pos, size), level, requireTerrain)
            || this.isTileBlocking(addXY(pos, {x:0, y:size.y}), level, requireTerrain)
            || this.isTileBlocking(addXY(pos, {x:size.x, y:0}), level, requireTerrain);

    }

}

class ContiniousMapController {

    currentMap;
    maps = [];
    renderer;
    terrainCollisions = new TerrainCollisions(this);

    tileSet = [];
    addTile(texture, bg, collide = false) {
        this.tileSet.push({texture:texture, bg:bg, collide:collide});
        return this;
    }
    addFloorTiles(texture, bg, collide = false) {
        for(let horizontal of ['a', 'n', 'l', 'r']) {
            for(let vertical of ['a', 'n', 't', 'b']) {
                this.addTile(texture + vertical + horizontal, bg, collide);
            }
        }
        return this;
    }

    getTilesetElem(elem) {
        return this.tileSet[elem];
    }

    getMapSize() {
        return this.currentMap ? this.currentMap.getSize() : {x:0, y:0};
    }

    getTile(vec) {
        return this.currentMap.getTile(vec);
    }

    getTileDataByWorldPos(vec) {
        return this.getTileData(this.renderer.getTilePosByWorldPos(vec));
    }

    getTileData(vec) {
        let oi = this.currentMap?.getTileData(vec);
        return Object.assign({tile:this.getTilesetElem(this.currentMap?.getTile(vec))}, this.currentMap?.getTileData(vec));
    }


    setRenderer(renderer) {
        this.renderer = renderer;
        renderer.setMapInterface(this);
        return this;
    }

    addMap(map) {
        this.maps.push(map);
        return this;
    }

    setMap(map) {
        this.currentMap = map;

        let paintbrush = new TerrainPaintbrush(map, this.tileSet);

        paintbrush
            .glueGroups('gravel', 'edge')
            .defineStripeFeature('pit', 'edge', 'deep', 'top', x =>  {return {level: x.level - 1, noterrain:false}; }, x =>  {return {level: x.level - 1, noterrain:false}; })
            .defineStripeFeature('platform', 'edge', 1, 'bottom', undefined, x => {return {level:x.level + 1};})
            .fillTiles({x:0,y:0}, {x:100, y:100}, 'gravel')
            .drawFeature('platform', {x:20, y:14}, {x:26, y:18})
            .fillTiles({x:20,y:18}, {x:26, y:20}, 'gravel')
            .drawFeature('pit', {x:20, y:20}, {x:26, y:26})
            .render('green');

    }

}