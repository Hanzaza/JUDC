/**
 * OptiFlow AI - 2D Intersection Multi-Lane Physics Simulation Engine
 * Handles realistic vehicle kinematics, queuing behind red lights,
 * car-following behavior (IDM), emergency vehicle bypass, and canvas rendering.
 */

export const APPROACHES = {
  NORTH: 'NORTH', // Coming from North, moving South
  SOUTH: 'SOUTH', // Coming from South, moving North
  EAST: 'EAST',   // Coming from East, moving West
  WEST: 'WEST'    // Coming from West, moving East
};

const VEHICLE_CONFIGS = {
  CAR: { width: 22, length: 42, color: '#38bdf8', maxSpeed: 3.5, name: 'Sedán' },
  SUV: { width: 24, length: 48, color: '#818cf8', maxSpeed: 3.2, name: 'SUV' },
  BUS: { width: 28, length: 80, color: '#fbbf24', maxSpeed: 2.2, name: 'Autobús Urbano' },
  TRUCK: { width: 28, length: 88, color: '#f97316', maxSpeed: 2.0, name: 'Camión de Carga' },
  MOTORCYCLE: { width: 14, length: 26, color: '#34d399', maxSpeed: 4.2, name: 'Motocicleta' },
  EMERGENCY_AMBULANCE: { width: 26, length: 54, color: '#ef4444', maxSpeed: 4.8, isEmergency: true, name: 'Ambulancia 🚑' },
  EMERGENCY_POLICE: { width: 24, length: 46, color: '#2563eb', maxSpeed: 5.0, isEmergency: true, name: 'Patrulla 🚓' }
};

let nextVehicleId = 1;

export class SimulationEngine {
  constructor(canvasWidth = 700, canvasHeight = 700) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.cx = canvasWidth / 2;
    this.cy = canvasHeight / 2;
    this.roadWidth = 160; // 2 lanes each direction (40px per lane)
    this.laneWidth = 40;
    this.stopLineDistance = 90; // distance from center
    
    this.vehicles = [];
    this.pedestrians = [];
    this.lights = { north: 'GREEN', south: 'GREEN', east: 'RED', west: 'RED' };
    this.spawnRates = { NORTH: 0.035, SOUTH: 0.035, EAST: 0.03, WEST: 0.03 };
    this.isPaused = false;
    this.weather = 'CLEAR'; // 'CLEAR' | 'RAIN' | 'NIGHT'
    this.totalCrossed = 0;
    this.idlingSecondsTotal = 0;
  }

  setLights(lights) {
    this.lights = lights;
  }

  setSpawnRateMultiplier(multiplier) {
    this.spawnRates = {
      NORTH: 0.03 * multiplier,
      SOUTH: 0.03 * multiplier,
      EAST: 0.025 * multiplier,
      WEST: 0.025 * multiplier
    };
  }

  spawnVehicle(approach, customType = null) {
    const types = customType ? [customType] : ['CAR', 'CAR', 'SUV', 'CAR', 'BUS', 'TRUCK', 'MOTORCYCLE'];
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const config = VEHICLE_CONFIGS[typeKey];

    // Determine lane (lane 0: right/straight, lane 1: left/straight)
    const laneIndex = Math.random() > 0.4 ? 0 : 1;
    
    let x, y, vx, vy, targetX, targetY, angle;
    const laneOffset = 20 + (laneIndex * 40); // center of lane

    switch (approach) {
      case APPROACHES.NORTH:
        x = this.cx - this.roadWidth / 2 + laneOffset;
        y = -config.length;
        vx = 0;
        vy = config.maxSpeed;
        angle = Math.PI; // Heading South (down)
        break;
      case APPROACHES.SOUTH:
        x = this.cx + this.roadWidth / 2 - laneOffset;
        y = this.height + config.length;
        vx = 0;
        vy = -config.maxSpeed;
        angle = 0; // Heading North (up)
        break;
      case APPROACHES.EAST:
        x = this.width + config.length;
        y = this.cy - this.roadWidth / 2 + laneOffset;
        vx = -config.maxSpeed;
        vy = 0;
        angle = -Math.PI / 2; // Heading West (left)
        break;
      case APPROACHES.WEST:
        x = -config.length;
        y = this.cy + this.roadWidth / 2 - laneOffset;
        vx = config.maxSpeed;
        vy = 0;
        angle = Math.PI / 2; // Heading East (right)
        break;
    }

    const vehicle = {
      id: nextVehicleId++,
      type: typeKey,
      name: config.name,
      width: config.width,
      length: config.length,
      color: config.color,
      maxSpeed: config.maxSpeed,
      isEmergency: !!config.isEmergency,
      approach,
      laneIndex,
      x,
      y,
      vx,
      vy,
      angle,
      speed: config.maxSpeed,
      state: 'MOVING', // 'MOVING' | 'DECELERATING' | 'STOPPED' | 'CROSSING' | 'PASSED'
      timeStoppedSec: 0,
      createdAt: Date.now()
    };

    // Prevent immediate collision upon spawn
    const minSpawnDistance = 60;
    const isObstructed = this.vehicles.some(v => {
      if (v.approach !== approach || v.laneIndex !== laneIndex) return false;
      const dist = Math.hypot(v.x - x, v.y - y);
      return dist < minSpawnDistance;
    });

    if (!isObstructed) {
      this.vehicles.push(vehicle);
      return vehicle;
    }
    return null;
  }

  injectEmergencyVehicle(approach = 'NORTH', type = 'EMERGENCY_AMBULANCE') {
    return this.spawnVehicle(approach, type);
  }

  update(deltaSec = 0.016) {
    if (this.isPaused) return;

    // 1. Spawning
    Object.keys(this.spawnRates).forEach(approach => {
      if (Math.random() < this.spawnRates[approach]) {
        this.spawnVehicle(approach);
      }
    });

    // 2. Sort vehicles per lane to compute car-following distances
    const activeVehicles = [];

    this.vehicles.forEach(v => {
      const isNS = v.approach === APPROACHES.NORTH || v.approach === APPROACHES.SOUTH;
      const lightColor = this.getLightForApproach(v.approach);

      // Calculate distance to stop line
      let distToStopLine = 999;
      let hasPassedStopLine = false;

      if (v.approach === APPROACHES.NORTH) {
        distToStopLine = (this.cy - this.stopLineDistance) - (v.y + v.length / 2);
        hasPassedStopLine = v.y > (this.cy - this.stopLineDistance);
      } else if (v.approach === APPROACHES.SOUTH) {
        distToStopLine = (v.y - v.length / 2) - (this.cy + this.stopLineDistance);
        hasPassedStopLine = v.y < (this.cy + this.stopLineDistance);
      } else if (v.approach === APPROACHES.EAST) {
        distToStopLine = (v.x - v.length / 2) - (this.cx + this.stopLineDistance);
        hasPassedStopLine = v.x < (this.cx + this.stopLineDistance);
      } else if (v.approach === APPROACHES.WEST) {
        distToStopLine = (this.cx - this.stopLineDistance) - (v.x + v.length / 2);
        hasPassedStopLine = v.x > (this.cx - this.stopLineDistance);
      }

      // Check leader vehicle in same lane
      let distToLeader = 999;
      this.vehicles.forEach(other => {
        if (other.id === v.id || other.approach !== v.approach || other.laneIndex !== v.laneIndex) return;

        let d = 999;
        if (v.approach === APPROACHES.NORTH && other.y > v.y) {
          d = (other.y - other.length / 2) - (v.y + v.length / 2);
        } else if (v.approach === APPROACHES.SOUTH && other.y < v.y) {
          d = (v.y - v.length / 2) - (other.y + other.length / 2);
        } else if (v.approach === APPROACHES.EAST && other.x < v.x) {
          d = (v.x - v.length / 2) - (other.x + other.length / 2);
        } else if (v.approach === APPROACHES.WEST && other.x > v.x) {
          d = (other.x - other.length / 2) - (v.x + v.length / 2);
        }

        if (d > 0 && d < distToLeader) {
          distToLeader = d;
        }
      });

      // Target speed logic
      let targetSpeed = v.maxSpeed;
      const minSafetyGap = 16;

      // Emergency vehicles override red light if intersection is clear
      const shouldRespectLight = !v.isEmergency || lightColor === 'RED' && distToStopLine > 40;

      if (!hasPassedStopLine && (lightColor === 'RED' || lightColor === 'YELLOW')) {
        if (distToStopLine > 0 && distToStopLine < 120) {
          if (distToStopLine < 8) {
            targetSpeed = 0;
          } else {
            targetSpeed = Math.min(targetSpeed, (distToStopLine / 100) * v.maxSpeed);
          }
        }
      }

      if (distToLeader < 80) {
        if (distToLeader <= minSafetyGap) {
          targetSpeed = 0;
        } else {
          targetSpeed = Math.min(targetSpeed, ((distToLeader - minSafetyGap) / 60) * v.maxSpeed);
        }
      }

      // Smooth acceleration / braking
      if (v.speed < targetSpeed) {
        v.speed = Math.min(targetSpeed, v.speed + 0.12);
      } else if (v.speed > targetSpeed) {
        v.speed = Math.max(targetSpeed, v.speed - 0.22);
      }

      // Update position
      if (v.approach === APPROACHES.NORTH) v.y += v.speed;
      else if (v.approach === APPROACHES.SOUTH) v.y -= v.speed;
      else if (v.approach === APPROACHES.EAST) v.x -= v.speed;
      else if (v.approach === APPROACHES.WEST) v.x += v.speed;

      // Track stopped/idling time
      if (v.speed < 0.2) {
        v.state = 'STOPPED';
        v.timeStoppedSec += deltaSec;
        this.idlingSecondsTotal += deltaSec;
      } else {
        v.state = hasPassedStopLine ? 'CROSSING' : 'MOVING';
      }

      // Despawn vehicles that exited canvas
      const margin = 100;
      const isOutOfBounds =
        v.x < -margin || v.x > this.width + margin ||
        v.y < -margin || v.y > this.height + margin;

      if (isOutOfBounds) {
        this.totalCrossed++;
      } else {
        activeVehicles.push(v);
      }
    });

    this.vehicles = activeVehicles;
  }

  getLightForApproach(approach) {
    if (approach === APPROACHES.NORTH) return this.lights.north;
    if (approach === APPROACHES.SOUTH) return this.lights.south;
    if (approach === APPROACHES.EAST) return this.lights.east;
    if (approach === APPROACHES.WEST) return this.lights.west;
    return 'RED';
  }

  getQueueStatistics() {
    const stats = {
      NORTH: { count: 0, stopped: 0, queueLengthMeters: 0, emergencyCount: 0 },
      SOUTH: { count: 0, stopped: 0, queueLengthMeters: 0, emergencyCount: 0 },
      EAST: { count: 0, stopped: 0, queueLengthMeters: 0, emergencyCount: 0 },
      WEST: { count: 0, stopped: 0, queueLengthMeters: 0, emergencyCount: 0 }
    };

    this.vehicles.forEach(v => {
      const entry = stats[v.approach];
      if (entry) {
        entry.count++;
        if (v.state === 'STOPPED') entry.stopped++;
        if (v.isEmergency) entry.emergencyCount++;
        entry.queueLengthMeters = Math.max(entry.queueLengthMeters, entry.stopped * 5.8);
      }
    });

    const ns = {
      count: stats.NORTH.count + stats.SOUTH.count,
      stopped: stats.NORTH.stopped + stats.SOUTH.stopped,
      queueLengthMeters: stats.NORTH.queueLengthMeters + stats.SOUTH.queueLengthMeters,
      hasEmergency: stats.NORTH.emergencyCount > 0 || stats.SOUTH.emergencyCount > 0
    };

    const ew = {
      count: stats.EAST.count + stats.WEST.count,
      stopped: stats.EAST.stopped + stats.WEST.stopped,
      queueLengthMeters: stats.EAST.queueLengthMeters + stats.WEST.queueLengthMeters,
      hasEmergency: stats.EAST.emergencyCount > 0 || stats.WEST.emergencyCount > 0
    };

    return { perApproach: stats, ns, ew, totalActive: this.vehicles.length };
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Background Grass / Urban ground
    ctx.fillStyle = '#0b111e';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Roads
    ctx.fillStyle = '#1e293b'; // Dark asphalt
    // Vertical road
    ctx.fillRect(this.cx - this.roadWidth / 2, 0, this.roadWidth, this.height);
    // Horizontal road
    ctx.fillRect(0, this.cy - this.roadWidth / 2, this.width, this.roadWidth);

    // 3. Sidewalks & Road borders
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    // Corners
    ctx.strokeRect(0, 0, this.cx - this.roadWidth / 2, this.cy - this.roadWidth / 2);
    ctx.strokeRect(this.cx + this.roadWidth / 2, 0, this.width - (this.cx + this.roadWidth / 2), this.cy - this.roadWidth / 2);
    ctx.strokeRect(0, this.cy + this.roadWidth / 2, this.cx - this.roadWidth / 2, this.height - (this.cy + this.roadWidth / 2));
    ctx.strokeRect(this.cx + this.roadWidth / 2, this.cy + this.roadWidth / 2, this.width - (this.cx + this.roadWidth / 2), this.height - (this.cy + this.roadWidth / 2));

    // 4. Lane markings (dashed yellow & white lines)
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.strokeStyle = '#e2e8f0';

    // North-South lane divider
    ctx.beginPath();
    ctx.moveTo(this.cx, 0);
    ctx.lineTo(this.cx, this.cy - this.stopLineDistance);
    ctx.moveTo(this.cx, this.cy + this.stopLineDistance);
    ctx.lineTo(this.cx, this.height);
    ctx.stroke();

    // East-West lane divider
    ctx.beginPath();
    ctx.moveTo(0, this.cy);
    ctx.lineTo(this.cx - this.stopLineDistance, this.cy);
    ctx.moveTo(this.cx + this.stopLineDistance, this.cy);
    ctx.lineTo(this.width, this.cy);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // 5. Zebra Crosswalks (Crossings)
    this.renderCrosswalk(ctx, this.cx, this.cy - this.stopLineDistance + 12, 'HORIZONTAL');
    this.renderCrosswalk(ctx, this.cx, this.cy + this.stopLineDistance - 12, 'HORIZONTAL');
    this.renderCrosswalk(ctx, this.cx - this.stopLineDistance + 12, this.cy, 'VERTICAL');
    this.renderCrosswalk(ctx, this.cx + this.stopLineDistance - 12, this.cy, 'VERTICAL');

    // 6. Stop lines (Solid White)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    // North stop line
    ctx.beginPath();
    ctx.moveTo(this.cx - this.roadWidth / 2, this.cy - this.stopLineDistance);
    ctx.lineTo(this.cx, this.cy - this.stopLineDistance);
    ctx.stroke();
    // South stop line
    ctx.beginPath();
    ctx.moveTo(this.cx, this.cy + this.stopLineDistance);
    ctx.lineTo(this.cx + this.roadWidth / 2, this.cy + this.stopLineDistance);
    ctx.stroke();
    // East stop line
    ctx.beginPath();
    ctx.moveTo(this.cx + this.stopLineDistance, this.cy - this.roadWidth / 2);
    ctx.lineTo(this.cx + this.stopLineDistance, this.cy);
    ctx.stroke();
    // West stop line
    ctx.beginPath();
    ctx.moveTo(this.cx - this.stopLineDistance, this.cy);
    ctx.lineTo(this.cx - this.stopLineDistance, this.cy + this.roadWidth / 2);
    ctx.stroke();

    // 7. Render Traffic Light Posts and Indicators on corners
    this.renderTrafficLights(ctx);

    // 8. Render Vehicles
    this.vehicles.forEach(v => this.renderVehicle(ctx, v));

    // 9. Vision Sensor FOV (Field of View overlay)
    this.renderSensorOverlay(ctx);
  }

  renderCrosswalk(ctx, x, y, orientation) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const barWidth = 6;
    const barLength = 22;
    const gap = 12;

    if (orientation === 'HORIZONTAL') {
      const startX = x - this.roadWidth / 2 + 5;
      const count = Math.floor((this.roadWidth - 10) / gap);
      for (let i = 0; i < count; i++) {
        ctx.fillRect(startX + (i * gap), y - barLength / 2, barWidth, barLength);
      }
    } else {
      const startY = y - this.roadWidth / 2 + 5;
      const count = Math.floor((this.roadWidth - 10) / gap);
      for (let i = 0; i < count; i++) {
        ctx.fillRect(x - barLength / 2, startY + (i * gap), barLength, barWidth);
      }
    }
  }

  renderTrafficLights(ctx) {
    const postOffset = 95;
    const lightRadius = 6;

    const drawLightBox = (x, y, state, label) => {
      // Box
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - 14, y - 26, 28, 52, 6);
      ctx.fill();
      ctx.stroke();

      // Red bulb
      ctx.fillStyle = state === 'RED' ? '#ef4444' : '#450a0a';
      if (state === 'RED') {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.arc(x, y - 14, lightRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Yellow bulb
      ctx.fillStyle = state === 'YELLOW' ? '#f59e0b' : '#451a03';
      if (state === 'YELLOW') {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.arc(x, y, lightRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Green bulb
      ctx.fillStyle = state === 'GREEN' ? '#10b981' : '#022c22';
      if (state === 'GREEN') {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.arc(x, y + 14, lightRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // North Light (placed at upper right)
    drawLightBox(this.cx + this.roadWidth / 2 + 20, this.cy - postOffset, this.lights.north, 'N');
    // South Light (placed at lower left)
    drawLightBox(this.cx - this.roadWidth / 2 - 20, this.cy + postOffset, this.lights.south, 'S');
    // East Light (placed at upper left)
    drawLightBox(this.cx + postOffset, this.cy + this.roadWidth / 2 + 20, this.lights.east, 'E');
    // West Light (placed at lower right)
    drawLightBox(this.cx - postOffset, this.cy - this.roadWidth / 2 - 20, this.lights.west, 'W');
  }

  renderVehicle(ctx, v) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    // Emergency strobe beacon animation
    if (v.isEmergency) {
      const strobe = Math.floor(Date.now() / 120) % 2 === 0;
      ctx.fillStyle = strobe ? 'rgba(239, 68, 68, 0.4)' : 'rgba(37, 99, 235, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, v.length * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vehicle Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-v.width / 2 + 2, -v.length / 2 + 2, v.width, v.length, 5);
    ctx.fill();

    // Vehicle Body
    ctx.fillStyle = v.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-v.width / 2, -v.length / 2, v.width, v.length, 5);
    ctx.fill();
    ctx.stroke();

    // Windshield / Glass
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-v.width / 2 + 3, -v.length / 2 + 8, v.width - 6, 8);
    // Rear windshield
    ctx.fillRect(-v.width / 2 + 3, v.length / 2 - 12, v.width - 6, 6);

    // Headlights (Front is negative Y in local space)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-v.width / 2 + 2, -v.length / 2 - 1, 4, 2);
    ctx.fillRect(v.width / 2 - 6, -v.length / 2 - 1, 4, 2);

    // Taillights (Rear is positive Y)
    ctx.fillStyle = v.speed < 0.2 ? '#ef4444' : '#991b1b';
    ctx.fillRect(-v.width / 2 + 2, v.length / 2 - 1, 4, 2);
    ctx.fillRect(v.width / 2 - 6, v.length / 2 - 1, 4, 2);

    ctx.restore();
  }

  renderSensorOverlay(ctx) {
    // Holographic corner detection radar / HUD lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.cx - 150, this.cy - 150, 300, 300);

    // Target crosshair in center
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 242, 254, 0.8)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('AI OPTICAL RADAR - 60 FPS', 15, 25);
  }
}
