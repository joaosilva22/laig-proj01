class Animation {
    constructor(id, span) {
	this.id = id;
	this.span = span * 1000;

	this.finished = false;
	
	this.prev = 0;
	this.elapsed = 0;
    }
};

class LinearAnimation extends Animation {
    constructor(id, span) {
	super(id, span);
	this.controlPoints = [];
    }
    
    addControlPoint(point) {
	this.controlPoints.push(point);
    }

    calcDistance() {
	var distance = function(ver1, ver2) {
	    return Math.sqrt(Math.pow(ver1[0]+ver2[0], 2) +
			     Math.pow(ver1[1]+ver2[1], 2) +
			     Math.pow(ver1[2]+ver2[2], 2));
	};

	var total = 0;

	for (var i = 0; i < this.controlPoints.length-1; i++) {
	    total += distance(this.controlPoints[i], this.controlPoints[i+1]);
	}

	return total;
    }

    calcVelocity() {
	console.log(this.calcDistance(), this.span);
	this.velocity = this.calcDistance() / this.span;
    }

    calcDirections() {
	this.directions = [];
	
	var subtract = function(vec1, vec2) {
	    return [vec2[0] - vec1[0],
		    vec2[1] - vec1[1],
		    vec2[2] - vec1[2]];
		    
	};

	var length = function(vec) {
	    return Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1] + vec[2]*vec[2]);
	};

	var normalize = function(vec) {
	    return [vec[0]/length(vec), vec[1]/length(vec), vec[2]/length(vec)];
	};

	for (var i = 0; i < this.controlPoints.length-1; i++) {
	    var v1 = this.controlPoints[i];
	    var v2 = this.controlPoints[i+1];
	    
	    this.directions.push(normalize(subtract(v1, v2)));
	}
    }

    begin() {
	this.position = this.controlPoints[0];
	this.cdir = 0;
	
	this.calcVelocity();
	this.calcDirections();
    }

    update(currTime) {
	if (this.prev == 0) {
	    this.prev = currTime;
	    this.begin();
	}

	if (this.prev > 0 &&
	    this.elapsed < this.span &&
	    this.cdir < this.controlPoints.length-1) {

	    var dt = currTime - this.prev;
	    
	    var vel = this.velocity * dt;
	    var dirvel = [vel * this.directions[this.cdir][0],
			  vel * this.directions[this.cdir][1],
			  vel * this.directions[this.cdir][2]];

	    var atControlPoint = false;

	    for (var i = 0; i < 3; i++) {
		if (this.position[i] + dirvel[i] < this.controlPoints[this.cdir+1][i]) {
		    this.position[i] += dirvel[i];
		}
		else {
		    this.position[i] = this.controlPoints[this.cdir+1][i];
		}

		if (this.position == this.controlPoints[this.cdir+1]) {
		    atControlPoint = true;
		}
	    }

	    if (atControlPoint) {
		this.cdir++;
	    }

	    this.elapsed += dt;
	    this.prev = currTime;
	}

	if (this.elapsed >= this.span) {
	    this.finished = true;
	}
    }

    push(scene) {
	scene.pushMatrix();
	scene.translate(this.position[0], this.position[1], this.position[2]);
    }

    pop(scene) {
	scene.popMatrix();
    }
};

class CircularAnimation extends Animation {
    constructor(id, span, center, radius, startang, rotang) {
	super(id, span);

	var toRad = function(deg) {
	    return deg*(Math.PI/180.0);
	}
	
	this.center = center;
	this.radius = radius;
	this.startang = toRad(startang);
	this.rotang = toRad(rotang);

	this.endang = this.startang+this.rotang;
	this.velocity = (this.startang-this.endang)/this.span;
	this.ang = this.startang;

	this.position = [this.center[0]+this.radius, this.center[1], this.center[2]];
    }

    update(currTime) {
	if (this.prev == 0) {
	    this.prev = currTime;
	}

	if (this.prev > 0 &&
	    this.elapsed < this.span) {

	    var dt = currTime - this.prev;

	    this.ang += this.velocity*dt;

	    this.elapsed += dt;
	    this.prev = currTime;
	}

	if (this.elapsed >= this.span) {
	    this.finished = true;
	}
    }

    push(scene) {
	scene.pushMatrix();
	scene.rotate(this.ang, 0, 1, 0);
	scene.translate(this.position[0], this.position[1], this.position[2]);
    }

    pop(scene) {
	scene.popMatrix();
    }
};
