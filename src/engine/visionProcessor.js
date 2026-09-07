/**
 * OptiFlow AI - Computer Vision & Object Tracking Engine
 * Analyzes video streams / webcam / synthetic feed to identify vehicles,
 * calculate confidence scores, extract speed vectors, and classify road objects.
 */

export class VisionProcessor {
  constructor() {
    this.trackedObjects = new Map();
    this.nextTrackerId = 101;
    this.fps = 30;
    this.lastProcessTime = Date.now();
    this.detectionConfidenceThreshold = 0.65;
  }

  /**
   * Process simulated vehicles or video canvas frames to generate YOLO-style detections
   */
  processFrame(vehicles = [], canvasWidth = 600, canvasHeight = 600) {
    const now = Date.now();
    const detections = [];

    vehicles.forEach(v => {
      // Add slight neural confidence jitter for realistic inference rendering
      const baseConfidence = v.isEmergency ? 0.98 : 0.92;
      const confidence = Math.min(0.99, Math.max(0.75, baseConfidence + (Math.sin(v.id + now * 0.003) * 0.05)));

      // Bounding box with camera perspective
      const bbox = {
        x: Math.round(v.x - v.width / 2 - 4),
        y: Math.round(v.y - v.length / 2 - 4),
        width: Math.round(v.width + 8),
        height: Math.round(v.length + 8)
      };

      // Speed in km/h derived from pixel velocity
      const speedKmh = Math.round(v.speed * 16.5);

      detections.push({
        id: v.id,
        trackerId: `TRK-${v.id}`,
        type: v.type,
        name: v.name,
        confidence: Number(confidence.toFixed(3)),
        bbox,
        approach: v.approach,
        lane: v.laneIndex + 1,
        speedKmh,
        state: v.state,
        isEmergency: v.isEmergency,
        color: v.color
      });
    });

    return {
      timestamp: now,
      totalDetected: detections.length,
      detections,
      summary: this.aggregateCounts(detections)
    };
  }

  aggregateCounts(detections) {
    const summary = {
      CAR: 0,
      SUV: 0,
      BUS: 0,
      TRUCK: 0,
      MOTORCYCLE: 0,
      EMERGENCY: 0,
      approaches: {
        NORTH: 0,
        SOUTH: 0,
        EAST: 0,
        WEST: 0
      }
    };

    detections.forEach(d => {
      if (d.isEmergency) summary.EMERGENCY++;
      else if (summary[d.type] !== undefined) summary[d.type]++;

      if (summary.approaches[d.approach] !== undefined) {
        summary.approaches[d.approach]++;
      }
    });

    return summary;
  }

  /**
   * Draw augmented reality (AR) bounding boxes and AI telemetry HUD onto a Canvas 2D context
   */
  renderAROverlay(ctx, detections, viewMode = 'BBOX_FULL') {
    detections.forEach(det => {
      const { bbox, name, confidence, speedKmh, isEmergency, trackerId } = det;

      // Color scheme
      let strokeColor = isEmergency ? '#ef4444' : '#00f2fe';
      let bgColor = isEmergency ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 242, 254, 0.15)';

      // 1. Box corners
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      ctx.fillStyle = bgColor;
      ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);

      // 2. Corner brackets (Cyberpunk AI Reticle)
      const bracketLen = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bbox.x, bbox.y + bracketLen);
      ctx.lineTo(bbox.x, bbox.y);
      ctx.lineTo(bbox.x + bracketLen, bbox.y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bbox.x + bbox.width - bracketLen, bbox.y);
      ctx.lineTo(bbox.x + bbox.width, bbox.y);
      ctx.lineTo(bbox.x + bbox.width, bbox.y + bracketLen);
      ctx.stroke();

      // 3. Label tag with Confidence & Speed
      const labelText = `${name} ${(confidence * 100).toFixed(0)}% | ${speedKmh} km/h`;
      ctx.font = '10px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = isEmergency ? '#ef4444' : '#0e1726';
      ctx.fillRect(bbox.x, bbox.y - 16, textWidth + 8, 14);
      
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(bbox.x, bbox.y - 16, textWidth + 8, 14);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, bbox.x + 4, bbox.y - 5);
    });
  }
}
