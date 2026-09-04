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

/**
 * Returns the exact canvas coordinates of a node's connection port.
 */
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
 * Normal vector pointing outward from the given port.
 */
export function getPortNormal(port: PortPosition): Point {
  switch (port) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    default:
      return { x: 0, y: 1 };
  }
}

/**
 * Automatically calculates the cleanest, most natural port pair between two nodes.
 */
export function getBestPortPair(
  sourceNode: FlowNode,
  targetNode: FlowNode
): { fromPort: PortPosition; toPort: PortPosition } {
  const ports: PortPosition[] = ['top', 'right', 'bottom', 'left'];
  let bestPair: { fromPort: PortPosition; toPort: PortPosition } = { fromPort: 'right', toPort: 'left' };
  let minScore = Infinity;

  const srcCenter = { x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y + sourceNode.height / 2 };
  const tgtCenter = { x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 };
  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  for (const fp of ports) {
    const sp = getPortCoordinates(sourceNode, fp);
    const fn = getPortNormal(fp);
    for (const tp of ports) {
      const tpCoord = getPortCoordinates(targetNode, tp);
      const tn = getPortNormal(tp);

      const dist = Math.hypot(tpCoord.x - sp.x, tpCoord.y - sp.y);
      const dotSrc = fn.x * dx + fn.y * dy;
      const dotTgt = tn.x * (-dx) + tn.y * (-dy);

      let penalty = 0;
      if (dotSrc < 0) penalty += 200;
      if (dotTgt < 0) penalty += 200;

      const score = dist + penalty;
      if (score < minScore) {
        minScore = score;
        bestPair = { fromPort: fp, toPort: tp };
      }
    }
  }
  return bestPair;
}

/**
 * Simplifies a polyline by removing consecutive duplicate points and collinear intermediate points.
 */
export function simplifyPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  // 1. Remove duplicate points
  const noDups: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = noDups[noDups.length - 1];
    const curr = points[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 0.5) {
      noDups.push(curr);
    }
  }

  if (noDups.length <= 2) return noDups;

  // 2. Remove collinear intermediate points
  const simplified: Point[] = [noDups[0]];
  for (let i = 1; i < noDups.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = noDups[i];
    const next = noDups[i + 1];

    const isCollinearX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const isCollinearY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;

    if (!isCollinearX && !isCollinearY) {
      simplified.push(curr);
    }
  }
  simplified.push(noDups[noDups.length - 1]);
  return simplified;
}

/**
 * Converts a sequence of points to an SVG path with crisp, subtle rounded corners.
 * For elbow connectors, radius is 4-5px so right angles stay distinctly 90 degrees.
 */
export function pointsToRoundedPath(points: Point[], radius: number = 4): string {
  const pts = simplifyPoints(points);
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const dPrevX = prev.x - curr.x;
    const dPrevY = prev.y - curr.y;
    const lenPrev = Math.hypot(dPrevX, dPrevY);

    const dNextX = next.x - curr.x;
    const dNextY = next.y - curr.y;
    const lenNext = Math.hypot(dNextX, dNextY);

    if (lenPrev < 0.5 || lenNext < 0.5) continue;

    const r = Math.min(radius, lenPrev / 2, lenNext / 2);
    const startX = curr.x + (dPrevX / lenPrev) * r;
    const startY = curr.y + (dPrevY / lenPrev) * r;
    const endX = curr.x + (dNextX / lenNext) * r;
    const endY = curr.y + (dNextY / lenNext) * r;

    d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
  }

  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

/**
 * Computes obstacle-aware Manhattan orthogonal polyline points between two ports.
 * Guarantees strict 90-degree right angles with crisp corners and intuitive waypoint dragging.
 */
function computeOrthogonalPoints(
  sourceNode: FlowNode,
  targetNode: FlowNode,
  p1: Point,
  p2: Point,
  fromPort: PortPosition,
  toPort: PortPosition,
  controlPoint?: Point
): { points: Point[]; waypoint: Point } {
  const norm1 = getPortNormal(fromPort);
  const norm2 = getPortNormal(toPort);
  const stub = 20;

  const isHExit = fromPort === 'left' || fromPort === 'right';
  const isHEntry = toPort === 'left' || toPort === 'right';

  const p1Stub = { x: p1.x + norm1.x * stub, y: p1.y + norm1.y * stub };
  const p2Stub = { x: p2.x + norm2.x * stub, y: p2.y + norm2.y * stub };

  const margin = 16;
  const srcBox = {
    minX: sourceNode.x - margin,
    maxX: sourceNode.x + sourceNode.width + margin,
    minY: sourceNode.y - margin,
    maxY: sourceNode.y + sourceNode.height + margin
  };
  const tgtBox = {
    minX: targetNode.x - margin,
    maxX: targetNode.x + targetNode.width + margin,
    minY: targetNode.y - margin,
    maxY: targetNode.y + targetNode.height + margin
  };

  let points: Point[] = [];
  let waypoint: Point = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  // =========================================================================
  // Case 1: Horizontal to Horizontal (Left/Right -> Left/Right)
  // =========================================================================
  if (isHExit && isHEntry) {
    const baseY = (p1.y + p2.y) / 2;

    if (fromPort === 'right' && toPort === 'left') {
      if (controlPoint) {
        // If user dragged vertically away from baseline (> 12px), create overhead/underhead bridge
        if (Math.abs(controlPoint.y - baseY) > 12) {
          points = [
            p1,
            { x: p1Stub.x, y: p1.y },
            { x: p1Stub.x, y: controlPoint.y },
            { x: p2Stub.x, y: controlPoint.y },
            { x: p2Stub.x, y: p2.y },
            p2
          ];
          waypoint = { x: (p1Stub.x + p2Stub.x) / 2, y: controlPoint.y };
        } else {
          // User shifted the vertical step horizontally
          const minX = p1Stub.x;
          const maxX = p2Stub.x;
          const stepX = minX < maxX
            ? Math.max(minX, Math.min(controlPoint.x, maxX))
            : controlPoint.x;
          points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
          waypoint = { x: stepX, y: baseY };
        }
      } else {
        // Natural
        if (p2.x >= p1.x + 2 * stub) {
          // Clean 3-segment S-step
          const midX = (p1.x + p2.x) / 2;
          points = [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
          waypoint = { x: midX, y: baseY };
        } else {
          // Target is behind source: route around nodes
          const canRouteBetween = tgtBox.minY >= srcBox.maxY || srcBox.minY >= tgtBox.maxY;
          let corridorY = baseY;
          if (!canRouteBetween) {
            const topCorridor = Math.min(srcBox.minY, tgtBox.minY) - 14;
            const btmCorridor = Math.max(srcBox.maxY, tgtBox.maxY) + 14;
            corridorY = Math.abs(baseY - topCorridor) < Math.abs(baseY - btmCorridor) ? topCorridor : btmCorridor;
          }
          points = [
            p1,
            { x: p1Stub.x, y: p1.y },
            { x: p1Stub.x, y: corridorY },
            { x: p2Stub.x, y: corridorY },
            { x: p2Stub.x, y: p2.y },
            p2
          ];
          waypoint = { x: (p1Stub.x + p2Stub.x) / 2, y: corridorY };
        }
      }
    } else if (fromPort === 'left' && toPort === 'right') {
      if (controlPoint) {
        if (Math.abs(controlPoint.y - baseY) > 12) {
          points = [
            p1,
            { x: p1Stub.x, y: p1.y },
            { x: p1Stub.x, y: controlPoint.y },
            { x: p2Stub.x, y: controlPoint.y },
            { x: p2Stub.x, y: p2.y },
            p2
          ];
          waypoint = { x: (p1Stub.x + p2Stub.x) / 2, y: controlPoint.y };
        } else {
          const minX = p2Stub.x;
          const maxX = p1Stub.x;
          const stepX = minX < maxX
            ? Math.max(minX, Math.min(controlPoint.x, maxX))
            : controlPoint.x;
          points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
          waypoint = { x: stepX, y: baseY };
        }
      } else {
        if (p2.x <= p1.x - 2 * stub) {
          const midX = (p1.x + p2.x) / 2;
          points = [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
          waypoint = { x: midX, y: baseY };
        } else {
          const canRouteBetween = tgtBox.minY >= srcBox.maxY || srcBox.minY >= tgtBox.maxY;
          let corridorY = baseY;
          if (!canRouteBetween) {
            const topCorridor = Math.min(srcBox.minY, tgtBox.minY) - 14;
            const btmCorridor = Math.max(srcBox.maxY, tgtBox.maxY) + 14;
            corridorY = Math.abs(baseY - topCorridor) < Math.abs(baseY - btmCorridor) ? topCorridor : btmCorridor;
          }
          points = [
            p1,
            { x: p1Stub.x, y: p1.y },
            { x: p1Stub.x, y: corridorY },
            { x: p2Stub.x, y: corridorY },
            { x: p2Stub.x, y: p2.y },
            p2
          ];
          waypoint = { x: (p1Stub.x + p2Stub.x) / 2, y: corridorY };
        }
      }
    } else if (fromPort === 'right' && toPort === 'right') {
      const stepX = controlPoint
        ? Math.max(controlPoint.x, Math.max(p1.x, p2.x) + stub)
        : Math.max(srcBox.maxX, tgtBox.maxX) + 14;
      points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
      waypoint = { x: stepX, y: baseY };
    } else {
      // left to left
      const stepX = controlPoint
        ? Math.min(controlPoint.x, Math.min(p1.x, p2.x) - stub)
        : Math.min(srcBox.minX, tgtBox.minX) - 14;
      points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
      waypoint = { x: stepX, y: baseY };
    }
  }
  // =========================================================================
  // Case 2: Vertical to Vertical (Top/Bottom -> Top/Bottom)
  // =========================================================================
  else if (!isHExit && !isHEntry) {
    const baseX = (p1.x + p2.x) / 2;

    if (fromPort === 'bottom' && toPort === 'top') {
      if (controlPoint) {
        if (Math.abs(controlPoint.x - baseX) > 12) {
          // Side bridge at controlPoint.x
          points = [
            p1,
            { x: p1.x, y: p1Stub.y },
            { x: controlPoint.x, y: p1Stub.y },
            { x: controlPoint.x, y: p2Stub.y },
            { x: p2.x, y: p2Stub.y },
            p2
          ];
          waypoint = { x: controlPoint.x, y: (p1Stub.y + p2Stub.y) / 2 };
        } else {
          // Shift horizontal step vertically
          const minY = p1Stub.y;
          const maxY = p2Stub.y;
          const stepY = minY < maxY
            ? Math.max(minY, Math.min(controlPoint.y, maxY))
            : controlPoint.y;
          points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
          waypoint = { x: baseX, y: stepY };
        }
      } else {
        if (p2.y >= p1.y + 2 * stub) {
          const midY = (p1.y + p2.y) / 2;
          points = [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
          waypoint = { x: baseX, y: midY };
        } else {
          const canRouteBetween = tgtBox.minX >= srcBox.maxX || srcBox.minX >= tgtBox.maxX;
          let corridorX = baseX;
          if (!canRouteBetween) {
            const leftCorridor = Math.min(srcBox.minX, tgtBox.minX) - 14;
            const rightCorridor = Math.max(srcBox.maxX, tgtBox.maxX) + 14;
            corridorX = Math.abs(baseX - leftCorridor) < Math.abs(baseX - rightCorridor) ? leftCorridor : rightCorridor;
          }
          points = [
            p1,
            { x: p1.x, y: p1Stub.y },
            { x: corridorX, y: p1Stub.y },
            { x: corridorX, y: p2Stub.y },
            { x: p2.x, y: p2Stub.y },
            p2
          ];
          waypoint = { x: corridorX, y: (p1Stub.y + p2Stub.y) / 2 };
        }
      }
    } else if (fromPort === 'top' && toPort === 'bottom') {
      if (controlPoint) {
        if (Math.abs(controlPoint.x - baseX) > 12) {
          points = [
            p1,
            { x: p1.x, y: p1Stub.y },
            { x: controlPoint.x, y: p1Stub.y },
            { x: controlPoint.x, y: p2Stub.y },
            { x: p2.x, y: p2Stub.y },
            p2
          ];
          waypoint = { x: controlPoint.x, y: (p1Stub.y + p2Stub.y) / 2 };
        } else {
          const minY = p2Stub.y;
          const maxY = p1Stub.y;
          const stepY = minY < maxY
            ? Math.max(minY, Math.min(controlPoint.y, maxY))
            : controlPoint.y;
          points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
          waypoint = { x: baseX, y: stepY };
        }
      } else {
        if (p2.y <= p1.y - 2 * stub) {
          const midY = (p1.y + p2.y) / 2;
          points = [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
          waypoint = { x: baseX, y: midY };
        } else {
          const canRouteBetween = tgtBox.minX >= srcBox.maxX || srcBox.minX >= tgtBox.maxX;
          let corridorX = baseX;
          if (!canRouteBetween) {
            const leftCorridor = Math.min(srcBox.minX, tgtBox.minX) - 14;
            const rightCorridor = Math.max(srcBox.maxX, tgtBox.maxX) + 14;
            corridorX = Math.abs(baseX - leftCorridor) < Math.abs(baseX - rightCorridor) ? leftCorridor : rightCorridor;
          }
          points = [
            p1,
            { x: p1.x, y: p1Stub.y },
            { x: corridorX, y: p1Stub.y },
            { x: corridorX, y: p2Stub.y },
            { x: p2.x, y: p2Stub.y },
            p2
          ];
          waypoint = { x: corridorX, y: (p1Stub.y + p2Stub.y) / 2 };
        }
      }
    } else if (fromPort === 'bottom' && toPort === 'bottom') {
      const stepY = controlPoint
        ? Math.max(controlPoint.y, Math.max(p1.y, p2.y) + stub)
        : Math.max(srcBox.maxY, tgtBox.maxY) + 14;
      points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
      waypoint = { x: baseX, y: stepY };
    } else {
      // top to top
      const stepY = controlPoint
        ? Math.min(controlPoint.y, Math.min(p1.y, p2.y) - stub)
        : Math.min(srcBox.minY, tgtBox.minY) - 14;
      points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
      waypoint = { x: baseX, y: stepY };
    }
  }
  // =========================================================================
  // Case 3: Horizontal Exit & Vertical Entry (Right/Left -> Top/Bottom)
  // =========================================================================
  else if (isHExit && !isHEntry) {
    if (controlPoint) {
      points = [p1, { x: controlPoint.x, y: p1.y }, { x: controlPoint.x, y: p2.y }, p2];
      waypoint = { x: controlPoint.x, y: (p1.y + p2.y) / 2 };
    } else {
      const isExitRight = fromPort === 'right';
      const isEntryBottom = toPort === 'bottom';

      const xDiff = (p2.x - p1.x) * (isExitRight ? 1 : -1);
      const yDiff = (p2.y - p1.y) * (isEntryBottom ? -1 : 1);

      if (xDiff >= stub && yDiff >= stub) {
        // Clean single L-turn
        points = [p1, { x: p2.x, y: p1.y }, p2];
        waypoint = { x: p2.x, y: p1.y };
      } else {
        const stepX = p1Stub.x;
        const stepY = p2Stub.y;
        points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: stepY }, { x: p2.x, y: stepY }, p2];
        waypoint = { x: stepX, y: stepY };
      }
    }
  }
  // =========================================================================
  // Case 4: Vertical Exit & Horizontal Entry (Top/Bottom -> Right/Left)
  // =========================================================================
  else {
    if (controlPoint) {
      points = [p1, { x: p1.x, y: controlPoint.y }, { x: p2.x, y: controlPoint.y }, p2];
      waypoint = { x: (p1.x + p2.x) / 2, y: controlPoint.y };
    } else {
      const isExitBottom = fromPort === 'bottom';
      const isEntryRight = toPort === 'right';

      const yDiff = (p2.y - p1.y) * (isExitBottom ? 1 : -1);
      const xDiff = (p2.x - p1.x) * (isEntryRight ? -1 : 1);

      if (yDiff >= stub && xDiff >= stub) {
        // Clean single L-turn
        points = [p1, { x: p1.x, y: p2.y }, p2];
        waypoint = { x: p1.x, y: p2.y };
      } else {
        const stepY = p1Stub.y;
        const stepX = p2Stub.x;
        points = [p1, { x: p1.x, y: stepY }, { x: stepX, y: stepY }, { x: stepX, y: p2.y }, p2];
        waypoint = { x: stepX, y: stepY };
      }
    }
  }

  const cleanPoints = simplifyPoints(points);
  return { points: cleanPoints, waypoint };
}

/**
 * Main Path Calculation Engine for FlowConnectors.
 * Generates mathematically sound SVG paths, label positions, endpoints, and waypoint handles.
 */
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

  // =========================================================================
  // STRAIGHT ROUTE
  // =========================================================================
  if (routeType === 'straight') {
    if (controlPoint) {
      const path = `M ${p1.x} ${p1.y} L ${controlPoint.x} ${controlPoint.y} L ${p2.x} ${p2.y}`;
      const labelPosition = { x: controlPoint.x, y: controlPoint.y - 14 };
      return { path, labelPosition, sourcePoint: p1, targetPoint: p2, waypointPosition: controlPoint };
    }
    const path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    return {
      path,
      labelPosition: { x: mid.x, y: mid.y - 12 },
      sourcePoint: p1,
      targetPoint: p2,
      waypointPosition: mid
    };
  }

  // =========================================================================
  // CURVED ROUTE (Figma / Canva Grade Cubic Bézier with Exact Waypoint Tracking)
  // =========================================================================
  if (routeType === 'curved') {
    // Exact quadratic Bézier through controlPoint at t = 0.5:
    // B(0.5) = 0.25*P1 + 0.5*C + 0.25*P2 = W  =>  C = 2*W - 0.5*(P1 + P2)
    if (controlPoint) {
      const cx = 2 * controlPoint.x - 0.5 * (p1.x + p2.x);
      const cy = 2 * controlPoint.y - 0.5 * (p1.y + p2.y);
      const path = `M ${p1.x} ${p1.y} Q ${cx} ${cy}, ${p2.x} ${p2.y}`;
      return {
        path,
        labelPosition: { x: controlPoint.x, y: controlPoint.y - 14 },
        sourcePoint: p1,
        targetPoint: p2,
        waypointPosition: controlPoint
      };
    }

    // Natural curve: project control vectors outward from port normals
    const norm1 = getPortNormal(fromPort);
    const norm2 = getPortNormal(toPort);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    const isOppositeH = (fromPort === 'right' && toPort === 'left') || (fromPort === 'left' && toPort === 'right');
    const isOppositeV = (fromPort === 'bottom' && toPort === 'top') || (fromPort === 'top' && toPort === 'bottom');

    let offset1 = Math.max(32, Math.min(dist * 0.45, 180));
    let offset2 = offset1;

    if (isOppositeH) {
      const facing = fromPort === 'right' ? dx > 0 : dx < 0;
      if (facing) {
        offset1 = Math.max(28, Math.min(Math.abs(dx) * 0.5, 200));
        offset2 = offset1;
      }
    } else if (isOppositeV) {
      const facing = fromPort === 'bottom' ? dy > 0 : dy < 0;
      if (facing) {
        offset1 = Math.max(28, Math.min(Math.abs(dy) * 0.5, 200));
        offset2 = offset1;
      }
    }

    const cp1 = { x: p1.x + norm1.x * offset1, y: p1.y + norm1.y * offset1 };
    const cp2 = { x: p2.x + norm2.x * offset2, y: p2.y + norm2.y * offset2 };

    const path = `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;

    // Exact mathematical cubic Bézier midpoint at t = 0.5:
    const midX = Math.round(0.125 * p1.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p2.x);
    const midY = Math.round(0.125 * p1.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p2.y);
    const waypoint = { x: midX, y: midY };

    return {
      path,
      labelPosition: { x: midX, y: midY - 14 },
      sourcePoint: p1,
      targetPoint: p2,
      waypointPosition: waypoint
    };
  }

  // =========================================================================
  // ORTHOGONAL (Manhattan Smart Step with obstacle avoidance & crisp right angles)
  // =========================================================================
  const { points, waypoint } = computeOrthogonalPoints(
    sourceNode,
    targetNode,
    p1,
    p2,
    fromPort,
    toPort,
    controlPoint
  );

  // Crisp radius 4px ensures clean, distinct right-angle corners without diagonal slants
  const path = pointsToRoundedPath(points, 4);
  return {
    path,
    labelPosition: { x: waypoint.x, y: waypoint.y - 14 },
    sourcePoint: p1,
    targetPoint: p2,
    waypointPosition: waypoint
  };
}
