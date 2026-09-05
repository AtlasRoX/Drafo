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
  waypointPositions?: Point[];
}

/**
 * Returns the exact canvas coordinates of a node's connection port.
 */
export function getPortCoordinates(node: FlowNode, port: PortPosition): Point {
  switch (port) {
    case 'top':
      return { x: Math.round(node.x + node.width / 2), y: Math.round(node.y) };
    case 'right':
      return { x: Math.round(node.x + node.width), y: Math.round(node.y + node.height / 2) };
    case 'bottom':
      return { x: Math.round(node.x + node.width / 2), y: Math.round(node.y + node.height) };
    case 'left':
      return { x: Math.round(node.x), y: Math.round(node.y + node.height / 2) };
    default:
      return { x: Math.round(node.x + node.width / 2), y: Math.round(node.y + node.height / 2) };
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

  const pts = points.map((p) => ({ ...p }));

  // 1. Backward pass: if any step between pts[i] and pts[i+1] is <= 14px, align to pts[i+1]
  for (let i = pts.length - 2; i >= 0; i--) {
    const diffY = Math.abs(pts[i].y - pts[i + 1].y);
    if (diffY > 0 && diffY <= 14) {
      pts[i].y = pts[i + 1].y;
    }
    const diffX = Math.abs(pts[i].x - pts[i + 1].x);
    if (diffX > 0 && diffX <= 14) {
      pts[i].x = pts[i + 1].x;
    }
  }

  // 2. Forward pass: align small jogs from source
  for (let i = 1; i < pts.length; i++) {
    const diffY = Math.abs(pts[i].y - pts[i - 1].y);
    if (diffY > 0 && diffY <= 14) {
      pts[i].y = pts[i - 1].y;
    }
    const diffX = Math.abs(pts[i].x - pts[i - 1].x);
    if (diffX > 0 && diffX <= 14) {
      pts[i].x = pts[i - 1].x;
    }
  }

  // 3. Remove consecutive duplicate points (< 0.5px apart)
  const noDups: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (Math.hypot(pts[i].x - noDups[noDups.length - 1].x, pts[i].y - noDups[noDups.length - 1].y) > 0.5) {
      noDups.push(pts[i]);
    }
  }

  if (noDups.length <= 2) return noDups;

  // 4. Remove collinear intermediate points
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

    // Ensure the last 14px before the target port and first 14px after the source port remain strictly straight
    const isLastTurn = i === pts.length - 2;
    const maxNextR = isLastTurn ? Math.max(0, lenNext - 14) : lenNext / 2;
    const isFirstTurn = i === 1;
    const maxPrevR = isFirstTurn ? Math.max(0, lenPrev - 14) : lenPrev / 2;

    const r = Math.min(radius, maxPrevR, maxNextR);

    if (r <= 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

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

  const baseY = Math.round((p1.y + p2.y) / 2);
  const baseX = Math.round((p1.x + p2.x) / 2);

  // Magnetic snap controlPoint if close to port coordinates or baseline
  let cp: Point | undefined = controlPoint ? { ...controlPoint } : undefined;
  if (cp) {
    if (Math.abs(cp.y - p2.y) <= 18) cp.y = p2.y;
    else if (Math.abs(cp.y - p1.y) <= 18) cp.y = p1.y;
    else if (Math.abs(cp.y - baseY) <= 18) cp.y = baseY;

    if (Math.abs(cp.x - p2.x) <= 18) cp.x = p2.x;
    else if (Math.abs(cp.x - p1.x) <= 18) cp.x = p1.x;
    else if (Math.abs(cp.x - baseX) <= 18) cp.x = baseX;
  }

  // =========================================================================
  // Case 1: Horizontal to Horizontal (Left/Right -> Left/Right)
  // =========================================================================
  if (isHExit && isHEntry) {
    if (fromPort === 'right' && toPort === 'left') {
      const isCollinear = Math.abs(p1.y - p2.y) <= 16;
      const isDetour =
        cp !== undefined &&
        Math.abs(cp.y - p1.y) > 16 &&
        Math.abs(cp.y - p2.y) > 16 &&
        Math.abs(cp.y - baseY) > 16;

      if (isCollinear && !isDetour && p2.x >= p1.x) {
        // Collinear / horizontally aligned: draw a single straight horizontal line
        const straightY = p2.y;
        points = [{ x: p1.x, y: straightY }, { x: p2.x, y: straightY }];
        const minX = p1.x;
        const maxX = p2.x;
        const handleX = cp ? Math.max(minX, Math.min(cp.x, maxX)) : baseX;
        waypoint = { x: handleX, y: straightY };
      } else if (!isDetour) {
        // Clean S-step (natural or user-guided stepX) - NO micro-jogs near p2 or p1!
        const minX = Math.min(p1Stub.x, p2Stub.x);
        const maxX = Math.max(p1Stub.x, p2Stub.x);
        const stepX = cp
          ? (minX < maxX ? Math.max(minX, Math.min(cp.x, maxX)) : cp.x)
          : baseX;
        points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
        waypoint = { x: stepX, y: baseY };
      } else {
        // Explicit Detour (waypoint dragged far above or below both nodes)
        const minX = p1Stub.x;
        const maxX = p2Stub.x;
        const handleX = minX < maxX ? Math.max(minX, Math.min(cp!.x, maxX)) : cp!.x;
        const targetY = Math.abs(cp!.y - p2.y) <= 16 ? p2.y : cp!.y;
        points = [
          p1,
          { x: p1Stub.x, y: p1.y },
          { x: p1Stub.x, y: targetY },
          { x: p2Stub.x, y: targetY },
          { x: p2Stub.x, y: p2.y },
          p2
        ];
        waypoint = { x: handleX, y: targetY };
      }
    } else if (fromPort === 'left' && toPort === 'right') {
      const isCollinear = Math.abs(p1.y - p2.y) <= 16;
      const isDetour =
        cp !== undefined &&
        Math.abs(cp.y - p1.y) > 16 &&
        Math.abs(cp.y - p2.y) > 16 &&
        Math.abs(cp.y - baseY) > 16;

      if (isCollinear && !isDetour && p2.x <= p1.x) {
        const straightY = p2.y;
        points = [{ x: p1.x, y: straightY }, { x: p2.x, y: straightY }];
        const minX = p2.x;
        const maxX = p1.x;
        const handleX = cp ? Math.max(minX, Math.min(cp.x, maxX)) : baseX;
        waypoint = { x: handleX, y: straightY };
      } else if (!isDetour) {
        const minX = Math.min(p2Stub.x, p1Stub.x);
        const maxX = Math.max(p2Stub.x, p1Stub.x);
        const stepX = cp
          ? (minX < maxX ? Math.max(minX, Math.min(cp.x, maxX)) : cp.x)
          : baseX;
        points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
        waypoint = { x: stepX, y: baseY };
      } else {
        const minX = p2Stub.x;
        const maxX = p1Stub.x;
        const handleX = minX < maxX ? Math.max(minX, Math.min(cp!.x, maxX)) : cp!.x;
        const targetY = Math.abs(cp!.y - p2.y) <= 16 ? p2.y : cp!.y;
        points = [
          p1,
          { x: p1Stub.x, y: p1.y },
          { x: p1Stub.x, y: targetY },
          { x: p2Stub.x, y: targetY },
          { x: p2Stub.x, y: p2.y },
          p2
        ];
        waypoint = { x: handleX, y: targetY };
      }
    } else if (fromPort === 'right' && toPort === 'right') {
      const stepX = cp
        ? Math.max(cp.x, Math.max(p1.x, p2.x) + stub)
        : Math.max(srcBox.maxX, tgtBox.maxX) + 14;
      points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
      waypoint = { x: stepX, y: baseY };
    } else {
      // left to left
      const stepX = cp
        ? Math.min(cp.x, Math.min(p1.x, p2.x) - stub)
        : Math.min(srcBox.minX, tgtBox.minX) - 14;
      points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: p2.y }, p2];
      waypoint = { x: stepX, y: baseY };
    }
  }
  // =========================================================================
  // Case 2: Vertical to Vertical (Top/Bottom -> Top/Bottom)
  // =========================================================================
  else if (!isHExit && !isHEntry) {
    if (fromPort === 'bottom' && toPort === 'top') {
      const isCollinear = Math.abs(p1.x - p2.x) <= 16;
      const isDetour =
        cp !== undefined &&
        Math.abs(cp.x - p1.x) > 16 &&
        Math.abs(cp.x - p2.x) > 16 &&
        Math.abs(cp.x - baseX) > 16;

      if (isCollinear && !isDetour && p2.y >= p1.y) {
        const straightX = p2.x;
        points = [{ x: straightX, y: p1.y }, { x: straightX, y: p2.y }];
        const minY = p1.y;
        const maxY = p2.y;
        const handleY = cp ? Math.max(minY, Math.min(cp.y, maxY)) : baseY;
        waypoint = { x: straightX, y: handleY };
      } else if (!isDetour) {
        const minY = Math.min(p1Stub.y, p2Stub.y);
        const maxY = Math.max(p1Stub.y, p2Stub.y);
        const stepY = cp
          ? (minY < maxY ? Math.max(minY, Math.min(cp.y, maxY)) : cp.y)
          : baseY;
        points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
        waypoint = { x: baseX, y: stepY };
      } else {
        const minY = p1Stub.y;
        const maxY = p2Stub.y;
        const handleY = minY < maxY ? Math.max(minY, Math.min(cp!.y, maxY)) : cp!.y;
        const targetX = Math.abs(cp!.x - p2.x) <= 16 ? p2.x : cp!.x;
        points = [
          p1,
          { x: p1.x, y: p1Stub.y },
          { x: targetX, y: p1Stub.y },
          { x: targetX, y: p2Stub.y },
          { x: p2.x, y: p2Stub.y },
          p2
        ];
        waypoint = { x: targetX, y: handleY };
      }
    } else if (fromPort === 'top' && toPort === 'bottom') {
      const isCollinear = Math.abs(p1.x - p2.x) <= 16;
      const isDetour =
        cp !== undefined &&
        Math.abs(cp.x - p1.x) > 16 &&
        Math.abs(cp.x - p2.x) > 16 &&
        Math.abs(cp.x - baseX) > 16;

      if (isCollinear && !isDetour && p2.y <= p1.y) {
        const straightX = p2.x;
        points = [{ x: straightX, y: p1.y }, { x: straightX, y: p2.y }];
        const minY = p2.y;
        const maxY = p1.y;
        const handleY = cp ? Math.max(minY, Math.min(cp.y, maxY)) : baseY;
        waypoint = { x: straightX, y: handleY };
      } else if (!isDetour) {
        const minY = Math.min(p2Stub.y, p1Stub.y);
        const maxY = Math.max(p2Stub.y, p1Stub.y);
        const stepY = cp
          ? (minY < maxY ? Math.max(minY, Math.min(cp.y, maxY)) : cp.y)
          : baseY;
        points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
        waypoint = { x: baseX, y: stepY };
      } else {
        const minY = p2Stub.y;
        const maxY = p1Stub.y;
        const handleY = minY < maxY ? Math.max(minY, Math.min(cp!.y, maxY)) : cp!.y;
        const targetX = Math.abs(cp!.x - p2.x) <= 16 ? p2.x : cp!.x;
        points = [
          p1,
          { x: p1.x, y: p1Stub.y },
          { x: targetX, y: p1Stub.y },
          { x: targetX, y: p2Stub.y },
          { x: p2.x, y: p2Stub.y },
          p2
        ];
        waypoint = { x: targetX, y: handleY };
      }
    } else if (fromPort === 'bottom' && toPort === 'bottom') {
      const stepY = cp
        ? Math.max(cp.y, Math.max(p1.y, p2.y) + stub)
        : Math.max(srcBox.maxY, tgtBox.maxY) + 14;
      points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
      waypoint = { x: baseX, y: stepY };
    } else {
      // top to top
      const stepY = cp
        ? Math.min(cp.y, Math.min(p1.y, p2.y) - stub)
        : Math.min(srcBox.minY, tgtBox.minY) - 14;
      points = [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
      waypoint = { x: baseX, y: stepY };
    }
  }
  // =========================================================================
  // Case 3: Horizontal Exit & Vertical Entry (Right/Left -> Top/Bottom)
  // =========================================================================
  else if (isHExit && !isHEntry) {
    const targetX = p2.x;
    const sourceY = p1.y;

    if (cp) {
      if (Math.abs(cp.x - targetX) <= 16) cp.x = targetX;
      if (Math.abs(cp.y - sourceY) <= 16) cp.y = sourceY;

      if (cp.x === targetX) {
        // Direct clean L-turn
        points = [p1, { x: targetX, y: sourceY }, p2];
        waypoint = { x: targetX, y: Math.round((sourceY + p2.y) / 2) };
      } else {
        points = [p1, { x: cp.x, y: sourceY }, { x: cp.x, y: p2.y }, p2];
        waypoint = { x: cp.x, y: Math.round((sourceY + p2.y) / 2) };
      }
    } else {
      const isExitRight = fromPort === 'right';
      const isEntryBottom = toPort === 'bottom';

      const xDiff = (p2.x - p1.x) * (isExitRight ? 1 : -1);
      const yDiff = (p2.y - p1.y) * (isEntryBottom ? -1 : 1);

      if (Math.abs(p1.x - p2.x) <= 16 || (xDiff >= 0 && yDiff >= 0)) {
        // Clean single L-turn directly into vertical entry p2
        points = [p1, { x: p2.x, y: p1.y }, p2];
        waypoint = { x: p2.x, y: p1.y };
      } else {
        const stepX = p1Stub.x;
        const stepY = Math.round((p1.y + p2.y) / 2);
        points = [p1, { x: stepX, y: p1.y }, { x: stepX, y: stepY }, { x: p2.x, y: stepY }, p2];
        waypoint = { x: stepX, y: stepY };
      }
    }
  }
  // =========================================================================
  // Case 4: Vertical Exit & Horizontal Entry (Top/Bottom -> Right/Left)
  // =========================================================================
  else {
    const sourceX = p1.x;
    const targetY = p2.y;

    if (cp) {
      if (Math.abs(cp.y - targetY) <= 16) cp.y = targetY;
      if (Math.abs(cp.x - sourceX) <= 16) cp.x = sourceX;

      if (cp.y === targetY) {
        // Direct clean L-turn
        points = [p1, { x: sourceX, y: targetY }, p2];
        waypoint = { x: Math.round((sourceX + p2.x) / 2), y: targetY };
      } else {
        points = [p1, { x: sourceX, y: cp.y }, { x: p2.x, y: cp.y }, p2];
        waypoint = { x: Math.round((sourceX + p2.x) / 2), y: cp.y };
      }
    } else {
      const isExitBottom = fromPort === 'bottom';
      const isEntryRight = toPort === 'right';

      const yDiff = (p2.y - p1.y) * (isExitBottom ? 1 : -1);
      const xDiff = (p2.x - p1.x) * (isEntryRight ? -1 : 1);

      if (Math.abs(p1.y - p2.y) <= 16 || (yDiff >= 0 && xDiff >= 0)) {
        // Clean single L-turn directly into horizontal entry p2
        points = [p1, { x: p1.x, y: p2.y }, p2];
        waypoint = { x: p1.x, y: p2.y };
      } else {
        const stepY = p1Stub.y;
        const stepX = Math.round((p1.x + p2.x) / 2);
        points = [p1, { x: p1.x, y: stepY }, { x: stepX, y: stepY }, { x: stepX, y: p2.y }, p2];
        waypoint = { x: stepX, y: stepY };
      }
    }
  }

  const cleanPoints = simplifyPoints(points);
  return { points: cleanPoints, waypoint };
}

/**
 * Converts a sequence of points to a smooth Catmull-Rom cubic Bézier SVG path.
 * Guarantees the curve passes directly through every single point with C1 continuous tangents.
 */
export function catmullRomToCubicBezier(pts: Point[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = Math.round(p1.x + (p2.x - p0.x) / 6);
    const cp1y = Math.round(p1.y + (p2.y - p0.y) / 6);
    const cp2x = Math.round(p2.x - (p3.x - p1.x) / 6);
    const cp2y = Math.round(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Main Path Calculation Engine for FlowConnectors.
 * Generates mathematically sound SVG paths, label positions, endpoints, and multi-waypoint handles.
 */
export function calculateEdgePath(
  sourceNode: FlowNode,
  targetNode: FlowNode,
  fromPort: PortPosition,
  toPort: PortPosition,
  routeType: RouteType,
  controlPoint?: Point,
  sourcePointOverride?: Point,
  targetPointOverride?: Point,
  multiEdgeOffset?: number,
  edgeWaypoints?: Point[]
): EdgePathData {
  const p1 = sourcePointOverride || getPortCoordinates(sourceNode, fromPort);
  const p2 = targetPointOverride || getPortCoordinates(targetNode, toPort);

  const cdx = p2.x - p1.x;
  const cdy = p2.y - p1.y;
  const chordLen = Math.hypot(cdx, cdy);
  const nx = chordLen > 1 ? -cdy / chordLen : 0;
  const ny = chordLen > 1 ? cdx / chordLen : 1;

  const effectiveWaypoints: Point[] =
    edgeWaypoints && edgeWaypoints.length > 0
      ? edgeWaypoints
      : controlPoint
      ? [controlPoint]
      : [];

  // =========================================================================
  // STRAIGHT ROUTE
  // =========================================================================
  if (routeType === 'straight') {
    if (effectiveWaypoints.length > 0) {
      const allPts = [p1, ...effectiveWaypoints, p2];
      const path =
        `M ${allPts[0].x} ${allPts[0].y} ` +
        allPts
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ');

      const midIdx = Math.floor(allPts.length / 2);
      const prevPt = allPts[midIdx - 1];
      const nextPt = allPts[midIdx];
      const labelPos = {
        x: Math.round((prevPt.x + nextPt.x) / 2),
        y: Math.round((prevPt.y + nextPt.y) / 2) - 14
      };
      return {
        path,
        labelPosition: labelPos,
        sourcePoint: p1,
        targetPoint: p2,
        waypointPosition: effectiveWaypoints[0],
        waypointPositions: effectiveWaypoints
      };
    }

    // If multi-edges exist between this pair, bow into a graceful arc to prevent overlap
    if (multiEdgeOffset && chordLen > 10) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const cx = mx + nx * (multiEdgeOffset * 1.5);
      const cy = my + ny * (multiEdgeOffset * 1.5);

      const norm1 = getPortNormal(fromPort);
      const norm2 = getPortNormal(toPort);
      const stubLen = Math.max(0, Math.min(12, chordLen * 0.2));
      const p1Exit = stubLen > 1 ? { x: p1.x + norm1.x * stubLen, y: p1.y + norm1.y * stubLen } : p1;
      const p2Entry = stubLen > 1 ? { x: p2.x + norm2.x * stubLen, y: p2.y + norm2.y * stubLen } : p2;

      const path =
        stubLen > 1
          ? `M ${p1.x} ${p1.y} L ${p1Exit.x} ${p1Exit.y} Q ${cx} ${cy}, ${p2Entry.x} ${p2Entry.y} L ${p2.x} ${p2.y}`
          : `M ${p1.x} ${p1.y} Q ${cx} ${cy}, ${p2.x} ${p2.y}`;

      const t = 0.42;
      const labelX = (1 - t) * (1 - t) * p1Exit.x + 2 * (1 - t) * t * cx + t * t * p2Entry.x;
      const labelY = (1 - t) * (1 - t) * p1Exit.y + 2 * (1 - t) * t * cy + t * t * p2Entry.y;
      const wp = { x: Math.round(mx + nx * multiEdgeOffset), y: Math.round(my + ny * multiEdgeOffset) };
      return {
        path,
        labelPosition: { x: Math.round(labelX), y: Math.round(labelY - 14) },
        sourcePoint: p1,
        targetPoint: p2,
        waypointPosition: wp,
        waypointPositions: [wp]
      };
    }

    const isNearH = Math.abs(p1.y - p2.y) <= 14;
    const isNearV = Math.abs(p1.x - p2.x) <= 14;
    const sp1 = {
      x: isNearV ? Math.round((p1.x + p2.x) / 2) : p1.x,
      y: isNearH ? Math.round((p1.y + p2.y) / 2) : p1.y
    };
    const sp2 = {
      x: isNearV ? sp1.x : p2.x,
      y: isNearH ? sp1.y : p2.y
    };

    const path = `M ${sp1.x} ${sp1.y} L ${sp2.x} ${sp2.y}`;
    const mid = { x: Math.round((sp1.x + sp2.x) / 2), y: Math.round((sp1.y + sp2.y) / 2) };
    return {
      path,
      labelPosition: { x: mid.x, y: mid.y - 12 },
      sourcePoint: sp1,
      targetPoint: sp2,
      waypointPosition: mid,
      waypointPositions: []
    };
  }

  // =========================================================================
  // CURVED ROUTE
  // =========================================================================
  if (routeType === 'curved') {
    const norm1 = getPortNormal(fromPort);
    const norm2 = getPortNormal(toPort);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    const stubLen = Math.max(0, Math.min(14, dist * 0.25));

    // Multi-waypoint arbitrary spline
    if (effectiveWaypoints.length > 1) {
      const allPts = [p1, ...effectiveWaypoints, p2];
      const path = catmullRomToCubicBezier(allPts);
      const midIdx = Math.floor(allPts.length / 2);
      const labelPos = {
        x: allPts[midIdx].x,
        y: allPts[midIdx].y - 14
      };
      return {
        path,
        labelPosition: labelPos,
        sourcePoint: p1,
        targetPoint: p2,
        waypointPosition: effectiveWaypoints[0],
        waypointPositions: effectiveWaypoints
      };
    }

    // Single-waypoint exact quadratic Bézier through it at t=0.5
    if (effectiveWaypoints.length === 1) {
      const cp = effectiveWaypoints[0];
      if (stubLen > 1) {
        const p1Exit = { x: p1.x + norm1.x * stubLen, y: p1.y + norm1.y * stubLen };
        const p2Entry = { x: p2.x + norm2.x * stubLen, y: p2.y + norm2.y * stubLen };
        const cx = 2 * cp.x - 0.5 * (p1Exit.x + p2Entry.x);
        const cy = 2 * cp.y - 0.5 * (p1Exit.y + p2Entry.y);
        const path = `M ${p1.x} ${p1.y} L ${p1Exit.x} ${p1Exit.y} Q ${cx} ${cy}, ${p2Entry.x} ${p2Entry.y} L ${p2.x} ${p2.y}`;
        return {
          path,
          labelPosition: { x: cp.x, y: cp.y - 14 },
          sourcePoint: p1,
          targetPoint: p2,
          waypointPosition: cp,
          waypointPositions: [cp]
        };
      }
      const cx = 2 * cp.x - 0.5 * (p1.x + p2.x);
      const cy = 2 * cp.y - 0.5 * (p1.y + p2.y);
      const path = `M ${p1.x} ${p1.y} Q ${cx} ${cy}, ${p2.x} ${p2.y}`;
      return {
        path,
        labelPosition: { x: cp.x, y: cp.y - 14 },
        sourcePoint: p1,
        targetPoint: p2,
        waypointPosition: cp,
        waypointPositions: [cp]
      };
    }

    const p1Exit = stubLen > 1 ? { x: p1.x + norm1.x * stubLen, y: p1.y + norm1.y * stubLen } : p1;
    const p2Entry = stubLen > 1 ? { x: p2.x + norm2.x * stubLen, y: p2.y + norm2.y * stubLen } : p2;

    const cdxCurve = p2Entry.x - p1Exit.x;
    const cdyCurve = p2Entry.y - p1Exit.y;
    const cdist = Math.hypot(cdxCurve, cdyCurve);

    const isOppositeH = (fromPort === 'right' && toPort === 'left') || (fromPort === 'left' && toPort === 'right');
    const isOppositeV = (fromPort === 'bottom' && toPort === 'top') || (fromPort === 'top' && toPort === 'bottom');

    const minTension = Math.max(36, Math.min(cdist * 0.38, 160));
    let t1 = minTension;
    let t2 = minTension;

    if (isOppositeH) {
      const facing = fromPort === 'right' ? dx > 0 : dx < 0;
      t1 = facing ? Math.max(minTension, Math.min(Math.abs(cdxCurve) * 0.5, 180)) : Math.max(48, Math.min(cdist * 0.5, 200));
      t2 = t1;
    } else if (isOppositeV) {
      const facing = fromPort === 'bottom' ? dy > 0 : dy < 0;
      t1 = facing ? Math.max(minTension, Math.min(Math.abs(cdyCurve) * 0.5, 180)) : Math.max(48, Math.min(cdist * 0.5, 200));
      t2 = t1;
    } else {
      t1 = Math.max(32, Math.min(cdist * 0.36, 150));
      t2 = t1;
    }

    const mOff = multiEdgeOffset || 0;
    const cp1 = { x: p1Exit.x + norm1.x * t1 + nx * mOff, y: p1Exit.y + norm1.y * t1 + ny * mOff };
    const cp2 = { x: p2Entry.x + norm2.x * t2 + nx * mOff, y: p2Entry.y + norm2.y * t2 + ny * mOff };

    const path =
      stubLen > 1
        ? `M ${p1.x} ${p1.y} L ${p1Exit.x} ${p1Exit.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2Entry.x} ${p2Entry.y} L ${p2.x} ${p2.y}`
        : `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;

    const t = mOff !== 0 ? 0.42 : 0.5;
    const mt = 1 - t;
    const labelX = Math.round(mt * mt * mt * p1Exit.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p2Entry.x);
    const labelY = Math.round(mt * mt * mt * p1Exit.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p2Entry.y);

    const midX = Math.round(0.125 * p1Exit.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p2Entry.x);
    const midY = Math.round(0.125 * p1Exit.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p2Entry.y);
    const waypoint = { x: midX, y: midY };
    return {
      path,
      labelPosition: { x: labelX, y: labelY - 14 },
      sourcePoint: p1,
      targetPoint: p2,
      waypointPosition: waypoint,
      waypointPositions: []
    };
  }

  // =========================================================================
  // ORTHOGONAL
  // =========================================================================
  if (effectiveWaypoints.length > 1) {
    const allPts = [p1, ...effectiveWaypoints, p2];
    const orthoPoints: Point[] = [p1];
    for (let i = 0; i < allPts.length - 1; i++) {
      const curr = allPts[i];
      const next = allPts[i + 1];
      const midX = Math.round((curr.x + next.x) / 2);
      orthoPoints.push({ x: midX, y: curr.y });
      orthoPoints.push({ x: midX, y: next.y });
      orthoPoints.push(next);
    }
    const cleanPts = simplifyPoints(orthoPoints);
    const path = pointsToRoundedPath(cleanPts, 8);
    const midIdx = Math.floor(allPts.length / 2);
    const labelPos = { x: allPts[midIdx].x, y: allPts[midIdx].y - 14 };
    return {
      path,
      labelPosition: labelPos,
      sourcePoint: p1,
      targetPoint: p2,
      waypointPosition: effectiveWaypoints[0],
      waypointPositions: effectiveWaypoints
    };
  }

  const { points, waypoint } = computeOrthogonalPoints(
    sourceNode,
    targetNode,
    p1,
    p2,
    fromPort,
    toPort,
    effectiveWaypoints[0]
  );
  const path = pointsToRoundedPath(points, 8);
  return {
    path,
    labelPosition: { x: waypoint.x, y: waypoint.y - 14 },
    sourcePoint: p1,
    targetPoint: p2,
    waypointPosition: waypoint,
    waypointPositions: effectiveWaypoints
  };
}


/**
 * Deduplicates and formats the full display label for an edge connector.
 * Prevents redundant step numbering (e.g. avoid rendering both [1] and 1. if the label already starts with 1.)
 */
export function formatFullLabel(label?: string, stepNumber?: string | number): string {
  const cleanLabel = (label || '').trim();
  if (!cleanLabel) {
    if (stepNumber !== undefined && stepNumber !== null && String(stepNumber).trim() !== '') {
      return `[${stepNumber}]`;
    }
    return '';
  }
  // If the label already starts with any numbered prefix like "1. ", "1 - ", "[1] ", "1: ", "(1) "
  if (/^(\[?\d+\]?[\.\:\-\)]?\s+|\(\d+\)\s*)/.test(cleanLabel)) {
    return cleanLabel;
  }
  if (stepNumber !== undefined && stepNumber !== null && String(stepNumber).trim() !== '') {
    const s = String(stepNumber).trim();
    return `${s}. ${cleanLabel}`;
  }
  return cleanLabel;
}

/**
 * Intelligently wraps edge connector labels across multiple balanced lines.
 * Breaks at semantic boundaries:
 * 1. Honors explicit newlines
 * 2. Splits trailing metadata in parentheses/brackets e.g. "1. POST /oauth/token" + "(Credentials)"
 * 3. Splits at semantic separators like commas, ampersands, colons, arrows (" & ", " and ", " -> ", ", ")
 * 4. Falls back to balanced word boundary wrapping around maxLineChars
 */
export function wrapEdgeLabel(text?: string, maxLineChars = 24): string[] {
  if (!text) return [];
  if (text.includes('\n')) {
    return text.split('\n').flatMap((line) => wrapEdgeLabel(line, maxLineChars));
  }
  const trimmed = text.trim();
  if (trimmed.length <= maxLineChars) {
    return [trimmed];
  }

  // 1. Trailing parentheses/brackets (common for payloads, auth, HTTP status):
  // e.g. "1. POST /oauth/token (Credentials)" -> ["1. POST /oauth/token", "(Credentials)"]
  const parenMatch = trimmed.match(/^(.+?)\s+(\([^\)]+\)|\[[^\]]+\])$/);
  if (parenMatch) {
    const part1 = parenMatch[1].trim();
    const part2 = parenMatch[2].trim();
    return [...wrapEdgeLabel(part1, maxLineChars), ...wrapEdgeLabel(part2, maxLineChars)];
  }

  // 2. Semantic separators: comma, ampersand, arrows, logical operators, colons
  // e.g. "fetch(apiUrl, { cache })", "Set HttpOnly JWT & Refresh Cookie", "Step 1: Verify"
  const sepRegex = /(,\s+|\s+(?:&|and|\+|->|=>|\|\||\|)\s+|:\s+)/gi;
  let sepMatch: RegExpExecArray | null;
  let bestSepIdx = -1;
  let minDiff = Infinity;
  const halfLen = trimmed.length / 2;

  while ((sepMatch = sepRegex.exec(trimmed)) !== null) {
    const splitIdx = sepMatch.index;
    const diff = Math.abs(splitIdx - halfLen);
    if (diff < minDiff) {
      minDiff = diff;
      bestSepIdx = splitIdx;
    }
  }

  if (bestSepIdx > 3 && bestSepIdx < trimmed.length - 3) {
    const isPunct = trimmed[bestSepIdx] === ',' || trimmed[bestSepIdx] === ':';
    const splitPoint = isPunct ? bestSepIdx + 1 : bestSepIdx;
    const before = trimmed.slice(0, splitPoint).trim();
    const after = trimmed.slice(splitPoint).trim();
    return [...wrapEdgeLabel(before, maxLineChars), ...wrapEdgeLabel(after, maxLineChars)];
  }

  // 3. Long snake_case or identifier fallback (split on underscore if exceeds maxLineChars)
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    if (trimmed.includes('/')) {
      const lastSlash = trimmed.lastIndexOf('/');
      if (lastSlash > 3 && lastSlash < trimmed.length - 2) {
        return [trimmed.slice(0, lastSlash + 1), trimmed.slice(lastSlash + 1)];
      }
    }
    if (trimmed.length > maxLineChars && trimmed.includes('_')) {
      const parts = trimmed.split('_');
      const lines: string[] = [];
      let current = '';
      for (const p of parts) {
        if (!current) {
          current = p;
        } else if ((current + '_' + p).length <= maxLineChars) {
          current += '_' + p;
        } else {
          lines.push(current);
          current = p;
        }
      }
      if (current) lines.push(current);
      if (lines.length > 1) return lines;
    }
    return [trimmed];
  }

  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxLineChars) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

let measurementCanvas: HTMLCanvasElement | null = null;
let measurementContext: CanvasRenderingContext2D | null = null;
const textWidthCache = new Map<string, number>();

/**
 * Accurately measures or calculates SVG edge label text width.
 * Uses off-screen Canvas 2D measureText when available, with a tuned proportional fallback.
 */
export function measureEdgeLabelWidth(text: string, isBold = false): number {
  if (!text) return 0;
  const cacheKey = `${isBold ? 'b' : 'n'}:${text}`;
  const cached = textWidthCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (typeof document !== 'undefined') {
    try {
      if (!measurementCanvas) {
        measurementCanvas = document.createElement('canvas');
        measurementContext = measurementCanvas.getContext('2d');
      }
      if (measurementContext) {
        measurementContext.font = `${isBold ? '700' : '600'} 11.5px "Google Sans", "Product Sans", "Plus Jakarta Sans", "Outfit", "Hind Siliguri", "Noto Sans Bengali", sans-serif`;
        const metrics = measurementContext.measureText(text);
        if (metrics && metrics.width > 0) {
          textWidthCache.set(cacheKey, metrics.width);
          return metrics.width;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback: Proportional character width for 11.5px Plus Jakarta Sans semi-bold
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[wmWM]/.test(ch)) total += 10.5;
    else if (/[A-Z]/.test(ch)) total += 8.2;
    else if (/[ijl|!:;',.\s]/.test(ch)) total += 3.8;
    else if (/[frt]/.test(ch)) total += 5.0;
    else if (/[_]/.test(ch)) total += 6.8;
    else total += 7.2;
  }
  const result = isBold ? total * 1.08 : total;
  textWidthCache.set(cacheKey, result);
  return result;
}


