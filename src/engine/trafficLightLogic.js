/**
 * OptiFlow AI - Smart Traffic Light Algorithm & State Machine
 * Calculates dynamic green times based on queue weight, vehicle classifications,
 * emergency vehicle override, and comparative emissions/delay statistics.
 */

export const PHASES = {
  NS_GREEN: 'NS_GREEN',       // North-South Green, East-West Red
  NS_YELLOW: 'NS_YELLOW',     // North-South Yellow clearance
  ALL_RED_1: 'ALL_RED_1',     // Safety All-Red clearance interval
  EW_GREEN: 'EW_GREEN',       // East-West Green, North-South Red
  EW_YELLOW: 'EW_YELLOW',     // East-West Yellow clearance
  ALL_RED_2: 'ALL_RED_2',     // Safety All-Red clearance interval
  EMERGENCY_NS: 'EMERGENCY_NS', // North-South Priority Corridor
  EMERGENCY_EW: 'EMERGENCY_EW'  // East-West Priority Corridor
};

export const VEHICLE_WEIGHTS = {
  CAR: 1.0,
  MOTORCYCLE: 0.5,
  BUS: 2.5,
  TRUCK: 3.0,
  BICYCLE: 0.3,
  EMERGENCY_AMBULANCE: 10.0,
  EMERGENCY_POLICE: 8.0,
  EMERGENCY_FIRE: 10.0
};

export const DEFAULT_CONFIG = {
  minGreenSec: 12,
  maxGreenSec: 55,
  yellowSec: 3,
  allRedSec: 2,
  defaultCycleSec: 90,
  fixedTimeGreenSec: 30, // Traditional traffic light standard baseline
  co2PerMinuteIdlingGrams: 28.5 // Average passenger vehicle emissions while idling
};

export class TrafficLightController {
  constructor(config = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentPhase = PHASES.NS_GREEN;
    this.currentPhaseTime = 0;
    this.assignedGreenTime = 30;
    this.mode = 'ADAPTIVE_AI'; // 'ADAPTIVE_AI' | 'FIXED_TIME' | 'MANUAL' | 'EMERGENCY'
    this.emergencyActive = null; // { direction: 'NORTH'|'SOUTH'|'EAST'|'WEST', type: string, timeout: number }
    this.lastPhaseChange = Date.now();
    this.stats = {
      totalVehiclesProcessed: 0,
      totalWaitTimeSavedSec: 0,
      totalCo2SavedGrams: 0,
      cyclesCompleted: 0
    };
  }

  setMode(newMode) {
    this.mode = newMode;
  }

  triggerEmergencyOverride(direction, vehicleType = 'EMERGENCY_AMBULANCE') {
    const isNS = direction === 'NORTH' || direction === 'SOUTH';
    this.emergencyActive = {
      direction,
      type: vehicleType,
      phaseTarget: isNS ? PHASES.EMERGENCY_NS : PHASES.EMERGENCY_EW,
      expiryTime: Date.now() + 15000 // 15 seconds green wave
    };
    
    // Switch to target corridor with quick yellow if needed
    if (isNS) {
      if (this.currentPhase === PHASES.EW_GREEN) {
        this.currentPhase = PHASES.EW_YELLOW;
        this.currentPhaseTime = 0;
        this.assignedGreenTime = this.config.yellowSec;
      } else {
        this.currentPhase = PHASES.EMERGENCY_NS;
        this.currentPhaseTime = 0;
        this.assignedGreenTime = 15;
      }
    } else {
      if (this.currentPhase === PHASES.NS_GREEN) {
        this.currentPhase = PHASES.NS_YELLOW;
        this.currentPhaseTime = 0;
        this.assignedGreenTime = this.config.yellowSec;
      } else {
        this.currentPhase = PHASES.EMERGENCY_EW;
        this.currentPhaseTime = 0;
        this.assignedGreenTime = 15;
      }
    }
  }

  clearEmergencyOverride() {
    this.emergencyActive = null;
    this.currentPhase = PHASES.ALL_RED_1;
    this.currentPhaseTime = 0;
    this.assignedGreenTime = this.config.allRedSec;
  }

  calculateAdaptiveGreenTime(nsQueueStats, ewQueueStats) {
    const nsWeight = Math.max(1, (nsQueueStats.count * 1.2) + (nsQueueStats.queueLengthMeters * 0.4));
    const ewWeight = Math.max(1, (ewQueueStats.count * 1.2) + (ewQueueStats.queueLengthMeters * 0.4));

    const totalWeight = nsWeight + ewWeight;
    const availableCycle = this.config.defaultCycleSec - ((this.config.yellowSec + this.config.allRedSec) * 2);

    let nsGreen = Math.round((nsWeight / totalWeight) * availableCycle);
    let ewGreen = Math.round((ewWeight / totalWeight) * availableCycle);

    // Apply constraints
    nsGreen = Math.min(this.config.maxGreenSec, Math.max(this.config.minGreenSec, nsGreen));
    ewGreen = Math.min(this.config.maxGreenSec, Math.max(this.config.minGreenSec, ewGreen));

    return { nsGreen, ewGreen, nsWeight, ewWeight };
  }

  tick(deltaSec, nsQueueStats = { count: 10, queueLengthMeters: 25 }, ewQueueStats = { count: 10, queueLengthMeters: 25 }) {
    this.currentPhaseTime += deltaSec;

    // Check emergency timeout
    if (this.emergencyActive && Date.now() > this.emergencyActive.expiryTime) {
      this.clearEmergencyOverride();
    }

    if (this.currentPhaseTime >= this.assignedGreenTime) {
      this.advancePhase(nsQueueStats, ewQueueStats);
    }

    return {
      phase: this.currentPhase,
      timeInPhase: Math.floor(this.currentPhaseTime),
      timeLeft: Math.max(0, Math.ceil(this.assignedGreenTime - this.currentPhaseTime)),
      assignedGreenTime: this.assignedGreenTime,
      isEmergency: !!this.emergencyActive,
      emergencyDetails: this.emergencyActive,
      lights: this.getLightsState()
    };
  }

  advancePhase(nsQueueStats, ewQueueStats) {
    this.currentPhaseTime = 0;
    this.lastPhaseChange = Date.now();

    const { nsGreen, ewGreen } = this.calculateAdaptiveGreenTime(nsQueueStats, ewQueueStats);
    const assignedGreen = this.mode === 'FIXED_TIME' ? this.config.fixedTimeGreenSec : null;

    switch (this.currentPhase) {
      case PHASES.NS_GREEN:
        this.currentPhase = PHASES.NS_YELLOW;
        this.assignedGreenTime = this.config.yellowSec;
        break;

      case PHASES.NS_YELLOW:
        this.currentPhase = PHASES.ALL_RED_1;
        this.assignedGreenTime = this.config.allRedSec;
        break;

      case PHASES.ALL_RED_1:
        this.currentPhase = PHASES.EW_GREEN;
        this.assignedGreenTime = assignedGreen || ewGreen;
        break;

      case PHASES.EW_GREEN:
        this.currentPhase = PHASES.EW_YELLOW;
        this.assignedGreenTime = this.config.yellowSec;
        break;

      case PHASES.EW_YELLOW:
        this.currentPhase = PHASES.ALL_RED_2;
        this.assignedGreenTime = this.config.allRedSec;
        break;

      case PHASES.ALL_RED_2:
        this.currentPhase = PHASES.NS_GREEN;
        this.assignedGreenTime = assignedGreen || nsGreen;
        this.stats.cyclesCompleted++;
        break;

      case PHASES.EMERGENCY_NS:
      case PHASES.EMERGENCY_EW:
        this.currentPhase = PHASES.ALL_RED_1;
        this.assignedGreenTime = this.config.allRedSec;
        this.emergencyActive = null;
        break;

      default:
        this.currentPhase = PHASES.NS_GREEN;
        this.assignedGreenTime = assignedGreen || nsGreen;
    }
  }

  getLightsState() {
    switch (this.currentPhase) {
      case PHASES.NS_GREEN:
      case PHASES.EMERGENCY_NS:
        return {
          north: 'GREEN',
          south: 'GREEN',
          east: 'RED',
          west: 'RED'
        };
      case PHASES.NS_YELLOW:
        return {
          north: 'YELLOW',
          south: 'YELLOW',
          east: 'RED',
          west: 'RED'
        };
      case PHASES.EW_GREEN:
      case PHASES.EMERGENCY_EW:
        return {
          north: 'RED',
          south: 'RED',
          east: 'GREEN',
          west: 'GREEN'
        };
      case PHASES.EW_YELLOW:
        return {
          north: 'RED',
          south: 'RED',
          east: 'YELLOW',
          west: 'YELLOW'
        };
      case PHASES.ALL_RED_1:
      case PHASES.ALL_RED_2:
      default:
        return {
          north: 'RED',
          south: 'RED',
          east: 'RED',
          west: 'RED'
        };
    }
  }
}
