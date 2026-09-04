import { FlowNode, PortPosition, RouteType } from '../types/flow';

export interface Point {
  x: number;
  y: number;
}

export interface EdgePathData {
  path: string;
  labelPosition: Point;
  sourcePoint: Point;
  targetPoint: Point;
  waypointPosition: Point;
}

export function getPortCoordinates(node: FlowNode, port: PortPosition): Point {
  switch (port) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 };
    default:
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }
}

/**
 * Generate an SVG path with smooth, Canva-style rounded corners for orthogonal polylines.
 */
export function pointsToRoundedPath(points: Point[], radius: number = 10): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dPrevX = prev.x - curr.x;
    const dPrevY = prev.y - curr.y;
    const lenPrev = Math.hypot(dPrevX, dPrevY);

    const dNextX = next.x - curr.x;
    const dNextY = next.y - curr.y;
    const lenNext = Math.hypot(dNextX, dNextY);

    if (lenPrev === 0 || lenNext === 0) continue;

    const r = Math.min(radius, lenPrev / 2, lenNext / 2);

    const startX = curr.x + (dPrevX / lenPrev) * r;
    const startY = curr.y + (dPrevY / lenPrev) * r;
    const endX = curr.x + (dNextX / lenNext) * r;
    const endY = curr.y + (dNextY / lenNext) * r;

    d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function calculateEdgePath(
  sourceNode: FlowNode,
  targetNode: FlowNode,
  fromPort: PortPosition,
  toPort: PortPosition,
  routeType: RouteType,
  controlPoint?: Point,
  sourcePointOverride?: Point,
  targetPointOverride?: Point
): EdgePathData {
  const p1 = sourcePointOverride || getPortCoordinates(sourceNode, fromPort);
  const p2 = targetPointOverride || getPortCoordinates(targetNode, toPort);

  if (routeType === 'straight') {
    if (controlPoint) {
      const path = `M ${p1.x} ${p1.y} L ${controlPoint.x} ${controlPoint.y} L ${p2.x} ${p2.y}`;
      const labelPosition = { x: controlPoint.x, y: controlPoint.y - 14 };
      return { path, labelPosition, sourcePoint: p1, targetPoint: p2, waypointPosition: controlPoint };
    }
    const path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const labelPosition = {
      x: mid.x,
      y: mid.y - 12
    };
    return { path, labelPosition, sourcePoint: p1, targetPoint: p2, waypointPosition: mid };
  }

  if (routeType === 'curved') {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const curvature = Math.max(24, Math.min(dist * 0.4, 110));

    let t1x = 0;
    let t1y = 0;
    if (fromPort === 'right') t1x = curvature;
    else if (fromPort === 'left') t1x = -curvature;
    else if (fromPort === 'bottom') t1y = curvature;
    else if (fromPort === 'top') t1y = -curvature;

    let t2x = 0;
    let t2y = 0;
    if (toPort === 'right') t2x = curvature;
    else if (toPort === 'left') t2x = -curvature;
    else if (toPort === 'bottom') t2y = curvature;
    else if (toPort === 'top') t2y = -curvature;

    if (controlPoint) {
      // Canva-style smooth cubic Bezier passing gracefully toward controlPoint
      const cp1x = p1.x + t1x * 0.6 + (controlPoint.x - p1.x) * 0.65;
      const cp1y = p1.y + t1y * 0.6 + (controlPoint.y - p1.y) * 0.65;
      const cp2x = p2.x + t2x * 0.6 + (controlPoint.x - p2.x) * 0.65;
      const cp2y = p2.y + t2y * 0.6 + (controlPoint.y - p2.y) * 0.65;

      const path = `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      const labelPosition = {
        x: controlPoint.x,
        y: controlPoint.y - 14
      };
      return { path, labelPosition, sourcePoint: p1, targetPoint: p2, waypointPosition: controlPoint };
    }

    const cp1x = p1.x + t1x;
    const cp1y = p1.y + t1y;
    const cp2x = p2.x + t2x;
    const cp2y = p2.y + t2y;

    const path = `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    // Mathematically exact cubic Bezier midpoint at t = 0.5:
    const midX = Math.round(0.125 * p1.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2.x);
    const midY = Math.round(0.125 * p1.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2.y);
    const labelPosition = {
      x: midX,
      y: midY - 14
    };
    return { path, labelPosition, sourcePoint: p1, targetPoint: p2, waypointPosition: { x: midX, y: midY } };
  }

  // Orthogonal (Smart Step routing)
  if (controlPoint) {
    let points: Point[] = [p1];
    const isHorizontalExit = fromPort === 'left' || fromPort === 'right';
    const isHorizontalEntry = toPort === 'left' || toPort === 'right';

    let activeHandlePoint: Point = controlPoint;

    if (isHorizontalExit && isHorizontalEntry) {
      const midY = (p1.y + p2.y) / 2;
      points = [
        p1,
        { x: controlPoint.x, y: p1.y },
        { x: controlPoint.x, y: p2.y },
        p2
      ];
      activeHandlePoint = { x: controlPoint.x, y: midY };
    } else if (!isHorizontalExit && !isHorizontalEntry) {
      const midX = (p1.x + p2.x) / 2;
      points = [
        p1,
        { x: p1.x, y: controlPoint.y },
        { x: p2.x, y: controlPoint.y },
        p2
      ];
      activeHandlePoint = { x: midX, y: controlPoint.y };
    } else if (isHorizontalExit && !isHorizontalEntry) {
      points = [
        p1,
        { x: controlPoint.x, y: p1.y },
        { x: controlPoint.x, y: p2.y },
        p2
      ];
      activeHandlePoint = { x: controlPoint.x, y: (p1.y + p2.y) / 2 };
    } else {
      points = [
        p1,
        { x: p1.x, y: controlPoint.y },
        { x: p2.x, y: controlPoint.y },
        p2
      ];
      activeHandlePoint = { x: (p1.x + p2.x) / 2, y: controlPoint.y };
    }

    const pathStr = pointsToRoundedPath(points, 10);
    const labelPosition = { x: activeHandlePoint.x, y: activeHandlePoint.y - 14 };
    return { path: pathStr, labelPosition, sourcePoint: p1, targetPoint: p2, waypointPosition: activeHandlePoint };
  }

  const clearance = 24;
  let points: Point[] = [p1];

  if (fromPort === 'right' && toPort === 'left') {
    const midX = (p1.x + p2.x) / 2;
    if (p1.x < p2.x) {
      points = [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
    } else {
      const midY = (p1.y + p2.y) / 2;
      points = [
        p1,
        { x: p1.x + clearance, y: p1.y },
        { x: p1.x + clearance, y: midY },
        { x: p2.x - clearance, y: midY },
        { x: p2.x - clearance, y: p2.y },
        p2
      ];
    }
  } else if (fromPort === 'left' && toPort === 'right') {
    const midX = (p1.x + p2.x) / 2;
    if (p1.x > p2.x) {
      points = [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
    } else {
      const midY = (p1.y + p2.y) / 2;
      points = [
        p1,
        { x: p1.x - clearance, y: p1.y },
        { x: p1.x - clearance, y: midY },
        { x: p2.x + clearance, y: midY },
        { x: p2.x + clearance, y: p2.y },
        p2
      ];
    }
  } else if (fromPort === 'bottom' && toPort === 'top') {
    const midY = (p1.y + p2.y) / 2;
    if (p1.y < p2.y) {
      points = [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
    } else {
      const midX = (p1.x + p2.x) / 2;
      points = [
        p1,
        { x: p1.x, y: p1.y + clearance },
        { x: midX, y: p1.y + clearance },
        { x: midX, y: p2.y - clearance },
        { x: p2.x, y: p2.y - clearance },
        p2
      ];
    }
  } else if (fromPort === 'top' && toPort === 'bottom') {
    const midY = (p1.y + p2.y) / 2;
    if (p1.y > p2.y) {
      points = [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
    } else {
      const midX = (p1.x + p2.x) / 2;
      points = [
        p1,
        { x: p1.x, y: p1.y - clearance },
        { x: midX, y: p1.y - clearance },
        { x: midX, y: p2.y + clearance },
        { x: p2.x, y: p2.y + clearance },
        p2
      ];
    }
  } else if (fromPort === 'top' && toPort === 'top') {
    const minY = Math.min(p1.y, p2.y) - clearance;
    points = [p1, { x: p1.x, y: minY }, { x: p2.x, y: minY }, p2];
  } else if (fromPort === 'bottom' && toPort === 'bottom') {
    const maxY = Math.max(p1.y, p2.y) + clearance;
    points = [p1, { x: p1.x, y: maxY }, { x: p2.x, y: maxY }, p2];
  } else if (fromPort === 'left' && toPort === 'left') {
    const minX = Math.min(p1.x, p2.x) - clearance;
    points = [p1, { x: minX, y: p1.y }, { x: minX, y: p2.y }, p2];
  } else if (fromPort === 'right' && toPort === 'right') {
    const maxX = Math.max(p1.x, p2.x) + clearance;
    points = [p1, { x: maxX, y: p1.y }, { x: maxX, y: p2.y }, p2];
  } else if (fromPort === 'left' && toPort === 'bottom') {
    points = [p1, { x: p2.x, y: p1.y }, p2];
  } else if (fromPort === 'bottom' && toPort === 'left') {
    points = [p1, { x: p1.x, y: p2.y }, p2];
  } else if (fromPort === 'right' && toPort === 'top') {
    points = [p1, { x: p2.x, y: p1.y }, p2];
  } else if (fromPort === 'top' && toPort === 'right') {
    points = [p1, { x: p1.x, y: p2.y }, p2];
  } else if (fromPort === 'right' && toPort === 'bottom') {
    points = [p1, { x: p2.x, y: p1.y }, p2];
  } else if (fromPort === 'bottom' && toPort === 'right') {
    points = [p1, { x: p1.x, y: p2.y }, p2];
  } else if (fromPort === 'left' && toPort === 'top') {
    points = [p1, { x: p2.x, y: p1.y }, p2];
  } else if (fromPort === 'top' && toPort === 'left') {
    points = [p1, { x: p1.x, y: p2.y }, p2];
  } else {
    // Directional escape fallback
    const startX = fromPort === 'left' ? p1.x - clearance : fromPort === 'right' ? p1.x + clearance : p1.x;
    const startY = fromPort === 'top' ? p1.y - clearance : fromPort === 'bottom' ? p1.y + clearance : p1.y;
    const endX = toPort === 'left' ? p2.x - clearance : toPort === 'right' ? p2.x + clearance : p2.x;
    const endY = toPort === 'top' ? p2.y - clearance : toPort === 'bottom' ? p2.y + clearance : p2.y;
    points = [p1, { x: startX, y: startY }, { x: endX, y: endY }, p2];
  }

  // Build SVG path with Canva-style smooth rounded corners
  const pathStr = pointsToRoundedPath(points, 10);

  // Compute best midpoint for label and waypoint handle
  let midPoint: Point = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 14 };
  let waypointCenter: Point = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  if (points.length >= 3) {
    // Place handle on longest middle segment
    let maxSegLen = 0;
    let bestSegIdx = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const segLen = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      if (segLen > maxSegLen) {
        maxSegLen = segLen;
        bestSegIdx = i;
      }
    }
    waypointCenter = {
      x: (points[bestSegIdx].x + points[bestSegIdx + 1].x) / 2,
      y: (points[bestSegIdx].y + points[bestSegIdx + 1].y) / 2
    };
    midPoint = {
      x: waypointCenter.x,
      y: waypointCenter.y - 12
    };
  }

  return {
    path: pathStr,
    labelPosition: midPoint,
    sourcePoint: p1,
    targetPoint: p2,
    waypointPosition: waypointCenter
  };
}
