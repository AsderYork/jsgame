class terrainElement {

    edges = {left:false, right:false, top:false, bottom:false};
    corners = {topleft:false, topright:false, bottomleft:false, bottomright:false};
    group = 0;

    getGroup() {
        return this.group;
    }

    setGroup(group) {
        this.group = group;
        return this;
    }

    setEdge(edge, val) {
        this.edges[edge] = val;
        return this;
    }

    setCorner(corner, val) {
        this.corners[corner] = val;
        return this;
    }

    getType() {

        let horizontal = '';
        if(this.edges.left && this.edges.right) {
            horizontal = 'a';
        } else if(this.edges.left && !this.edges.right) {
            horizontal = 'l';
        } else if(!this.edges.left && this.edges.right) {
            horizontal = 'r';
        } else if(!this.edges.left && !this.edges.right) {
            horizontal = 'n';
        }

        let vertical = '';
        if(this.edges.top && this.edges.bottom) {
            vertical = 'a';
        } else if(this.edges.top && !this.edges.bottom) {
            vertical = 't';
        } else if(!this.edges.top && this.edges.bottom) {
            vertical = 'b';
        } else if(!this.edges.top && !this.edges.bottom) {
            vertical = 'n';
        }

        return vertical + horizontal;
    }
}

class TerrainElementsController {

    opposites = {left:'right', right:'left', top:'bottom', bottom:'top'};

    terrainElements = [];

    grluedGroups = {};

    constructor(size) {

        for(let y = 0; y < size; y++) {
            this.terrainElements.push([]);
            for(let x = 0; x < size; x++) {
                this.terrainElements[y][x] = new terrainElement();
            }
        }

    }

    getElement(pos) {
        return this.terrainElements?.[pos.y]?.[pos.x];
    }

    addGluedGroup(main, glued) {
        if(this.grluedGroups[main] === undefined) {
            this.grluedGroups[main] = [glued];
        } else {
            this.grluedGroups[main].push(glued);
        }
    }

    addGluedGroups(group1, group2) {
        this.addGluedGroup(group1, group2);
        this.addGluedGroup(group2, group1);
        return this;
    }

    areGroupsGlued(group1, group2) {
        return this.grluedGroups[group1] !== undefined && this.grluedGroups[group1].includes(group2);
    }


    getShift(edge) {

        let shifts = {
            left: {x:-1,y:0}, right:{x:1,y:0}, top:{x:0, y:-1}, bottom:{x:0, y:1},
            topleft: {x:-1,y:1}, topright:{x:1,y:1}, bottomleft:{x:-1,y:-1}, bottomright:{x:1,y:-1}
        };

        return shifts[edge];

    }

    alterElement(pos, group) {

        let center = this.getElement(pos);
        if (center) {
            center.setGroup(group);
            for(let side in this.opposites) {
                let elem = this.getElement(addXY(pos, this.getShift(side)));
                if (elem) {
                    let edgeStatus = !(this.areGroupsGlued(elem.getGroup(), group) || elem.getGroup() === group);
                    if(elem.getGroup() !== 0) {
                        elem.setEdge(this.opposites[side], edgeStatus);
                    }
                    center.setEdge(side, edgeStatus);
                }
            }
        }
    }


}

class TerrainPaintbrush {

    terrain = null;
    tileset = null;
    terrainElementsController;
    features = {};

    constructor(terrain, tileset) {
        this.terrain = terrain;
        this.tileset = tileset;

        this.terrainElementsController = new TerrainElementsController(terrain.length);
    }

    alterTile(pos, group) {
        this.terrainElementsController.alterElement(pos, group);
        return this;
    }

    fillTiles(start, end, group) {

        for(let x = start.x; x < end.x; x++) {
            for(let y = start.y; y < end.y; y++) {
                this.alterTile({x:x,y:y}, group);
            }
        }
        return this;

    }

    drawFeature(name, start, end) {

        let feature = this.features[name];

        if(feature && feature.isPossible(start, end)) {
            feature.draw(this, start, end);
        }

        return this;
    }

    glueGroups(group1, group2) {
        this.terrainElementsController.addGluedGroups(group1, group2);
        return this;
    }

    defineStripeFeature(name, stripeGroup, bgGroup, stripePos = 'top') {
        this.features[name] = {
            isPossible: (start, end) => end.y - start.y >= 2,
            draw: (cntrl, start, end) => {
                if(stripePos === 'top') {
                    cntrl
                        .fillTiles(start, {x:end.x, y:start.y + 1}, stripeGroup)
                        .fillTiles({x:start.x, y:start.y + 1}, end, bgGroup);
                } else if(stripePos === 'bottom') {
                    cntrl
                        .fillTiles(start, {x:end.x, y:end.y - 1}, bgGroup)
                        .fillTiles({x:start.x, y:end.y - 1}, end, stripeGroup);
                }
            },
        };
        return this;
    }

    render(style) {
        for(let y = 0; y < this.terrain.length; y++) {
            for(let x = 0; x < this.terrain[0].length; x++) {
                const elem = this.terrainElementsController.getElement({x:x, y:y});
                const type = elem?.getType();
                const texturename = !Number.isInteger(elem.getGroup()) ? elem.getGroup() + type : type;
                let tileType = this.findTiletypeByAddr(style + '.' + texturename);

                if(!tileType) {
                    tileType = this.findTiletypeByAddr(style + '.' + elem.getGroup());
                }

                this.terrain[y][x] = tileType;
            }
        }
    }

    findTiletypeByAddr(addr) {
        for(let v in this.tileset) {
            if(this.tileset[v].texture === addr) {
                return v;
            }
        }
    }

}