function bind(toObject, methodName){
    return function(...params){toObject[methodName](...params)}
}

function hashString(string) {
    var hash = 0;
    if (string.length == 0) {
        return hash;
    }
    for (var i = 0; i < string.length; i++) {
        var char = string.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomVec(magnitude) {
    return {x:getRandomInt(-magnitude, magnitude), y:getRandomInt(-magnitude, magnitude)};
}

function getRandomVecSquare(magnitude) {
    return {x:getRandomInt(0, magnitude), y:getRandomInt(0, magnitude)};
}


function getRandomElement(arr) {
    return arr[getRandomInt(0, arr.length - 1)];
}
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function angleFromVec(vec) {
    return (vec.x < 0) * 180 + vec.y * 90 + (45 + 180 * (vec.x < 0)) * -vec.y * vec.x;
}

function getPointsOnLine(start, end) {
    var dx = Math.abs(end.x - start.x);
    var dy = Math.abs(end.y - start.y);
    var sx = (start.x < end.x) ? 1 : -1;
    var sy = (start.y < end.y) ? 1 : -1;
    var err = dx - dy;
    let points = [];

    while(true) {
        points.push({x:start.x, y: start.y}); // Do what you need to for this

        if ((start.x === end.x) && (start.y === end.y)) break;
        var e2 = 2*err;
        if (e2 > -dy) { err -= dy; start.x  += sx; }
        if (e2 < dx) { err += dx; start.y  += sy; }
    }

    return points;
}

function getCirclePoints(center, radius) {

    let tiles = [];

    for(let x = -radius; x < radius; x++) {
        for(let y = -radius; y < radius; y++) {
            if((x*x + y*y) <= radius) {
                let vec = {x:center.x + x, y:center.y + y};
                tiles.push(vec);
            }
        }
    }

    return tiles;

}


function getPointsOnLineWidth(startObject, endObject, wd)
{

    let start = Object.assign({}, startObject);
    let end = Object.assign({}, endObject);

    let dx = Math.abs(end.x-start.x);
    let sx = start.x < end.x ? 1 : -1;
    let dy = Math.abs(end.y-start.y);
    let sy = start.y < end.y ? 1 : -1;
    let err = dx-dy, e2, x2, y2;                          /* error value e_xy */

    if(!Number.isFinite(dx) || !Number.isFinite(dy)) {
        return [];
    }

    let ed = dx+dy === 0 ? 1 : Math.sqrt(dx*dx+dy*dy);

    let points = [];

    for (wd = (wd+1)/2; ; ) {                                   /* pixel loop */
        points.push({x:start.x, y:start.y});
        e2 = err; x2 = start.x;
        if (2*e2 >= -dx) {                                           /* x step */
            for (e2 += dy, y2 = start.y; e2 < ed*wd && (end.y !== y2 || dx > dy); e2 += dx)
                points.push({x:start.x, y:y2 += sy});
            if (start.x === end.x) break;
            e2 = err; err -= dy; start.x += sx;
        }
        if (2*e2 <= dy) {                                            /* y step */
            for (e2 = dx-e2; e2 < ed*wd && (end.x !== x2 || dx < dy); e2 += dy)
                points.push({x:x2 += sx,y: start.y});
            if (start.y === end.y) break;
            err += dx; start.y += sy;
        }
    }

    return points;

}

function multiplyXY(vec, mul) {
    return {x:vec.x * mul, y:vec.y * mul};
}
function addXY(vec1, vec2) {
    return {x:vec1.x + vec2.x, y:vec1.y + vec2.y};
}
function distanceXY(vec1, vec2) {
    return Math.sqrt((vec1.x - vec2.x) * (vec1.x - vec2.x) + (vec1.y - vec2.y) * (vec1.y - vec2.y));
}

function vecSub(vec1, vec2) {
return {x: vec1.x - vec2.x, y: vec1.y - vec2.y};
}

function MakeDirVec(vec) {
    return{x: vec.x > 0 ? 1 : (vec.x < 0 ? -1 : 0), y : vec.y > 0 ? 1 : (vec.y < 0 ? -1 : 0)};
}