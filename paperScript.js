var monsters = new Array();
var explosionQueue = new ExplosionQueue();
var ravenPosition = new Point(0, view.viewSize.height * 0.5);
var ravenPivot = ravenPosition;
var raven;
project.activeLayer.importSVG('ravenShooter.svg', function(_raven) {
    raven = _raven;
    raven.position = ravenPosition;
});
project.activeLayer.importSVG('monster.svg', function(mon1) {
    mon1.scale(0.3);
    mon1.index = 0;
    mon1.position = new Point(view.viewSize.width + 100, 50);
    monsters.push(mon1);
    for (var i = 1; i <= 5; i++) {
        var moni = mon1.clone();
        moni.index = i;
        moni.position = new Point(
            view.viewSize.width + 100,
            (view.viewSize.height * i) / 6 + 50
        );
        monsters.push(moni);
    }
    for (var i = 0; i < 6; i++) {
        monsters[i].speed = Math.random() * 2 + 3;
        monsters[i].pauseAnim = false;
        monsters[i].inity = monsters[i].position.y;
        // monsters[i].onMouseDown = function(e){
        //     if(!this.pauseAnim){
        //         this.pauseAnim = true;
        //         var mons = this;
        //         explosionQueue.queue(new Explosion(this.position.x,this.position.y,50,300,10,new Point(-this.speed,0),80,this, function(){
        //             mons.position = new Point(view.viewSize.width+100, mons.inity);
        //             mons.pauseAnim = false;
        //             mons.opacity = 1;
        //         }));
        //     }
        // }
    }
});
var lastRavenAngle = 0;
function onMouseMove(e) {
    var direction = e.point - ravenPosition;
    raven.rotate(-lastRavenAngle, ravenPivot);
    raven.rotate(direction.angle, ravenPivot);
    lastRavenAngle = direction.angle;
}
function onMouseDown(e) {
    fireQueue.queue(new Fire(e.point));
}
function inRadian(angle) {
    return (angle * Math.PI) / 180;
}
function getGunPoint() {
    return new Point(
        ravenPosition.x + 150 * Math.cos(inRadian(lastRavenAngle)),
        ravenPosition.y + 150 * Math.sin(inRadian(lastRavenAngle))
    );
}

function onFrame(event) {
    for (var i = 0; i < monsters.length; i++) {
        if (!monsters[i].pauseAnim) {
            monsters[i].position.x -= monsters[i].speed;
            monsters[i].position.y +=
                3 * Math.sin(0.04 * monsters[i].position.x + i * 20);
            if (monsters[i].position.x < -100) {
                monsters[i].position = new Point(
                    view.viewSize.width + 100,
                    monsters[i].inity
                );
                monsters[i].speed = Math.random() * 2 + 3;
            }
        }
    }
    explosionQueue.draw();
    fireQueue.draw();
}

function getBullet() {
    var rectangle = new Rectangle(new Point(0, 0), new Point(20, 5));
    var radius = new Size(5, 5);
    var bullet = new Path.Rectangle(rectangle, radius);
    bullet.fillColor = 'orange';
    return bullet;
}
var fireQueue = new FireQueue();

function FireQueue() {
    var fires = new Array();
    this.queue = function(fire) {
        fires.push(fire);
    };
    this.draw = function() {
        for (var i = 0; i < fires.length; i++) {
            fires[i].draw();
            if (fires[i].outofbound) fires[i].shouldDie = true;
        }
        fires = fires.filter(function(x) {
            if (x.shouldDie) x.clear();
            return !x.shouldDie;
        });
    };
}
var hitOptions = {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 1
};

function Fire(target) {
    this.progress = 0;
    this.shouldDie = false;
    var bullet = getBullet();
    this.hit = false;
    this.outofbound = false;
    bullet.position = getGunPoint();
    var initVel = target - bullet.position;
    initVel = (initVel * 40) / initVel.length;
    var prevAngle = 0;
    var vel = new Point(0, 0);
    this.draw = function() {
        var t = this.progress / 60;
        bullet.position += vel;
        if (this.progress === 0) {
            bullet.rotate(lastRavenAngle);
            prevAngle = lastRavenAngle;
        } else {
            bullet.rotate(-prevAngle);
            bullet.rotate(vel.angle);
            prevAngle = vel.angle;
        }
        vel = new Point(initVel.x, initVel.y + 9.8 * t);
        for (var i = 0; i < 6; i++) {
            var hit = monsters[i].hitTest(
                new Point(bullet.position.x, bullet.position.y),
                hitOptions
            );
            if (hit) {
                console.log('Hit something');
                this.hit = true;
                var mons = monsters[i];
                if (!mons.pauseAnim) {
                    mons.pauseAnim = true;
                    explosionQueue.queue(
                        new Explosion(
                            mons.position.x,
                            mons.position.y,
                            50,
                            300,
                            10,
                            new Point(-mons.speed, 0),
                            80,
                            mons,
                            function() {
                                mons.position = new Point(
                                    view.viewSize.width + 100,
                                    mons.inity
                                );
                                mons.pauseAnim = false;
                                mons.opacity = 1;
                            }
                        )
                    );
                }
                break;
            }
        }
        if (
            bullet.position.x > view.viewSize.width ||
            bullet.position.y > view.viewSize.height ||
            bullet.position.x < 0 ||
            bullet.position.y < 0
        ) {
            this.outofbound = true;
        }
        this.progress++;
    };
    this.clear = function() {
        bullet.remove();
    };
}

function ExplosionQueue() {
    var explosions = new Array();
    this.queue = function(expl) {
        explosions.push(expl);
    };
    this.draw = function() {
        for (var i = 0; i < explosions.length; i++) {
            explosions[i].draw();
        }
        explosions = explosions.filter(function(_expl) {
            return !_expl.complete;
        });
    };
}

function Explosion(
    x,
    y,
    r,
    minPoints,
    maxVelocity,
    initVelocity,
    duration,
    elem,
    destroyCallback
) {
    this.progress = 0;
    this.complete = false;
    this.pos = new Point(x, y);
    this.initialRadius = r;
    var points = new Array();
    var velocities = new Array();
    var pointCount = 1;
    var layerCount = 0;
    while (pointCount <= minPoints) {
        layerCount++;
        pointCount +=
            (2 * Math.PI) / Math.acos(1 - 1 / (2 * layerCount * layerCount));
    }
    var pointRadius = this.initialRadius / (2 * layerCount + 1);
    this.getVelocityVector = function(angle, angleRand, velRand) {
        var randAngle = angle * (1 - angleRand / 2 + angleRand * Math.random());
        var randVelocity =
            maxVelocity * (1 - velRand / 2 + velRand * Math.random());
        return new Point(
            randVelocity * Math.cos(randAngle) + initVelocity.x,
            randVelocity * Math.sin(randAngle) + initVelocity.y
        );
    };
    for (var i = 0; i <= layerCount; i++) {
        if (i == 0) {
            var circle = new Path.Circle(new Point(x, y), pointRadius);
            circle.fillColor = 'black';
            circle.life = duration * Math.random();
            circle.removed = false;
            points.push(circle);
            velocities.push(this.getVelocityVector(0, 1, 0.2));
        } else {
            for (
                var j = 1;
                j < (2 * Math.PI) / Math.acos(1 - 1 / (2 * i * i)) + 1;
                j++
            ) {
                var angle = Math.acos(1 - 1 / (2 * i * i)) * (j - 1) + i * 13;
                var posX = x + 2 * pointRadius * i * Math.cos(angle);
                var posY = y + 2 * pointRadius * i * Math.sin(angle);
                var circle = new Path.Circle(
                    new Point(posX, posY),
                    pointRadius
                );
                circle.fillColor = 'black';
                circle.life = duration * Math.random();
                circle.removed = false;
                points.push(circle);
                velocities.push(this.getVelocityVector(angle, 0.15, 0.2));
            }
        }
    }
    this.draw = function() {
        if (this.progress < duration) {
            t = this.progress / 60;
            for (var i = 0; i < points.length; i++) {
                if (this.progress > points[i].life) {
                    if (!points[i].removed) {
                        points[i].removed = true;
                        points[i].remove();
                    }
                } else {
                    points[i].position.x += velocities[i].x;
                    points[i].position.y += velocities[i].y + 9.8 * t;
                    points[i].opacity = Math.exp(
                        -this.progress / points[i].life
                    );
                    if (elem !== null && elem !== undefined)
                        elem.opacity = Math.exp(-this.progress);
                }
            }
        } else if (this.progress == duration) {
            for (var i = 0; i < points.length; i++) {
                if (!points[i].removed) points[i].remove();
            }
            console.log('Removed points');
            this.complete = true;
            if (destroyCallback !== undefined && destroyCallback !== null) {
                destroyCallback();
            }
        }
        this.progress++;
    };
}
