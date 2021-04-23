

class Keyboard {

    #state = {};
    #commands = {};

    gameState = 'game';

    #codeToCommandTranslator = {
        game : {
            moveUp: ['ArrowUp', 'KeyW'],
            moveDown: ['ArrowDown', 'KeyS'],
            moveRight: ['ArrowRight', 'KeyD'],
            moveLeft: ['ArrowLeft', 'KeyA'],
            interact: ['Space'],
            attack: ['KeyQ'],
        },
        menu: {
            selectUp: ['ArrowUp', 'KeyW'],
            selectDown: ['ArrowDown', 'KeyS'],
            selectRight: ['ArrowRight', 'KeyD'],
            selectLeft: ['ArrowLeft', 'KeyA'],
            select: ['Space'],
        }
    }

    #registeredCommandListeners = {};


    registerKeyPressed(code) {
        this.#state[code] = true;

        if(this.#registeredCommandListeners[this.gameState]) {
            for(let command in this.#registeredCommandListeners[this.gameState]) {
                if(this.isCommandActive(command, this.gameState)) {
                    for(let action of this.#registeredCommandListeners[this.gameState][command]) {
                        if(action()) {
                            break;
                        }
                    }
                }
            }
        }

    }

    registerKeyRelease(code) {
        delete this.#state[code];

    }

    isKeyPreseed(code) {
        return !!this.#state[code];
    }

    onCommandActive(command, state, callback) {
        if(this.#registeredCommandListeners[state] === undefined) {
            this.#registeredCommandListeners[state] = {};
        }

        if(this.#registeredCommandListeners[state][command] === undefined) {
            this.#registeredCommandListeners[state][command] = [];
        }

        this.#registeredCommandListeners[state][command].push(callback);
    }

    isCommandActive(command, state = 'game') {
        if(this.gameState === state) {
            let self = this;
            let callbacks = this.#codeToCommandTranslator[this.gameState][command];
            if(callbacks !== undefined) {
                return callbacks.some(key => this.isKeyPreseed(key));
            }
        }
        return false;

    }

    constructor() {

        const self = this;

        window.onkeydown=function(e){
            e = e || window.event;
            self.registerKeyPressed(e.code);
        }

        window.onkeyup=function(e){
            e = e || window.event;
            delete self.registerKeyRelease(e.code);
        }


    }

}

class Animation {

    static linear(value, max, frames) {
        return Math.floor((value % max) / (max / frames));
    }

    static linearNoRepeat(value, max, frames) {
        return value >= max ? (frames - 1) : Math.floor((value % max) / (max / frames));
    }

}

class animatedParam {
    #param = null;

    get() {
        return this.#param;
    }

    set(val) {
        this.#param = val;
    }

    animate(time) {}

    constructor(val) {
        this.set(val);
    }
}

class animatedLinearParam extends animatedParam {

    #fromVal;
    #toVal;
    #duration;
    #currTime = 0;

    reset(newTime) {
        this.#currTime = newTime !== undefined ? newTime : 0;
    }

    constructor(fromVal, toVal, duration, initialState) {

        if(initialState === undefined) {
            initialState = fromVal;
        }

        super(initialState);
        this.#fromVal = fromVal;
        this.#toVal = toVal;
        this.#duration = duration;
    }

    getToVal() {
        return this.#toVal;
    }

    getFromVal() {
        return this.#fromVal;
    }

    animate(time) {
        if(this.#currTime >= this.#duration) {
            return;
        }

        this.#currTime++;


        if(this.#currTime > this.#duration) {
            this.#currTime = this.#duration;
        }

        const percentage = this.#currTime / this.#duration;

        this.set(this.#toVal * percentage + this.#fromVal * (1 - percentage));

    }

}


class mapElement {
    tiles = [];
    map;

    constructor(map, tiles) {
        this.tiles = tiles;
        this.map = map;
    }

    getRandomTile() {
        return this.tiles.length > 0 ? getRandomElement(this.tiles) : null;
    }

    getRepresentiveTile() {
        return this.getRandomTile();
    }

}
class GameMapScreenRoadEntry extends mapElement{

    direction;
    porch = [];
    representativePoint = [];


    constructor(map, tiles, direction) {
        super(map, tiles);
        this.direction = direction;

        this.draw();

    }

    getRepresentiveTile() {
        return getRandomElement(this.representativePoint);
    }

    addPorch(length = 2, material = 0) {

        let positionCord = {left:'y', right:'y', up:'x', down:'x'};

        for(let tile of this.tiles) {
            for(let depth = 0; depth < length; depth++) {
                let porchCords = this.map.getTileCordsByDirection(this.direction, tile[positionCord[this.direction]], depth + 1);
                this.porch.push(porchCords);
                this.map.setTileByVector(porchCords, material);
            }
            this.representativePoint.push(this.porch[this.porch.length - 1]);
        }

    }

    draw() {
        this.tiles.forEach(x => this.map.setTileByVector(x, 2));
        this.addPorch(2, 0);
    }


}
class MapIsland extends mapElement{
    center;
    radius;


    constructor(map, center, radius) {

        super(map, getCirclePoints(center, radius));

        this.center = center;
        this.radius = radius;

        this.draw();

    }

    draw() {
        this.tiles.forEach(x => this.map.setTileByVector(x, 3));
    }


}
class MapLinearPath extends mapElement{

    start;
    end;
    width;


    constructor(map, tiles, start, end, width) {
        super(map, tiles);
        this.start = start;
        this.end = end;
        this.width = width;
    }

}

class MapBuilder {
    #map;
    #mapsAround;
    #elementsOrder = [];
    #nextActionChance = null;

    constructor(map) {
        this.#map = map;
    }

    static make(map) {
        return new MapBuilder(map);
    }

    copyBoundryOnOposite(sourceMap, direction) {

        for(let i = 0; i < this.#map.getMapLengthByDirection(); i++) {
            let oldBorderPos = sourceMap.getTileCordsByDirection(GameMapScreen.opositeDirections[direction], i);
            let newBorderPos = this.#map.getTileCordsByDirection(direction, i);

            this.#map.setTileByVector(newBorderPos, sourceMap.getTileIndex(oldBorderPos));
        }

    }

    setMapsAround(mapsAround) {
        this.#mapsAround = mapsAround;
        return this;
    }

    copyBoundriesOnOpposites() {
        for(let direction in this.#mapsAround) {
            this.copyBoundryOnOposite(this.#mapsAround[direction], direction);
        }
        this.findRoadEntries();
        return this;
    }

    addRoad(map, direction, size, options) {
        let potentialRoads = [];

        let edgeAvoidance = options ? options['edgeAvoidance'] ?? 0 : 0;
        let roadAvoidance = options ? options['roadAvoidance'] ?? 0 : 0;

        let currRoad = [];

        let roadNear = 0;

        for(let i = edgeAvoidance; i < map.getMapLengthByDirection(direction) - edgeAvoidance; i++) {

            let tileCord = map.getTileCordsByDirection(direction, i);

            if(!map.getTileByVector(tileCord).road) {
                roadNear++;

                currRoad.push(tileCord);

                if(currRoad.length > size + roadAvoidance) {
                    currRoad.shift();
                }

                if(roadNear >= size + roadAvoidance) {
                    potentialRoads.push(currRoad.slice(1, size + roadAvoidance));
                }



            } else {
                roadNear = 0;
                currRoad = [];
            }

        }

        if(potentialRoads.length > 0) {
            return map.createGameMapScreenRoadEntry(direction, getRandomElement(potentialRoads));
        }

        return null;

    }

    addIslandCore(map, radius, material, border = 2) {

        let randX = getRandomInt(border + radius, map.width - (border + radius));
        let randY = getRandomInt(border + radius, map.height - (border + radius));

        let island = new MapIsland(map, {x:randX, y:randY}, radius);

        map.islands.push(island);
        return island;


    }

    addPath(map, start, end, width, material) {

        let fill = getPointsOnLineWidth(start, end, width);

        map.fillPoints(fill, material, [2, 5, 3]);
        let path = new MapLinearPath(map, fill, start, end, width);
        map.liearPaths.push(path);
        return path;
    }

    getUnoccupiedBorders() {
        return Object.entries(this.#map.gameMapScreenRoadEntry).filter(x => x[1].length === 0).map(x => x[0]);
    }

    getAllMapsElements() {
        this.#map.gameMapScreenRoadEntry.concat(this.#map.islands, this.#map.liearPaths);
    }

    makeNoLessRoadsidesThen(count, size, options = {'roadAvoidance': 1, 'edgeAvoidance': 1}) {

        let unoccupiedBorders = shuffle(this.getUnoccupiedBorders());
        for(let i = 4 - unoccupiedBorders.length; i < count; i++) {
            let dir = unoccupiedBorders.pop();

            if(this.#mapsAround[dir] === undefined || options.allowMapMismatch) {
                let currSize = typeof size === 'object' ? getRandomInt(size.min, size.max) : size;

                let newRoad = this.addRoad(this.#map, dir, currSize, options);
                this.#elementsOrder.push(newRoad);
            }
        }

        return this;
    }

    addRoadOnUnoccupiedBorder(size, options = {'roadAvoidance': 1, 'edgeAvoidance': 1}) {

        let unoccupiedBorders = this.getUnoccupiedBorders();
        if(unoccupiedBorders.length > 0) {
            let newRoad = this.addRoad(this.#map, getRandomElement(unoccupiedBorders), size, options);
            this.#elementsOrder.push(newRoad);
        }

        return this;
    }

    connectRandomRoads(size) {

        let roadPair = this.#map.getRandomRoads();
        if(roadPair.length > 1) {
            let newPath = this.addPath(this.#map, roadPair[0].getRepresentiveTile(), roadPair[1].getRepresentiveTile(), size, 0);
            if(newPath) {
                this.#elementsOrder.push(newPath);
            }
        }

        return this;
    }

    addIsland(radius) {
        let island = this.addIslandCore(this.#map, radius, 3);
        if(island) {
            this.#elementsOrder.push(island);
        }
        return this;
    }

    connectLastTwo(size) {
        if(this.#elementsOrder.length > 1) {
            let startElement = this.#elementsOrder[this.#elementsOrder.length - 1];
            let endElement = this.#elementsOrder[this.#elementsOrder.length - 2];

            let newPath = this.addPath(this.#map, startElement.getRandomTile(), endElement.getRandomTile(), size, 0);
            if(newPath) {
                this.#elementsOrder.push(newPath);
            }
        }
        return this;
    }

    chance(probability, predicate = undefined) {

        if(predicate === undefined) {
            this.#nextActionChance = probability;
        } else {
            if (getRandomInt(0, 100) < probability * 100) {
                predicate(this.#map);
            }
        }
        return this;

    }

    findRoadEntries() {
        for(var direction of GameMapScreen.directions) {
            this.#map.gameMapScreenRoadEntry[direction] = [];

            let currRoad = null;
            for(var i = 0; i < this.#map.getMapLengthByDirection(direction); i++) {

                let cords = this.#map.getTileCordsByDirection(direction, i);
                let tile = this.#map.getTileByVector(cords);

                if(tile && tile.road) {
                    if(currRoad === null) {
                        currRoad = [];
                    }
                    currRoad.push(cords);
                } else {
                    if(currRoad !== null) {
                        this.#map.createGameMapScreenRoadEntry(direction, currRoad);
                        currRoad = null;
                    }
                }

            }
            if(currRoad !== null) {
                this.#map.createGameMapScreenRoadEntry(direction, currRoad);
            }
        }
    }

    get() {
        return this.#map;
    }

}

class GameMapScreen {

    static tileTypes = {
        5:{'traversable':true, 'render': "rgb(0,255,166)", 'road':true},
        0:{'traversable':true, 'render': false, 'material':'path'},
        1:{'traversable':false, 'render': "rgba(74,52,155,1)",'material':'wall'},
        2:{'traversable':true, 'render': "rgb(34,34,34)", 'road':true, 'material': 'stairs'},
        3:{'traversable':true, 'render': "rgb(255,162,138)", 'material':'room'},
        'outofbounds':{'traversable':false, 'render': "rgb(0,0,0)", material:'outofbounds'},
    }
    static directions = ['left', 'right', 'up', 'down'];
    static opositeDirections = {
        'left':'right',
        'right':'left',
        'up':'down',
        'down':'up',
    }

    tiles = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
    ];
    width = 0;
    height = 0;

    actors = {};

    get size() {
        return {x: this.width, y: this.height};
    }


    teleportDirection = null;
    gameMapScreenRoadEntry = {'left':[], 'right':[], 'up':[], 'down':[]};
    islands = [];
    liearPaths = [];

    getRandomRoads(direction) {

        let result;
        if(direction) {
            result = this.gameMapScreenRoadEntry[direction].sort(() => Math.random() - Math.random());
        } else {
            result = Object.entries(this.gameMapScreenRoadEntry).filter(x => x[1].length > 0).map(x => x[1]).sort(() => Math.random() - Math.random()).flat();
        }

        return result;

    }
    getRandomIslands() {
        return islands.sort(() => Math.random() - Math.random());
    }


    createGameMapScreenRoadEntry(direction, tiles) {
        return this.addGameMapScreenRoadEntry(new GameMapScreenRoadEntry(this, tiles, direction));
    }
    addGameMapScreenRoadEntry(road) {
        this.gameMapScreenRoadEntry[road.direction].push(road);
        return road;
    }


    constructor(tiles) {

        if(tiles) {
            this.tiles = tiles.map(x => x.map(y => y));
        }

        this.height = this.tiles.length;
        if(this.height > 0) {
            this.width = this.tiles[0].length;
        }
    }

    static makeEmptyMap(size, tile = 0) {

        let tiles = [];
        for(let y = 0; y < size.y; y++) {
            tiles.push([]);
            for(let x = 0; x < size.x; x++) {
                tiles[y].push(tile);
            }
        }

        return new GameMapScreen(tiles);
    }

    findRoadEntries() {
        for(var direction of ['left', 'right', 'up', 'down']) {
            this.gameMapScreenRoadEntry[direction] = [];

            let currRoad = null;
            for(var i = 0; i < this.getMapLengthByDirection(direction); i++) {

                let cords = this.getTileCordsByDirection(direction, i);
                let tile = this.getTileByVector(cords);

                if(tile && tile.road) {
                    if(currRoad === null) {
                        currRoad = [];
                    }
                    currRoad.push(cords);
                } else {
                    if(currRoad !== null) {
                        this.createGameMapScreenRoadEntry(direction, currRoad);
                        currRoad = null;
                    }
                }

            }
            if(currRoad !== null) {
                this.createGameMapScreenRoadEntry(direction, currRoad);
            }
        }

    }

    getTile(x, y) {
        if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return GameMapScreen.tileTypes['outofbounds'];
        }

        return GameMapScreen.tileTypes[this.tiles[y][x]];
    }

    getTileIndex(cords) {
        if(cords.x < 0 || cords.x >= this.width || cords.y < 0 || cords.y >= this.height) {
            return false;
        }

        return this.tiles[cords.y][cords.x];
    }

    fill(material, start, end) {
        for(let x = start ? start.x : 0; x < (end ? end.x : this.width); x++) {
            for(let y = start ? start.y : 0; y < (end ? end.y : this.height); y++) {
                this.setTitle(x, y, material);
            }
        }
    }

    setTitle(x, y, title) {

        if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }

        this.tiles[y][x] = title;
    }

    setTileByVector(vector, tile) {
        this.setTitle(vector.x, vector.y, tile);
    }

    getTileByVector(vector) {
        return this.getTile(vector.x, vector.y);
    }

    isMapOk() {
        return this.width > 0 && this.height > 0;
    }

    getMapLengthByDirection(dir) {
        if(dir === 'left' || dir === 'right') {
            return this.height;
        } else {
            return this.width;
        }
    }

    getTileCordsByDirection(dir, pos, shift = 0) {

        if(dir === 'left') {
            return {x:shift, y:pos};
        }

        if(dir === 'right') {
            return {x:this.width - shift - 1, y:pos};
        }

        if(dir ==='up') {
            return {x:pos, y:shift};
        }

        if(dir ==='down') {
            return {x:pos, y:this.height - shift - 1};
        }
    }

    fillPoints(points, fill, exclude) {

        for(let point of points) {
            if(exclude !== undefined) {
                if(!exclude.includes(this.getTileIndex(point))) {
                    this.setTileByVector(point, fill);
                }
            } else {
                this.setTileByVector(point, fill);
            }
        }

    }

    addActor(actor, name) {

        if(name === undefined) {
            name = game.actorsIndex++;
        }

        if(actor) {
            this.actors[name] = actor;
            actor.init(game);
            return actor;
        }
    }

}

class MapManager {

    static mapShift = {left:{x:(-1), y:0}, right:{x:1, y:0}, up:{x:0, y:1}, down:{x:0, y:(-1)}};

    currentGameScreen;

    tiledMaps = {};
    currMapCoords = {x:0, y:0};


    getMap(cords) {

        if(this.tiledMaps[cords.x] === undefined) {
            this.tiledMaps[cords.x] = [];
        }

        return this.tiledMaps[cords.x][cords.y];

    }

    setMap(cords, map) {
        if(this.tiledMaps[cords.x] === undefined) {
            this.tiledMaps[cords.x] = [];
        }

        this.tiledMaps[cords.x][cords.y] = map;
    }

    getNearMap(direction, cords) {
        return this.getMap(addXY(cords, MapManager.mapShift[direction]));
    }


    getShiftedCords(cords, direction) {
        let mapShifts = {left:{x:(-1), y:0}, right:{x:1, y:0}, up:{x:0, y:1}, down:{x:0, y:(-1)}};
        return {x:cords.x + mapShifts[direction].x, y:cords.y + mapShifts[direction].y};

    }

    setupNPCS(map) {

        /*map.addActor((new EnemyActor(game.toMapSpace({x:getRandomInt(1, 15), y:getRandomInt(1,15)})))
            .setRenderable((new RenderableCharacter(null,'textures/characters.png'))
                .setStopAtFrame(1).setVariation(getRandomInt(0, 11)))
            .on('death', x => {
                map.addActor(game.actorsLib.get('healthPotion').setPos(addXY(x.getPos(), getRandomVec(20))));
                map.addActor(game.actorsLib.get('healthPotion').setPos(addXY(x.getPos(), getRandomVec(20))));
            }
                )
        );*/

        map.addActor(game.actorsLib.get('club').setPos(game.toMapSpace({x:getRandomInt(1, 15), y:getRandomInt(1,15)})));
    }

    moveToAMap(direction) {

        let nextMapCords = this.getShiftedCords(this.currMapCoords, direction);

        let existingMap = this.getMap(nextMapCords);

        if(existingMap !== undefined) {
            this.currentGameScreen = existingMap;
        } else {
            this.currentGameScreen = this.generateMapOnPosition(nextMapCords);
            //this.setupNPCS();
            this.setMap(nextMapCords, this.currentGameScreen);
        }
        this.currMapCoords = nextMapCords;

    }

    screenVariations = [
        [
            [1, 1, 1, 1, 1, 1],
            [1, 1, 0, 0, 1, 1],
            [2, 0, 0, 0, 0, 1],
            [2, 0, 0, 0, 0, 1],
            [1, 1, 0, 0, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
        ],

    ]

    generateBoundries(map, oldMap) {

        let directions = {
            'left':'right',
            'right':'left',
            'up':'down',
            'down':'up',
        }

        if(oldMap.teleportDirection) {
            let filteredDirections = {};
            filteredDirections[oldMap.teleportDirection] = directions[oldMap.teleportDirection];
            directions = filteredDirections;
        }

        for(let direction in directions) {

            for(let i = 0; i < map.getMapLengthByDirection(); i++) {
                let oldBorderPos = oldMap.getTileCordsByDirection(direction, i);
                let newBorderPos = map.getTileCordsByDirection(directions[direction], i);

                map.setTileByVector(newBorderPos, oldMap.getTileIndex(oldBorderPos));
            }

        }

        return map;

    }

    generate(source, skipBoundries = false) {
        let result = new GameMapScreen(source.tiles);

        result.fill(1);

        if(!skipBoundries) {
            result = this.generateBoundries(result, source);
        }

        result.findRoadEntries();

        MapBuilder.make(result)
            .addRoadOnUnoccupiedBorder(getRandomInt(1, 3))
            .addRoadOnUnoccupiedBorder(getRandomInt(1, 3))
            .connectRandomRoads(getRandomInt(1, 3))
            .addIsland(getRandomInt(5, 13))
            .connectLastTwo(getRandomInt(1, 6));


        return result;

    }

    resetMapFromCurrent(skipBoundries = false) {
        this.currentGameScreen = this.generate(this.currentGameScreen, skipBoundries);
    }

    getMapsAround(position) {

        let result = {};
        for(let direction of GameMapScreen.directions) {
            let map = this.getNearMap(direction, position);
            if(map) {
                result[direction] = map;
            }
        }

        return result;


    }

    generateMapOnPosition(position) {

        let self = this;

        return MapBuilder.make(GameMapScreen.makeEmptyMap(this.currentGameScreen.size, 0))
            .setMapsAround(this.getMapsAround(position))
            .copyBoundriesOnOpposites()
            .makeNoLessRoadsidesThen(4, {min:1,max:3})
            .connectRandomRoads(getRandomInt(1, 3))
            .addIsland(getRandomInt(5, 13))
            .connectLastTwo(getRandomInt(1, 6))
            .chance(1, (x) => self.setupNPCS(x))
            .get();


    }

    constructor() {

        this.currentGameScreen = GameMapScreen.makeEmptyMap({x:32, y:32});

        this.resetMapFromCurrent(true);
        this.setMap(this.currMapCoords, this.currentGameScreen);
    }

    isPointVisible(origin, target) {

        let points = getPointsOnLine(origin, target);
        let self = this;
        return points.every(x => self.currentGameScreen.getTileByVector(x).traversable);
    }

}

class Renderer {
    context = null;
    canvas = null;
    textureImageReady = false;

    canvasShift = {x:0, y:0};

    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
    }

    clearArea() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        this.clearArea();
    }

    getCanvasSize() {
        return {x:this.canvas.width, y: this.canvas.height};
    }

}

class MapRenderer extends Renderer {

    #tileWidth = null;
    #tileHeight = null;

    #mapdata = null;

    #texturepack = 'textures/colony-grounds-ready.png';
    #textureImage;

    pos = vecnull();

    get mapdata() {
        return this.#mapdata;
    }

    constructor(canvas, mapdata) {
        super(canvas);

        if(mapdata) {
            this.resetMapData(mapdata);
        }

        this.#textureImage = new Image();
        let self = this;
        this.#textureImage.onload = () => {self.textureImageReady = true;};

        this.#textureImage.src = this.#texturepack;


    }


    resetMapData(mapData) {
        this.#mapdata = mapData;

        this.#tileHeight = new animatedLinearParam(0, this.canvas.height / this.#mapdata.height, 20);
        this.#tileHeight.reset();

        if(this.#mapdata.height > 0) {
            this.#tileWidth = new animatedLinearParam(0, this.canvas.width / this.#mapdata.width, 20);
            this.#tileWidth.reset();
        }


    }

    render(time) {
        super.render();

        if (!this.mapdata.isMapOk()) {
            return false;
        }

        this.#tileHeight.animate(time);
        this.#tileWidth.animate(time);

        for(let y = 0; y < this.#mapdata.height; y++) {
            for(let x = 0; x < this.#mapdata.width; x++) {
                this.renderTile(x, y);
            }
        }
    }

    floorPattern(mapCords, material, materialData) {

        let neighbours = {};
        let edges = 0;
        let countAsSame =  [material, 'outofbounds'];
        neighbours['left'] = countAsSame.includes(this.#mapdata.getTile(mapCords.x-1, mapCords.y).material) ? 1 : 0;
        neighbours['right'] = countAsSame.includes(this.#mapdata.getTile(mapCords.x+1, mapCords.y).material) ? 1 : 0;
        neighbours['top'] = countAsSame.includes(this.#mapdata.getTile(mapCords.x, mapCords.y+1).material) ? 1 : 0;
        neighbours['bottom'] = countAsSame.includes(this.#mapdata.getTile(mapCords.x, mapCords.y-1).material) ? 1 : 0;

        edges = Object.values(neighbours).reduce((n, x) => n + (x === 1), 0);

        let direction = materialData.inversed ? -1 : 1;

        let blckPos = {
            x:(materialData.startBlock.x - direction * (neighbours['right'] - neighbours['left'])),
            y:(materialData.startBlock.y - direction * (neighbours['top'] - neighbours['bottom']))
        };

        return {
            x:this.blocksize * blckPos.x,
            y:this.blocksize * blckPos.y,
        };


    }

    directionalPattern(mapCords, material, materialData) {

        if(mapCords.x === 0) {
            return materialData['left'];
        }

        if(mapCords.y === 0) {
            return materialData['up'];
        }

        if(mapCords.x >= this.mapdata.width - 1) {
            return materialData['right'];
        }

        if(mapCords.y >= this.mapdata.height - 1) {
            return materialData['down'];
        }

        return materialData['default'];

    }

    materials = {
        'path': {startBlock:{x:0,y:5}, endBlock:{x:2, y:6}},
        'room': {startBlock:{x:1,y:1}, patter:'floorPattern'},
        'wall': {startBlock:{x:10,y:1}, patter:'floorPattern', inversed:true},
        'stairs': {startBlock:{x:10,y:1}, patter:'directionalPattern', default:{x:6,y:5}, left:{x:10,y:6}, right:{x:11,y:6}, up:{x:6,y:5}, down:{x:6,y:5}},
    }
    blocksize = 16;

    getMaterialBlock(materialData, x, y) {
        let xRange = materialData.endBlock.x -materialData.startBlock.x;
        let yRange = materialData.endBlock.y -materialData.startBlock.y;

        let hash = Math.abs(hashString(`${x}-${y}`));

        let Resx = this.blocksize * (materialData.startBlock.x + hash % xRange);
        let Resy = this.blocksize * (materialData.startBlock.y + hash % yRange);

        return {x:Resx, y:Resy};

    }

    renderMaterialTile(material,x ,y, tileWidth, tileHegiht, mapCords) {

        let materialData = this.materials[material];

        if(materialData) {
            let block;

            switch(materialData.patter) {
                case 'floorPattern': {
                    block = this.floorPattern(mapCords, material, materialData);break;
                }
                case 'directionalPattern': {
                    block = vecScale(this.directionalPattern(mapCords, material, materialData), this.blocksize);break;
                }
                default: {
                    block = this.getMaterialBlock(materialData,x, y); break;
                }
            }

            this.context.drawImage(this.#textureImage, block.x, block.y, this.blocksize, this.blocksize, x, y, tileWidth, tileHegiht);
        }



    }

    renderTile(x, y) {
        const value = this.#mapdata.getTileByVector(vecSub({x:x, y:y}, this.pos));

        let canvasX = x * this.#tileWidth.getToVal();
        let canvasY = y * this.#tileHeight.getToVal();
        let tileWidth = this.#tileWidth.get();
        let tileHeight = this.#tileHeight.getToVal();

        if(value && value.render) {
            this.context.fillStyle = value.render;
            this.context.fillRect(canvasX, canvasY, tileWidth, tileHeight);
        }

        if(value && value.material && this.textureImageReady) {
            this.renderMaterialTile(value.material, canvasX, canvasY, tileWidth, tileHeight, {x:x, y:y});

        }

    }

}

class ContiniousMapRenderer extends Renderer{

    resource;
    tiles = [];
    scale = 1;
    position = {x:0, y:0};

    tileset = {
        1: {bg:'9', texture:'green.tl'},
        2: {bg:'green.bg', texture:'green.tr'},
        3: {bg:'green.bg', texture:'green.tm'},
        4: {bg:'green.bg', texture:'green.twall.1'},
        5: {bg:'green.bg', texture:'green.deep'},
        6: {bg:'green.bg', texture:'green.edger'},
        7: {bg:'green.bg', texture:'green.edgel'},
        8: {bg:'green.bg', texture:'green.edget'},
        9: {bg:'green.bg', texture:'green.rubble.1'},
        10: {bg:'green.bg', texture:'green.rockl'},
        11: {bg:'green.bg', texture:'green.rockm'},
        12: {bg:'green.bg', texture:'green.rockr'},
        13: {bg:'green.bg', texture:'green.bl'},
        14: {bg:'green.bg', texture:'green.bm'},
        15: {bg:'green.bg', texture:'green.br'},
        16: {bg:'green.bg', texture:'green.ml'},
        17: {bg:'green.bg', texture:'green.mm'},
        18: {bg:'green.bg', texture:'green.mr'},



    };

    getTile(vec) {
        return this.tiles?.[vec.x]?.[vec.y];
    }

    getMapSize() {
        return vecMul(vecScale(this.resource.gridSize, this.scale), {x:this.tiles.length, y:this.tiles[0].length});
    }

    getRenderStartPosition() {
        return vecClamp({x:0, y:0}, this.getMapSize(), this.position);
    }

    constructor(canvas, resource) {
        super(canvas);
        this.resource = resource;

        for(let x = 0; x < 100; x++) {
            this.tiles.push([]);
            for(let y = 0; y < 100; y++) {
                this.tiles[x].push(getRandomInt(1, 3));
            }
        }

        let paintbrush = new TerrainPaintbrush(this.tiles, this.tileset);

        paintbrush
            //.squareFloorPattern({x:3, y:0}, {x:7, y:1}, 'green')
            .fill({x:0, y:0}, {x:10, y:10}, 'green', 'rubble.1')
            .inset({x:2, y:0}, {x:7, y:3}, 'green')
            .fill({x:3, y:2}, {x:7, y:2}, 'green', 'twall.1')




        /*this.tiles[3][1] = 13;
        this.tiles[4][1] = 14;
        this.tiles[5][1] = 14;
        this.tiles[6][1] = 14;
        this.tiles[7][1] = 15;

        this.tiles[3][0] = 16;
        this.tiles[4][0] = 17;
        this.tiles[5][0] = 17;
        this.tiles[6][0] = 17;
        this.tiles[7][0] = 18;*/


        /*this.tiles[3][2] = 10;
        this.tiles[4][2] = 4;
        this.tiles[5][2] = 4;
        this.tiles[6][2] = 4;
        this.tiles[7][2] = 11;*/


        this.tiles[2][0] = 6;
        this.tiles[2][1] = 6;
        this.tiles[2][2] = 6;
        this.tiles[2][3] = 9;


        this.tiles[8][0] = 7;
        this.tiles[8][1] = 7;
        this.tiles[8][2] = 7;
        this.tiles[8][3] = 9;




        this.tiles[3][3] = 9;
        this.tiles[4][3] = 9;
        this.tiles[5][3] = 9;
        this.tiles[6][3] = 9;
        this.tiles[7][3] = 9;


        this.tiles[4][4] = 4;
        this.tiles[5][4] = 4;
        this.tiles[6][4] = 4;
        this.tiles[4][5] = 5;
        this.tiles[5][5] = 5;
        this.tiles[6][5] = 5;


        this.tiles[3][6] = 9;
        this.tiles[4][6] = 8;
        this.tiles[5][6] = 8;
        this.tiles[6][6] = 8;
        this.tiles[7][6] = 9;


        this.tiles[3][4] = 6;
        this.tiles[3][5] = 6;

        this.tiles[7][4] = 7;
        this.tiles[7][5] = 7;

    }

    render() {
        super.render();
        if(this.resource.isReady) {

            this.context.translate(-this.canvasShift.x, -this.canvasShift.y);
            let canvasSize = this.getCanvasSize();

            for(let x = 0; x <= this.tiles[0].length; x++) {
                for(let y = 0; y <= this.tiles.length; y++) {
                    const currTilePos = {x:x, y:y}
                    const pictPos = vecMul(currTilePos, vecScale(this.resource.gridSize, this.scale));
                    const convShifted = vecSub(this.canvasShift, this.resource.gridSize);
                    if(pictPos.x < convShifted.x || pictPos.x > this.canvasShift.x + canvasSize.x || pictPos.y < convShifted || pictPos.y > this.canvasShift.y + canvasSize.y) {
                        continue;
                    }

                    const tile = this.tileset[this.getTile(currTilePos)];

                    this.resource.drawFrameInContext(this.context, tile?.bg, pictPos, 0, this.scale);
                    this.resource.drawFrameInContext(this.context, tile?.texture, pictPos, 0, this.scale);
                }
            }

            this.context.translate(this.canvasShift.x, this.canvasShift.y);

        }

    }


}


class RenderableItem {

    resource;
    requestedResource;
    itemPos = {x:0, y:0};

    init(renderer) {
        this.renderer = renderer;
        if(renderer) {
            this.resource = renderer.resourceLoadManager.getResource(this.requestedResource);
        }
    }

    constructor(requestedResource) {
        this.requestedResource = requestedResource;
    }

    draw(time, renderer) {

    }

    isReadyToDraw() {
        return !!this.resource?.isReady;
    }

    drawInContext(blockSize, blockPos, pictPos, scale = 1.0, angle = undefined) {

        if(angle && angle !== 0) {
            let shiftx = pictPos.x + (blockSize.x * scale) / 2;
            let shifty = pictPos.y + (blockSize.y * scale) / 2;

            this.renderer.context.translate(shiftx, shifty);
            this.renderer.context.rotate(angle * (Math.PI / 180));
            this.renderer.context.translate(-shiftx, -shifty);
            this.renderer.context.drawImage(this.resource.get(), blockPos.x, blockPos.y, blockSize.x, blockSize.y, pictPos.x, pictPos.y, blockSize.x * scale, blockSize.y * scale);
            this.renderer.context.setTransform(1,0,0,1,0,0)
        } else {
            this.renderer.context.drawImage(this.resource.get(), blockPos.x, blockPos.y, blockSize.x, blockSize.y, pictPos.x, pictPos.y, blockSize.x * scale, blockSize.y * scale);
        }

    }

    setItemPos(pos) {
        this.itemPos = pos;
        return this;
    }

}

class staticRenderabeItem extends RenderableItem{

    animationName;
    animationFrame;
    scale = 1.0;
    angle = 0;

    init(renderer) {
        super.init(renderer);
    }

    constructor(requestedResource) {
        super(requestedResource);
    }

    setAnimationName(animationName) {
        this.animationName = animationName;
        return this;
    }

    setAnimationFrame(animationFrame) {
        this.animationFrame = animationFrame;
        return this;
    }

    setScale(scale) {
        this.scale = scale;
        return this;
    }

    setAngle(scale) {
        this.angle = angle;
        return this;
    }



    draw(time, renderer) {
        super.draw(time, renderer);
        this.resource.drawFrameInContext(this.renderer.context, this.animationName, this.itemPos, this.animationFrame, this.scale, this.angle);
    }

}

class AnimatedRenderableItem extends RenderableItem{
    frames = [];
    animationTime = 1000;
    currTime = 0.0;
    scaleCoeff = 0.8;
    blockSize = {x:16,y:16};
    rotation = 0;
    requestedAnimation = Animation.linear;
    requestedAnim = null;
    isAnimDone = false;

    init(renderer) {
        super.init(renderer);
        if(this.requestedAnim) {
            this.frames = this.resource.animations[this.requestedAnim];
            this.blockSize = this.resource.animationSizes[this.requestedAnim];
        }
    }

    constructor(requestedResource = undefined) {
        super(requestedResource);
    }

    getCurrFrameIndex(time) {

        this.currTime += time;

        if(this.currTime >= this.animationTime) {
            this.isAnimDone = true;
        }

        return this.requestedAnimation(this.currTime, this.animationTime, this.frames.length);

    }

    generateFramesFromStrip(first, shift, count) {

        let arr = [first];
        for(let i = 0; i < count; i++) {
            arr.push({x:first.x + shift * i, y:first.y});
        }

        return arr;

    }

    setAnimTime(animTime) {
        this.animationTime = animTime;
        return this;
    }

    setAnim(animName, animRule = undefined) {

        this.requestedAnim = animName;
        if(this.resource) {
            this.frames = this.resource.animations[this.requestedAnim];
            this.blockSize = this.resource.animationSizes[this.requestedAnim];
        }

        if(animRule) {
            this.requestedAnimation = animRule;
        }
        return this;
    }

    setFramesFromStrip(first, shift, count) {
        this.frames = this.generateFramesFromStrip(first, shift, count);
        return this;
    }

    setBlockSize(blockSize) {
        this.blockSize = blockSize;
        return this;
    }

    setScale(scale) {
        this.scaleCoeff = scale;
        return this;
    }

    setRotation(rotation) {
        this.rotation = rotation;
        return this;
    }

    reset(frames = 0) {
        this.currTime = 0;
        this.frames = frames;
        this.isAnimDone = false;
    }

    draw(time, renderer) {
        if(this.frames.length) {
            let currFrameIndex = this.getCurrFrameIndex(time);

            this.drawInContext(this.blockSize, this.frames[currFrameIndex], this.itemPos, this.scaleCoeff, this.rotation);
        }
    }

}

class RenderablePlayer extends AnimatedRenderableItem {

    actor;

    blockPos = {x: 6, y:12};
    blockSize = {x:16, y:20};

    framesMoveRight;
    framesMoveLeft;
    framesIdle;

    constructor(actor) {
        super('textures/adventurer.png');
        this.actor = actor;

        this.framesMoveRight = this.generateFramesFromStrip({x:5, y:42}, 32, 8);
        this.framesMoveLeft = this.generateFramesFromStrip({x:7, y:298}, 32, 8);
        this.framesIdle = this.generateFramesFromStrip({x:5, y:10}, 32, 13);

    }

    init(renderer) {
        super.init(renderer);
    }

    draw(time, renderer) {
        this.itemPos = this.actor;

        if(this.actor.moveDirection.x > 0) {
            this.frames = this.framesMoveRight;
        } else if(this.actor.moveDirection.x < 0) {
            this.frames = this.framesMoveLeft;
        } else if(this.actor.moveDirection.y !== 0) {
            this.frames = this.framesMoveRight;
        } else {
            this.frames = this.framesIdle;
        }

        super.draw(time, renderer);
    }

}

class RenderableCharacter extends RenderableItem{

    actor;
    variation = 0;
    stopAtFrame = null;

    blockPos = {x: 0, y:0};
    blockSize = {x:16, y:18};

    animTime;

    setVariation(variation) {
        this.variation = variation;
        return this;
    }

    setStopAtFrame(frame) {
        this.stopAtFrame = frame;
        return this;
    }

    constructor(actor, resName = undefined) {
        super(resName);
        this.actor = actor;
        this.resName = resName;

        this.animTime = new animatedLinearParam(0, 3, 100, 0);

    }

    init(renderer) {
        super.init(renderer);
    }

    draw(time, renderable) {

        this.animTime.animate(time);

        if(this.resource && this.resource.isReady) {
            let scaleCoeff = 1;

            let poseShift = 0;
            if(this.actor.lookAt.y === 1 || (this.actor.lookAt.y === 0 && this.actor.lookAt.x === 0)) {
                poseShift = 2;
            } else if(this.actor.lookAt.x === 1) {
                poseShift = 1;
            } else if(this.actor.lookAt.x === -1) {
                poseShift = 3;
            }

            let variantShiftX = this.variation % 6;
            let variantShiftY = Math.floor(this.variation/6);
            let variangBlockSize = {x:3, y:4};

            let animBlockShift = this.stopAtFrame !== null ? this.stopAtFrame : Math.floor(this.animTime.get());

            if(animBlockShift >= 3) {
                this.animTime.reset();
                animBlockShift = 2;
            }

            this.renderer.context.drawImage(this.resource.get(),
                this.blockPos.x + (animBlockShift + variantShiftX * variangBlockSize.x) * this.blockSize.x, this.blockPos.y + (poseShift + variantShiftY * variangBlockSize.y) * this.blockSize.y,
                this.blockSize.x, this.blockSize.y,
                this.actor.x, this.actor.y,
                this.blockSize.x * scaleCoeff, this.blockSize.y * scaleCoeff);
        }
    }

}

class Dialog {

    asDialogOption() {
        return {text:'Speak with Solie'};
    }

}

class ManagedResource {

    #name;
    resource = null;
    #isReady = false;

    get isReady() {return this.#isReady;}
    get name() {return this.#name};

    constructor(name) {
        this.#name = name;
    }

    get() {
        return this.resource;
    }

    load() {}
    setReady() {this.#isReady = true;};


}

class TexturePackResource extends ManagedResource {

    load() {
        this.resource = new Image();
        let self = this;
        this.resource.onload = () => {self.setReady()};
        this.resource.src = this.name;
    }

    animations = {};
    animationSizes = {};
    gridSize = null;
    gridSpacing = {x:0, y:0};

    findAnimationsByNameStart(nameStart) {
        return Object.keys(this.animations).filter(x => x.startsWith(nameStart));
    }

    setGridSize(gridSize) {
        this.gridSize = gridSize;
        return this;
    }
    setGridSpacing(gridSpacing) {
        this.gridSpacing = gridSpacing;
        return this;
    }

    getFrame(animationName, frameIndex) {
        if(this.animations[animationName]) {
            if(this.gridSize !== null) {
                return {pos: vecMul(this.animations[animationName][frameIndex], addXY(this.gridSize, this.gridSpacing)), size: this.gridSize};
            } else {
                return {pos: vecMul(this.animations[animationName][frameIndex], this.animationSizes[animationName]), size: this.gridSize};
            }
        } else {
            return null;
        }
    }

    addNamedFrames(name, size, frames) {
        this.animations[name] = frames;
        this.animationSizes[name] = size;
        return this;
    }

    addNamedFrame(name, frame, size = undefined) {
        this.animations[name] = [frame];
        if(size) {
            this.animationSizes[name] = size;
        }
        return this;
    }

    drawInContext(context, blockSize, blockPos, pictPos, scale = 1.0, angle = undefined) {

        if(angle && angle !== 0) {
            let shiftx = pictPos.x + (blockSize.x * scale) / 2;
            let shifty = pictPos.y + (blockSize.y * scale) / 2;

            context.translate(shiftx, shifty);
            context.rotate(angle * (Math.PI / 180));
            context.translate(-shiftx, -shifty);
            context.drawImage(this.get(), blockPos.x, blockPos.y, blockSize.x, blockSize.y, pictPos.x, pictPos.y, blockSize.x * scale, blockSize.y * scale);
            context.setTransform(1,0,0,1,0,0)
        } else {
            context.drawImage(this.get(), blockPos.x, blockPos.y, blockSize.x, blockSize.y, pictPos.x, pictPos.y, blockSize.x * scale, blockSize.y * scale);
        }

    }

    drawFrameInContext(context, animationName, pictPos, frame = 0, scale = 1, angle = 0) {
        let frameVal = this.getFrame(animationName, frame);
        if(frameVal) {
            this.drawInContext(context, frameVal.size, frameVal.pos, pictPos, scale, angle);
        }
    }

}

class ResourceLoadManager {

    #managedResources = {};

    addResource(resource) {
        this.#managedResources[resource.name] = resource;
        return resource;
    }

    load() {
        Object.values(this.#managedResources).forEach(x => x.load());
    }

    getReadyCount() {
        Object.values(this.#managedResources).reduce(function(n, val) {return n + (val.isReady)}, 0);
    }

    getResourcesCount() {
        return Object.values(this.#managedResources).length;
    }

    listResources() {
        return Object.keys(this.#managedResources);
    }

    getResource(name) {
        return this.#managedResources[name];
    }

    isReady() {
        return Object.values(this.#managedResources).every(x => x.isReady);
    }



}

class ActorsRrenderer extends Renderer {

    actorsGetter;

    resourceLoadManager;

    constructor(canvas, resourceLoadManager, actors) {
        super(canvas);
        this.resourceLoadManager = resourceLoadManager;
        this.actorsGetter = actors;
    }

    render(time) {
        super.render();
        let actors = this.actorsGetter();

        this.context.translate(-this.canvasShift.x, -this.canvasShift.y);

        for(let actorName in actors) {
            let actorsRenderable = actors[actorName].renderable;
            if(actorsRenderable && actorsRenderable.isReadyToDraw()) {
                actorsRenderable.draw(time, this);
            }
        }

        this.context.translate(this.canvasShift.x, this.canvasShift.y);
        //this.context.drawImage(this.#textureImage, blockPos.x, blockPos.y, blockSize.x, blockSize.y, this.#x, this.#y, blockSize.x * scaleCoeff, blockSize.y * scaleCoeff);


    }


}


class UIRenderer extends Renderer {
    #resource;

    variants = {};
    currVarriant = {};
    currentUIOptions = [];
    currPos = 0;

    constructor(canvas, resource) {
        super(canvas);
        this.#resource = resource;

        this.fetchElementVariants('double');
        this.fetchElementVariants('gems');
    }

    fetchElementVariants(stylename) {
        this.variants[stylename] = {};
        this.currVarriant[stylename] = {};

        for (let elem of ['top', 'bottom', 'left', 'right', 'center', 'tl', 'tr', 'bl', 'br']) {
            this.variants[stylename][elem] = this.#resource.findAnimationsByNameStart(`${stylename}.${elem}`).map(x => x.split('.')[2]).filter(x => x !== undefined);
            this.currVarriant[stylename][elem] = (this.variants[stylename][elem].length > 0) ? 0 : null;
        }
    }

    resetCurrVariant() {
        for(let style in this.currVarriant) {
            for(let block in this.currVarriant[style]) {
                if(this.currVarriant[style][block] !== null) {
                    this.currVarriant[style][block] = 0;
                }
            }
        }
    }

    drawBoxElement(stylename, blockname, pictPos) {
        let animationName = [stylename, blockname];

        if(this.currVarriant[stylename][blockname] !== null && this.currVarriant[stylename][blockname] !== undefined) {
            this.currVarriant[stylename][blockname]++;
            if(this.currVarriant[stylename][blockname] >= this.variants[stylename][blockname].length) {
                this.currVarriant[stylename][blockname] = 0;
            }
            animationName.push(this.variants[stylename][blockname][this.currVarriant[stylename][blockname]]);
        }

        this.#resource.drawFrameInContext(this.context, animationName.join('.'), pictPos);
    }

    drawBox(start, end, options) {

        let determineBlockStyle = block => options?.styles?.[block] ? options?.styles?.[block] : 'double';
        let determineBlockName = block => options?.blocks?.[block] ? options?.blocks?.[block] : block;
        let drawOnPos = (block, pos) => {let blk = determineBlockName(block); this.drawBoxElement(determineBlockStyle(blk), blk, pos);};

        if(!(options?.excludeCenter)) {
            for(let x = start.x; x < end.x; x += this.#resource.gridSize.x) {
                for(let y = start.y; y < end.y; y += this.#resource.gridSize.y) {
                    drawOnPos('center', {x:x, y:y});
                }
            }
        }

        for(let x = start.x; x < end.x; x += this.#resource.gridSize.x) {
            drawOnPos('top', {x:x, y:start.y});
            drawOnPos('bottom', {x:x, y:end.y});
        }

        for(let y = start.y; y < end.y; y += this.#resource.gridSize.y) {
            drawOnPos('left', {x:start.x, y:y});
            drawOnPos('right', {x:end.x, y:y});
        }

        drawOnPos('tl', start);
        drawOnPos('tr', {x:end.x, y:start.y});
        drawOnPos('bl', {x:start.x, y:end.y});
        drawOnPos('br', end);

    }

    drawText() {

        if(this.currentUIOptions) {

            if (this.currentUIOptions.length <= 0) {
                return;
            }

            this.context.font = "16px arcadeclassic";

            for (let i = 0; i < this.currentUIOptions.length; i++) {
                if (this.currPos === i) {
                    this.context.fillStyle = "#ffffff";
                    this.context.fillText('>', 20, 526 + 16 * 2 + i * 16);
                    this.context.fillText(this.currentUIOptions[i].text, 32, 526 + 16 * 2 + i * 16);
                } else {
                    this.context.fillStyle = "#e2e2e2";
                    this.context.fillText(this.currentUIOptions[i].text, 32, 526 + 16 * 2 + i * 16);
                }
            }
        }


    }

    fillText(text, pos, fillStyle = "#ffffff", font = "16px arcadeclassic") {
        this.context.fillStyle = fillStyle;
        this.context.fillText(text, pos.x, pos.y);
    }

    getSelectedOptionId() {
        return this.currentUIOptions.findIndex(x => x.selected);
    }

    shiftSelectedOption(shift) {
        if(this.currentUIOptions.length > 0 && shift !== 0) {
            let currSelected = this.getSelectedOptionId();
            this.currentUIOptions[currSelected].selected = false;
            this.currentUIOptions[(this.currentUIOptions.length + currSelected + shift) % this.currentUIOptions.length].selected = true;
        }
    }

    selectCurrent() {
        if(this.currentUIOptions.length) {
            let currSelected = this.getSelectedOptionId();
            if(this.currentUIOptions[currSelected].action) {
                this.currentUIOptions[currSelected].action();
            }
        }
        return true;
    }

    render(time) {
        if(this.#resource.isReady) {
            this.resetCurrVariant();

            this.drawBox({x:0, y:0}, {x:512 + 16, y:512 + 16}, {excludeCenter:true});
            this.renderLeftPannel({x:512 + 16, y:0}, {x:128, y:512 + 16})
            this.drawBox({x:0, y:512 + 16}, {x:512 + 16, y:512 + 16 + 128}, {styles:{top:'gems'}, blocks:{tl:'tlv', tr:'cross'}});

            this.drawText();
        }
    }

    renderLeftPannel(pos, size) {

        this.drawBox(pos, addXY(pos, size), {blocks:{tl:'tlh'}});

        let res = game.resourceLoadManager.getResource('textures/UI/icons.png');

        let hpshift = {x:20, y:20};

        res.drawFrameInContext(this.context, 'health', addXY(pos, hpshift), 0, 0.30);

        this.fillText(game.player.health, addXY(pos, addXY(hpshift, {x:12, y:9})), '#ffffff', '64px arcadeclassic');

    }

}

class ActorExtension {

    #name;
    #actor;

    constructor(name) {
        this.#name = name;
    }

    setActor(actor) {
        this.#actor = actor;
        return this;
    }

    get name() {
        return this.#name;
    }

    get actor() {
        return this.#actor;
    }

}

class InventoryExtension extends ActorExtension {

    inventorySize = 0;
    items = [];

    constructor(inventorySize) {
        super('inventory');
        this.inventorySize = inventorySize;
    }

    setInventorySize(inventorySize) {
        this.inventorySize = inventorySize;
        return this;
    }

    addToSlot(slotId, item) {
        if(!Number.isInteger(slotId) || slotId < 0 || slotId >= this.inventorySize) {
            return false;
        }

        if((this.items)[slotId]) {
            return false;
        } else {
            (this.items)[slotId] = item;
            return true;
        }
    }

    getEmptySlotId() {
        for(let i = 0; i < this.inventorySize; i++) {
            if(!((this.items)[i])) {
                return i;
            }
        }
        return null;
    }

    addToEmptySlot(item) {
        return this.addToSlot(this.getEmptySlotId(), item);
    }

    getItemInSlot(slot) {

        if(!Number.isInteger(slot) || slot < 0 || slot >= this.inventorySize) {
            return null;
        }

        return this.items[slot];
    }

    removeItemFromSlot(slot) {
        if(!Number.isInteger(slot) || slot < 0 || slot >= this.inventorySize) {
            return null;
        }

        let item = this.items[slot];
        this.items[slot] = null;
        return item;
    }

    getItems() {
        return this.items;
    }

}

class Actor {

    x;
    y;
    name;

    callbacks = {};
    on(callback, method, condition = x => true) {
        if(!this.callbacks[callback]) {this.callbacks[callback] = [];}
        this.callbacks[callback].push({condition:condition, callback:method});
        return this;
    }
    fireCallback(callback, param = null) {
        if(this.callbacks[callback] && this.callbacks[callback].length > 0) {
            for(let method of this.callbacks[callback]) {
                if(method.condition(this, param)) {
                    method.callback(this, param);
                    return true;
                }
            }
        }
    }

    extensions = {};
    addExtension(extension) {
        this.extensions[extension.name] = extension;
        extension.setActor(this);
    }

    hasExtension(name) {
        return this.getExtension(name) !== undefined;
    }

    getExtension(name) {
        return this.extensions[name];
    }




    #actorRenderer;
    renderable;
    dialog;
    #game;

    #shouldBeRemoved = false;

    setName(name) {
        this.name = name;
        return this;
    }

    get shouldBeRemoved() {
        return this.#shouldBeRemoved;
    }

    markForRemoval() {
        this.#shouldBeRemoved = true;
    }

    resetRemovalMark() {
        this.#shouldBeRemoved = false;
        return this;
    }


    getPos() {
        return {x:this.x, y:this.y};
    }

    get actionRenderer() {
        return this.#actorRenderer;
    }

    get game() {
        return this.#game;
    }

    init(game) {
        this.#game = game;
        this.#actorRenderer = game.actorsRenderer;
        game.loop.addActor(this);

        if(this.renderable) {
            this.renderable.init(game.actorsRenderer);
        }

    }

    setRenderable(renderable) {
        renderable.actor = this;
        this.renderable = renderable;
        renderable.setItemPos(this);
        return this;
    }


    constructor(pos = {x:0, y:0}) {
        this.x = pos.x;
        this.y = pos.y;
    }

    setPos(vect) {
        this.x = vect.x;
        this.y = vect.y;

        return this;
    }

    setDialog(dialog) {
        this.dialog = dialog;
        return this;
    }

    frame(delta) {

    }

}

class MovableActor extends Actor {

    keyboardControllable = false;

    #speed = 100;
    #keyboad;
    #noclip = false;
    #mapManager;
    moveDirection = {x:0, y:0};
    lookAt = {x:0, y:0};
    size = {x:8, y:10};
    collidedWith = null;


    set speed(speed) {this.#speed = speed;}
    get speed() {return this.#speed;}

    set mapManager(mapManager) {this.#mapManager = mapManager;}

    set keyboard(keyboard) {this.#keyboad = keyboard;}
    get keyboard() {return this.#keyboad;}

    constructor(pos) {
        super(pos);
    }

    init(game) {
        super.init(game);

        this.keyboard = game.keyboard;
        this.mapManager = game.mapManager;
    }

    setMoveDirection(moveDirection) {
        this.moveDirection = moveDirection;
        return this;
    }

    setSpeed(speed) {
        this.speed = speed;
        return this;
    }

    setNoclip(noclip) {
        this.#noclip = noclip;
        return this;
    }

    getMoveVector() {

        let dirX = 0;
        let dirY = 0;

        if(this.#keyboad) {

            dirX = (this.#keyboad.isCommandActive('moveRight') ? 1 : 0) - (this.#keyboad.isCommandActive('moveLeft') ? 1 : 0);
            dirY = (this.#keyboad.isCommandActive('moveDown') ? 1 : 0) - (this.#keyboad.isCommandActive('moveUp') ? 1 : 0);

            this.moveDirection = {x: dirX, y:dirY};
            if(this.moveDirection.x !== 0 || this.moveDirection.y !== 0) {
                this.lookAt = this.moveDirection;
            }

            const len = Math.sqrt(dirX * dirX + dirY * dirY);
            if(len === 0) {return {x:0, y:0};}

            return {x:dirX / len, y:dirY / len};

        }

    }

    getMapCords(x, y) {

        return {
            x: Math.floor((x === undefined ? this.x : x) / (this.actionRenderer.canvas.width / this.#mapManager.currentGameScreen.width)),
            y: Math.floor((y === undefined ? this.y : y) / (this.actionRenderer.canvas.height / this.#mapManager.currentGameScreen.height)),
        }

    }

    getMapCordsVec(vec) {
        return this.getMapCords(vec.x, vec.y);
    }


    checkBoxCollision(screenCordX, screenCordY) {
        return this.#mapManager.currentGameScreen.getTileByVector(this.getMapCords(screenCordX, screenCordY)).traversable &&
            this.#mapManager.currentGameScreen.getTileByVector(this.getMapCords(screenCordX + this.size.x, screenCordY + this.size.y)).traversable &&
            this.#mapManager.currentGameScreen.getTileByVector(this.getMapCords(screenCordX, screenCordY + this.size.y)).traversable &&
            this.#mapManager.currentGameScreen.getTileByVector(this.getMapCords(screenCordX + this.size.x, screenCordY)).traversable;

    }


    checkBoxCollisionVector(pos, size) {

        let selfPos = this.getPos();

        return selfPos.x + this.size.x > pos.x && pos.x + size.x > selfPos.x && selfPos.y + this.size.y > pos.y && pos.y + size.y > selfPos.y;
    }


    frame(delta) {

        if(Math.abs(this.x) > 1000 || Math.abs(this.y) > 1000) {
            this.markForRemoval();
        }

        let vector = this.moveDirection;

        if(this.keyboardControllable) {
            vector = this.getMoveVector();
        }

        let newScreenX = this.x + (vector.x * this.#speed) * (delta / 1000);
        let newScreenY = this.y + (vector.y * this.#speed) * (delta / 1000);

        if (this.checkBoxCollision(newScreenX, newScreenY) || this.#noclip) {
            this.x = newScreenX;
            this.y = newScreenY;
            this.collidedWith = null;
        } else if (this.checkBoxCollision(this.x, newScreenY)) {
            this.y = newScreenY;
            this.collidedWith = {x: this.x, y:this.y};
        } else if (this.checkBoxCollision(newScreenX, this.y)) {
            this.x = newScreenX;
            this.collidedWith = {x: this.x, y:this.y};
        } else {
            this.collidedWith = {x: newScreenX, y:newScreenY};
        }


        super.frame(delta);
    }

}

class ProjectileActor extends MovableActor{

    damage = 10;
    projectileAuthor;
    active = true;

    delayAnimTime = false;
    delayAnim = false;
    lifetime = null;

    constructor(projectileAuthor) {
        super(projectileAuthor.getPos());
        this.projectileAuthor = projectileAuthor;
        this.setMoveDirection(projectileAuthor.lookAt)
            .setNoclip(false);
    }


    setDelayAnim(delayAnim, delayAnimTime) {
        this.delayAnim = delayAnim;
        this.delayAnimTime = delayAnimTime;
        return this;
    }

    setLifeTime(lieftime) {
        this.lifetime = lieftime;
        return this;
    }


    setRenderable(renderable) {
        super.setRenderable(renderable);
        this.renderable.setRotation(angleFromVec(this.moveDirection));
        return this;
    }

    goToInactiveState(affectedActor) {

        if (affectedActor) {
            affectedActor.inflictDamage(this.damage);
        }

        this.active = false;
        this.renderable.reset();
        this.setMoveDirection({x:0, y:0});
        this.renderable.setAnim('redStarDeath', Animation.linearNoRepeat).setAnimTime(300);
    }

    setDamage(damage) {
        this.damage = damage;
        return this;
    }

    frame(delta) {
        super.frame(delta);

        if(this.delayAnimTime > 0) {
            this.delayAnimTime -= delta;
            return;
        }


        if(this.active) {
            for (let index in this.game.lastFullActors) {
                let actor = this.game.lastFullActors[index];
                if (actor !== this && actor !== this.projectileAuthor && actor.size !== undefined && actor instanceof BreakableActor) {
                    if (this.checkBoxCollisionVector(actor.getPos(), actor.size)) {
                        this.goToInactiveState(actor);
                        break;
                    }
                }
            }

            if(this.collidedWith !== null) {
                this.game.mapManager.currentGameScreen.setTileByVector(this.getMapCordsVec(this.collidedWith), 0);
                this.goToInactiveState(null);
            }

            if(this.lifetime !== null) {
                if(this.lifetime > 0) {
                    this.lifetime -= delta;
                } else {
                    this.goToInactiveState(null);
                }
            }


        } else if(this.renderable.isAnimDone) {
            this.markForRemoval();
        }

    }
}

class BreakableActor extends MovableActor {

    health = 100;
    maxHealth = 100;

    setMaxHealth(maxHealth) {
        this.maxHealth = maxHealth;
        return this;
    }

    setHealth(health) {
        this.health = health;
        return this;
    }

    inflictDamage(damage) {
        this.health -= damage;

        if(this.health <= 0) {if(!this.shouldBeRemoved) {this.markForRemoval(); this.fireCallback('death');} this.health = 0;}
        if(this.health > this.maxHealth) {this.health = this.maxHealth;}
        return this;

    }

    get health() {
        return this.health;
    }

    constructor(pos) {
        super(pos);
    }

    init(game) {
        super.init(game);

    }

    frame(delta) {
        super.frame(delta);
    }

}

class EnemyActor extends BreakableActor{

    stateMachine;

    init(game) {
        super.init(game);

        this.speed = this.speed / 2;

        this.stateMachine = new StateMachine();
        this.stateMachine.addState(new StateMachineState('idle', (item, delta, state) => {

            if(state.target === undefined || item.collidedWith !== null || (distanceXY(item.getPos(), state.target) < 5)) {
                state.target = addXY(item.getPos(), getRandomVec(30));
                item.setMoveDirection({x:0, y:0});
                state.sleep = getRandomInt(1500, 4500);
            } else if (state.sleep !== undefined && state.sleep > 0) {
                state.sleep -= delta;
            } else {
                item.setMoveDirection(MakeDirVec(vecSub(state.target, item.getPos())));
            }
        }, {attack: (item, delta, state) => {return true;}}));

        this.stateMachine.addState(new StateMachineState('attack', (item, delta, state) => {

            let player = Object.values(item.game.getVisibleActorsInRadius(item, 1000)).find(x => x instanceof Player);

            if(player) {
                item.lookAt = vecNormalize(vecSub(player.getPos(), item.getPos()));

                if (item.weaponTick === undefined) {
                    item.weaponTick = 0;
                } else if (item.weaponTick < 0) {
                    this.game.addActorToCurrScreen(
                        (new ProjectileActor(this).setRenderable((new AnimatedRenderableItem('textures/bullets.png')).setAnim('redStarFly', Animation.linearNoRepeat).setAnimTime(500)))
                            .setSpeed(140)
                    );
                    item.weaponTick = 600;
                } else {
                    item.weaponTick -= delta;
                }

                if(player && distanceXY(player.getPos(), item.getPos()) > 15) {
                    item.setMoveDirection(MakeDirVec(vecSub(player.getPos(), item.getPos())));

                } else {
                    item.setMoveDirection({x:0, y:0});
                }

            }

        }));


    }

    frame(delta) {
        super.frame(delta);
        this.stateMachine.performCurrentStateBehaviour(this, delta);

    }


}

class ItemActor extends MovableActor{

    constructor(pos) {
        super(pos);
    }

    init(game) {
        super.init(game);
    }

    onPickup(pickupCallback, condition = x => true) {
        return this.on('pickup', (x, y) => pickupCallback(y), (x, y) => condition(y));
    }


    getCollidedActor() {
        for (let index in this.game.lastFullActors) {
            let actor = this.game.lastFullActors[index];
            if (actor !== this && actor !== this.projectileAuthor && actor.size !== undefined && actor instanceof BreakableActor) {
                if (this.checkBoxCollisionVector(actor.getPos(), actor.size)) {
                    return actor;
                }
            }
        }
    }

    frame(delta) {
        super.frame(delta);

        let target = this.getCollidedActor();
        if(target && this.fireCallback('pickup', target)) {
            this.markForRemoval();
        }
    }

}

class PlaneActor extends BreakableActor{

    stateMachine;

    init(game) {
        super.init(game);

        this.speed = this.speed / 2;

        this.stateMachine = new StateMachine();
        this.stateMachine.addState(new StateMachineState('bomb', (item, delta, state) => {

            if (item.weaponTick === undefined) {
                item.weaponTick = 0;
            } else if (item.weaponTick < 0) {
                this.game.addActorToCurrScreen(
                    (new ProjectileActor(this).setDamage(53).setRenderable((new AnimatedRenderableItem('textures/bullets.png')).setAnim('greenSphereGrow', Animation.linearNoRepeat).setAnimTime(500)).setSpeed(0).setDelayAnim('redStarFly', 600).setLifeTime(500))

                );
                item.weaponTick = 10;
            } else {
                item.weaponTick -= delta;
            }

        }));


    }

    frame(delta) {
        super.frame(delta);
        this.stateMachine.performCurrentStateBehaviour(this, delta);

    }


}


class Player extends BreakableActor {

    interactCallback;

    constructor(pos) {
        super(pos);

        let self = this;
        this.addExtension(new InventoryExtension(8));

        this.renderable = new RenderablePlayer(this);
        this.keyboardControllable = true;
    }

    init(game) {
        super.init(game);
        let self = this;
        this.interactCallback = () => {game.reactToAction(self);}

        this.keyboard.onCommandActive('interact', 'game', () => self.tryInteract());
        this.keyboard.onCommandActive('attack', 'game', () => self.tryAttack());

    }

    tryAttack() {
        this.game.addActorToCurrScreen(
            (new ProjectileActor(this).setRenderable((new AnimatedRenderableItem('textures/bullets.png')).setAnim('redStarFly', Animation.linearNoRepeat).setAnimTime(500)))
            .setSpeed(140)
        );
    }


    tryInteract() {
        if(this.interactCallback) {
            this.interactCallback(this);
        }
    }

    frame(delta) {
        super.frame(delta);
    }
}

class MainLoop {

    #lastRender = null;
    #updateMethods = null;
    #drawMethods = null;

    loop(timestamp) {
        var progress = timestamp - this.#lastRender;

        this.#updateMethods.forEach(x => x(progress));
        this.#drawMethods.forEach(x => x(progress));

        this.#lastRender = timestamp;
        window.requestAnimationFrame(bind(this, 'loop'));
    }

    start() {
        this.#lastRender = 0;
        window.requestAnimationFrame(bind(this, 'loop'));

    }

    constructor(updateMethod, drawMethod) {
        this.#updateMethods = updateMethod === undefined ? [() => {}] : [updateMethod];
        this.#drawMethods = drawMethod === undefined ? [() => {}] : [drawMethod];
    }

    addUpdateMethod(method) {
        this.#updateMethods.push(method);
    }

    addRenderer(renderer) {
        this.#drawMethods.push(bind(renderer, 'render'));
        return this;
    }

    addActor(actor) {
        //this.#updateMethods.push(bind(actor, 'frame'));
        //this.#drawMethods.push(bind(actor.actionRenderer, 'render'));
        return this;
    }

}

class interactableObject {

    gameObject;
    position;
    width;

    constructor(gameObject, position, width) {
        this.gameObject = gameObject;
        this.position = position;
        this.width = width;
    }

    isActivated(initiator) {

        if(Math.abs(initiator.x - this.position.x) <= this.width && Math.abs(initiator.y - this.position.y) <= this.width) {
            return 1;
        }
        return false


    }

    interact(initiator) {}

}

class interactableTerrain_Portal extends interactableObject {

    interact(initiator) {
        this.gameObject.nextMap(this.position);
    }

    isActivated(initiator) {

        let initiatorPos = this.gameObject.toGridSpace(initiator);

        if(Math.abs(initiatorPos.x - this.position.x) <= this.width && Math.abs(initiatorPos.y - this.position.y) <= this.width) {
            return 1;
        }
        return false


    }


}

class ActorsLib {

    lib = {};

    add(name, createMethod) {
        this.lib[name] = createMethod;
        return this;
    }

    get(name) {
        return this.lib[name]();
    }

    make(name) {
        let actor = this.get(name);
        if(actor !== null) {
            game.addActorToCurrScreen(actor);
        }
    }

}

class Game {

    keyboard = new Keyboard();
    loop = new MainLoop();
    mapManager = new MapManager();
    resourceLoadManager = new ResourceLoadManager();
    actorsLib = new ActorsLib();
    dialogSystem = new DialogSystem();

    actors = {};
    actorsIndex = 0;
    interactables = [];
    player;
    background;
    uiBblock;
    actorsRenderer;

    cameraPos = {x:0, y:0};

    lastFullActors = {};

    getFullActorsList()  {
        let result = {};
        if(this?.mapManager?.currentGameScreen?.actors) {

            for(let actorId in this.mapManager.currentGameScreen.actors) {
                if(this.mapManager.currentGameScreen.actors[actorId].shouldBeRemoved) {
                    delete this.mapManager.currentGameScreen.actors[actorId];
                }
            }

            result = Object.assign(result, this.mapManager.currentGameScreen.actors);
        }

        for(let actorId in this.actors) {
            if(this.actors[actorId].shouldBeRemoved) {
                delete this.actors[actorId];
            }
        }

        return Object.assign(result, this.actors);
    }

    teleportCooldown;

    getVisibleActorsInRadius(targetActor, radius) {

        let visibleActors = {};
        let pos = targetActor.getPos();
        let mapCords = targetActor.getMapCords();

        for(let index in this.lastFullActors) {
            let actorPos = this.lastFullActors[index].getPos();
            let actorMapPos = this.lastFullActors[index].getMapCords();
            if(targetActor !== this.lastFullActors[index] && distanceXY(actorPos, pos) <= radius && this.mapManager.isPointVisible(mapCords, actorMapPos)) {
                visibleActors[index] = this.lastFullActors[index];
            }
        }
        return visibleActors;

    }

    addRenderer(renderer) {
        this.loop.addRenderer(renderer);
        return this;
    }

    addInteractable(interactable) {
        this.interactables.push(interactable);
    }

    findClosestActorsDialogs() {
        return Object.values(this.lastFullActors).filter(x => x.dialog && distanceXY(x.getPos(), game.player.getPos()) < 20);
    }

    reactToAction(initiator) {
        var priorityQueue = this.interactables.map(x => [x, x.isActivated(initiator)]).filter(x => x[1] !== false).sort((x,y) => Math.sign(x[1] - y[1]));

        if(priorityQueue.length > 0) {
            priorityQueue[0][0].interact();
        } else {
            //this.uiBblock.currentUIOptions = this.getDefaultUIOptions();
            this.keyboard.gameState = 'menu';
            this.dialogSystem.selectCurrent();
        }
    }

    removeActor(name) {
        delete this.actors[name];
    }

    initActor(actor) {
        actor.init(this);
    }

    addActor(name, actor) {

        if(name === undefined) {
            name = this.actorsIndex++;
        }

        this.actors[name] = actor;
        actor.init(this);
        return actor;
    }

    addActorToCurrScreen(actor, name = undefined) {

        if(name === undefined) {
            name = this.actorsIndex++;
        }

        if(this?.mapManager?.currentGameScreen?.actors) {
            this.mapManager.currentGameScreen.actors[name] = actor;
            actor.init(this);
            return actor;
        }

        return null;

    }

    selectSpawnPoint() {

        const avaliableSpawns = Object.values(game.mapManager.currentGameScreen.gameMapScreenRoadEntry).flat();

        if(avaliableSpawns) {
            const spawnPoints = avaliableSpawns.map(x => x.tiles).flat();

            let EntryPoint = spawnPoints.filter(x => this.mapManager.currentGameScreen.getTileIndex(x) === 5);
            if(EntryPoint.length > 0) {
                this.mapManager.currentGameScreen.setTileByVector(EntryPoint[0], 2);
                return EntryPoint[0];
            }

            return spawnPoints.length > 0 ? getRandomElement(spawnPoints) : {x:0, y:0};
        }
        return {x:0, y:0};
    }

    toMapSpace(vect) {

        if(vect && vect.x !== undefined && vect.y != undefined) {

            return {
                x: (this.background.canvas.width / this.mapManager.currentGameScreen.width) * vect.x,
                y: (this.background.canvas.height / this.mapManager.currentGameScreen.height) * vect.y,
            };
        } return null;

    }

    toGridSpace(vect) {

        return {
            x:Math.round((this.mapManager.currentGameScreen.width / this.background.canvas.width) * vect.x),
            y:Math.round((this.mapManager.currentGameScreen.height / this.background.canvas.height) * vect.y),
        };

    }

    findOpositePoint(direction, vector) {

        let directions = {
            left: {x: this.mapManager.currentGameScreen.width - 1, y:0},
            right: {x: (-(this.mapManager.currentGameScreen.width - 1)), y:0},
            up: {x: 0, y:this.mapManager.currentGameScreen.height - 1},
            down: {x: 0, y:(-(this.mapManager.currentGameScreen.height - 1))},
        };

        let result = {x:(vector.x + directions[direction].x) % this.mapManager.currentGameScreen.width, y:(vector.y + directions[direction].y) % this.mapManager.currentGameScreen.height};

        return result;

    }

    nextMap(teleportPoint) {
        if(this.teleportCooldown.get() >= 1) {

            this.interactables = [];

            let tpDirs = Object.entries(game.mapManager.currentGameScreen.gameMapScreenRoadEntry).map(dir => [dir[0], dir[1].map(x => x.tiles).flat()]).filter(x => x[1].filter(a => a.x === teleportPoint.x && a.y === teleportPoint.y).length > 0);
            if(tpDirs.length > 0) {
                this.mapManager.currentGameScreen.teleportDirection = tpDirs[0][0];
            }

            this.teleportCooldown.reset();
            this.mapManager.moveToAMap(this.mapManager.currentGameScreen.teleportDirection);
            this.markPortalsAsInteractables();
            this.player.setPos(this.toMapSpace(this.findOpositePoint(tpDirs[0][0], teleportPoint)));
            this.background.resetMapData(this.mapManager.currentGameScreen);
            this.initializeMapActors(this.mapManager.currentGameScreen);


        }
    }

    initializeMapActors(map) {
        let self = this;
        Object.values(map.actors).forEach(x => self.initActor(x));
    }

    markPortalsAsInteractables() {

        let portals = Object.values(game.mapManager.currentGameScreen.gameMapScreenRoadEntry).flat().map(x => x['tiles']).flat();

        for(let portal of portals) {
            this.addInteractable(new interactableTerrain_Portal(this, portal, 1));
        }

    }

    frame(delta) {

        this.lastFullActors = this.getFullActorsList();
        let scaledBorder = vecScale(this.actorsRenderer.getCanvasSize(), 0.5);
        let moveWindow = vecScale(this.actorsRenderer.getCanvasSize(), 0.3);
        let PlayerPos = game.player.getPos();

        let dist = distanceXY(PlayerPos, this.cameraPos);
        if(dist > moveWindow.x) {
            this.cameraPos = addXY(vecScale(vecNormalize(vecSub(PlayerPos, this.cameraPos)), dist - moveWindow.x), this.cameraPos);
        }


        this.actorsRenderer.canvasShift = vecSub(vecClamp(scaledBorder, vecSub(this.background.getMapSize(), scaledBorder), this.cameraPos), scaledBorder);
        this.background.canvasShift = this.actorsRenderer.canvasShift;

        this.uiBblock.currentUIOptions = this.dialogSystem.getCurrentDialog();
        this.uiBblock.currPos = this.dialogSystem.getCurrentPos();


        for(let actorIndex in this.lastFullActors) {
            this.lastFullActors[actorIndex].frame(delta);
        }

        this.teleportCooldown.animate(delta);
    }

    startLoadingResources() {
        this.resourceLoadManager.addResource(new TexturePackResource('textures/adventurer.png'));
        this.resourceLoadManager.addResource(new TexturePackResource('textures/characters.png'));

        this.resourceLoadManager.addResource(new TexturePackResource('textures/colony-grounds-ready.png')
            .setGridSize({x:16, y:16})
            .addNamedFrame('green.tl', {x:0, y:0})
            .addNamedFrame('green.tm', {x:1, y:0})
            .addNamedFrame('green.tr', {x:2, y:0})
            .addNamedFrame('green.ml', {x:0, y:1})
            .addNamedFrame('green.mm', {x:1, y:1})
            .addNamedFrame('green.mr', {x:2, y:1})
            .addNamedFrame('green.bl', {x:0, y:2})
            .addNamedFrame('green.bm', {x:1, y:2})
            .addNamedFrame('green.br', {x:2, y:2})
            .addNamedFrame('green.twall.1', {x:0, y:3})
            .addNamedFrame('green.twall.2', {x:2, y:3})
            .addNamedFrame('green.twall.3', {x:3, y:3})
            .addNamedFrame('green.deep', {x:1, y:4})
            .addNamedFrame('green.edger', {x:11, y:1})
            .addNamedFrame('green.edgel', {x:9, y:1})
            .addNamedFrame('green.edget', {x:10, y:3})
            .addNamedFrame('green.bg', {x:8, y:0})
            .addNamedFrame('green.rubble.1', {x:10, y:1})
            .addNamedFrame('green.rockl', {x:9, y:0})
            .addNamedFrame('green.rockm', {x:10, y:0})
            .addNamedFrame('green.rockr', {x:11, y:0})
        );

        this.resourceLoadManager.addResource(new TexturePackResource('textures/bullets.png')
            .addNamedFrames('redStarDeath', {x:17, y:17},[{x:136, y:9}, {x:155, y:9}, {x:172, y:9}])
            .addNamedFrames('redStarFly', {x:20, y:12},[{x:205, y:9}, {x:225, y:9}, {x:248, y:9}, {x:274, y:9}])
            .addNamedFrames('greenSphereGrow', {x:14, y:14},[{x:49, y:94}, {x:65, y:94}, {x:81, y:94}, {x:97, y:94}, {x:113, y:94}, {x:129, y:94}])
        );

        this.resourceLoadManager.addResource(new TexturePackResource('textures/UI/denzi.png')
            .setGridSize({x:16, y:16})
            .addNamedFrame('double.tl', {x:0, y:0})
            .addNamedFrame('double.tl', {x:0, y:0})
            .addNamedFrame('double.tr', {x:3, y:0})
            .addNamedFrame('double.bl', {x:0, y:3})
            .addNamedFrame('double.br', {x:3, y:3})
            .addNamedFrame('double.top.v1', {x:1, y:0})
            .addNamedFrame('double.top.v2', {x:2, y:0})
            .addNamedFrame('double.bottom.v1', {x:1, y:3})
            .addNamedFrame('double.bottom.v2', {x:2, y:3})
            .addNamedFrame('double.left.v1', {x:0, y:1})
            .addNamedFrame('double.left.v2', {x:0, y:2})
            .addNamedFrame('double.right.v1', {x:3, y:1})
            .addNamedFrame('double.right.v2', {x:3, y:2})
            .addNamedFrame('double.center.1', {x:0, y:4})
            .addNamedFrame('double.center.2', {x:1, y:4})
            .addNamedFrame('double.center.3', {x:2, y:4})
            .addNamedFrame('double.center.4', {x:3, y:4})
            .addNamedFrame('double.center.5', {x:0, y:5})
            .addNamedFrame('double.center.6', {x:1, y:5})
            .addNamedFrame('double.center.7', {x:2, y:5})
            .addNamedFrame('double.center.8', {x:3, y:5})
            .addNamedFrame('double.center.9', {x:0, y:6})
            .addNamedFrame('double.center.10', {x:1, y:6})
            .addNamedFrame('double.center.11', {x:2, y:6})
            .addNamedFrame('double.center.12', {x:3, y:6})
            .addNamedFrame('double.center.13', {x:0, y:7})
            .addNamedFrame('double.center.14', {x:1, y:7})
            .addNamedFrame('double.center.15', {x:2, y:7})
            .addNamedFrame('double.center.16', {x:3, y:7})
            .addNamedFrame('double.tlv', {x:8, y:6})
            .addNamedFrame('double.tlh', {x:12, y:4})
            .addNamedFrame('double.cross', {x:10, y:4})
            .addNamedFrame('gems.bottom.v1', {x:8, y:2})
            .addNamedFrame('gems.bottom.v2', {x:9, y:2})
            .addNamedFrame('gems.top.v1', {x:8, y:2})
            .addNamedFrame('gems.top.v2', {x:9, y:2})
        );

        this.resourceLoadManager.addResource(new TexturePackResource('textures/UI/icons.png')
            .setGridSize({x:32, y:32})
            .setGridSpacing({x:2, y:2})
            .addNamedFrame('health', {x:3, y:4})
            .addNamedFrame('potion.red', {x:0, y:3})
            .addNamedFrame('club', {x:0, y:0})
            .addNamedFrame('staff', {x:0, y:0})
            .addNamedFrame('spikedClub', {x:0, y:0})
            .addNamedFrame('greenStaff', {x:0, y:0})
            .addNamedFrame('sparkStaff', {x:0, y:0})
            .addNamedFrame('windStaff', {x:0, y:0})
            .addNamedFrame('eyeStaff', {x:0, y:0})
            .addNamedFrame('forstStaff', {x:0, y:0})
            .addNamedFrame('necroStaff', {x:0, y:0})
        );


        this.resourceLoadManager.load();
    }

    setupRenderers() {
        let self = this;
        this.actorsRenderer = new ActorsRrenderer(
            document.getElementById("characterCanvas"),
            this.resourceLoadManager,
            function () {return self.getFullActorsList();});
    }

    setupActorsLib() {
        this.actorsLib.add('healthPotion', x =>
            (new ItemActor()).setRenderable((new staticRenderabeItem('textures/UI/icons.png'))
                .setAnimationName('potion.red')
                .setScale(0.6))
                .onPickup(x => x.health += 134, x => x instanceof BreakableActor)
        );


        this.actorsLib.add('club', x =>
            (new ItemActor()).setName('Spiked Club').setRenderable((new staticRenderabeItem('textures/UI/icons.png'))
                .setAnimationName('spikedClub')
                .setScale(0.6))
                .on('pickup', (slf, x) => x.getExtension('inventory').addToEmptySlot(slf), (slf, x) => x.hasExtension('inventory'))
        );


        this.actorsLib.add('airstrike', x =>
            ((new PlaneActor({x:0,y:0})).setRenderable((new RenderableCharacter(null,'textures/characters.png')).setStopAtFrame(1).setVariation(getRandomInt(0, 11))).setSpeed(400).setNoclip(true).setMoveDirection({x:1, y:1}))
        );

    }

    setUpDefaultDialog() {

        this.dialogSystem
            .addCommonAction('closeDialog', x => {game.keyboard.gameState = 'game'; x.clearCurrent();})
            .addDialogList((new DialogList('default'))
                .addOption('Back to map', x => x.callAction('closeDialog'))
                .addOption('Dig', x => {game.mapManager.currentGameScreen.setTileByVector(addXY(game.toGridSpace(game.player.getPos()), game.player.lookAt), 0); x.callAction('closeDialog');})
                .addOption('Inventory', x => x.selectDialog('inventory'))
                .addOption('Airstrike', x => {game.actorsLib.make('airstrike'); x.callAction('closeDialog');})
            )
            .addDialogList(new DialogList('inventory').fromOtherObject(game.player.getExtension('inventory').getItems()));

    }

    main() {
        this.startLoadingResources();

        this.setupRenderers();

        this.teleportCooldown = new animatedLinearParam(0, 1, 25);

        //this.background = new MapRenderer(document.getElementById("backgroundCanvas"), this.mapManager.currentGameScreen);

        this.background = new ContiniousMapRenderer(document.getElementById("backgroundCanvas"), this.resourceLoadManager.getResource('textures/colony-grounds-ready.png'));

        this.addRenderer(this.background);


        let self = this;
        this.uiBblock = new UIRenderer(document.getElementById("TOPUIBlock"), this.resourceLoadManager.getResource('textures/UI/denzi.png'));
        this.keyboard.onCommandActive('selectUp', 'menu', () => self.dialogSystem.selectPrev());
        this.keyboard.onCommandActive('selectDown', 'menu', () => self.dialogSystem.selectNext());
        this.keyboard.onCommandActive('select', 'menu', () => self.dialogSystem.selectCurrent());
        this.addRenderer(this.uiBblock);

        this.player = new Player(this.toMapSpace({x:10, y:10})).setNoclip(true);
        this.addActor('player', this.player);

        this.markPortalsAsInteractables();

        this.loop.addUpdateMethod(bind(this, 'frame'));
        this.loop.addRenderer(this.actorsRenderer);
        this.setupActorsLib();
        this.setUpDefaultDialog();

        this.cameraPos = vecScale(this.actorsRenderer.getCanvasSize(), 0.5);

        this.loop.start();

    }

}

const game = new Game();
game.main();
