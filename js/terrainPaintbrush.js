class TerrainPaintbrush {

    terrain = null;
    tileset = null;
    painter = null;

    constructor(terrain, tileset) {
        this.terrain = terrain;
        this.tileset = tileset;
    }

    findTiletypeByAddr(addr) {
        for(let v in this.tileset) {
            if(this.tileset[v].texture === addr) {
                return v;
            }
        }
    }

    findeTypeOfTile(vec) {
        return this.tileset[this.terrain[vec.x][vec.y]].texture.split('.').slice(-2);
    }




    squareFloorPattern(start, end, style) {
        for (let x = start.x; x <= end.x; x++) {
            let addrh = x === start.x ? 'l' : (x === end.x ? 'r' : 'm');
            for (let y = start.y; y <= end.y; y++) {
                let addrv = (y === start.y ? 't' : (y === end.y ? 'b' : 'm'));
                this.terrain[x][y] = this.findTiletypeByAddr(style + '.' + addrv + addrh);
            }
        }
        return this;
    }

    inset(start, end) {
        for (let x = start.x; x <= end.x; x++) {
            for (let y = start.y; y <= end.y; y++) {
                this.terrain[x][y] = this.findTiletypeByAddr(style + '.' + element);
            }
        }
    }

    fill(start, end, style, element) {
        for (let x = start.x; x <= end.x; x++) {
            for (let y = start.y; y <= end.y; y++) {
                this.terrain[x][y] = this.findTiletypeByAddr(style + '.' + element);
            }
        }
        return this;
    }



}