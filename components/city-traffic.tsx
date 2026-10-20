import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { getTimeOfDay } from "@/lib/daynight";

// ---------------------------------------------------------------------------
// CityTraffic: flat little cars circulating the downtown street grid.
// Purely visual — pointerEvents="none", native-driver animations.
// Cars stay on street tiles only (avenues x=2/x=5, boulevards y=2/5/10/13).
// At night the headlights glow.
// ---------------------------------------------------------------------------

type Tile = { x: number; y: number };
type Px = { x: number; y: number };

const CAR_SPEED_PX_PER_SEC = 60;
const CAR_COLORS = ["#EF4444", "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#E2E8F0"];

type Dir = "E" | "W" | "N" | "S";

// Tile loops — every tile below is a real city street tile:
//   avenues: x=2 (West Ave) and x=5 (East Ave), y=0..13
//   boulevards: y=2 (North), y=5 (South), y=10 (Midtown), y=13 (Harbor),
//   at x=0,1,3,4,6,7 (avenue crossings ride the avenue tiles)
const CAR_LOOPS: Tile[][] = [
  // Downtown block — clockwise (West Ave / North Blvd / East Ave / South Blvd)
  [
    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
    { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
    { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 },
    { x: 2, y: 4 }, { x: 2, y: 3 },
  ],
  // Downtown block — counter-clockwise
  [
    { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 },
    { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
    { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 },
    { x: 4, y: 2 }, { x: 3, y: 2 },
  ],
  // Midtown block — clockwise (West Ave / Midtown Blvd / East Ave / Harbor Blvd)
  [
    { x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 5, y: 10 },
    { x: 5, y: 11 }, { x: 5, y: 12 }, { x: 5, y: 13 },
    { x: 4, y: 13 }, { x: 3, y: 13 }, { x: 2, y: 13 },
    { x: 2, y: 12 }, { x: 2, y: 11 },
  ],
  // Grand loop — down West Ave to the harbor, up East Ave, back along North Blvd
  [
    { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 },
    { x: 2, y: 6 }, { x: 2, y: 7 }, { x: 2, y: 8 }, { x: 2, y: 9 },
    { x: 2, y: 10 }, { x: 2, y: 11 }, { x: 2, y: 12 }, { x: 2, y: 13 },
    { x: 3, y: 13 }, { x: 4, y: 13 }, { x: 5, y: 13 },
    { x: 5, y: 12 }, { x: 5, y: 11 }, { x: 5, y: 10 }, { x: 5, y: 9 },
    { x: 5, y: 8 }, { x: 5, y: 7 }, { x: 5, y: 6 }, { x: 5, y: 5 },
    { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 },
    { x: 4, y: 2 }, { x: 3, y: 2 },
  ],
  // West Ave — southbound then back north
  [
    { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
    { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 },
    { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 }, { x: 2, y: 11 },
    { x: 2, y: 12 }, { x: 2, y: 13 },
    { x: 2, y: 12 }, { x: 2, y: 11 }, { x: 2, y: 10 }, { x: 2, y: 9 },
    { x: 2, y: 8 }, { x: 2, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 5 },
    { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 },
  ],
  // Harbor Blvd — eastbound then back west
  [
    { x: 0, y: 13 }, { x: 1, y: 13 }, { x: 2, y: 13 }, { x: 3, y: 13 },
    { x: 4, y: 13 }, { x: 5, y: 13 }, { x: 6, y: 13 }, { x: 7, y: 13 },
    { x: 6, y: 13 }, { x: 5, y: 13 }, { x: 4, y: 13 }, { x: 3, y: 13 },
    { x: 2, y: 13 }, { x: 1, y: 13 },
  ],
];

type CarLogic = {
  id: string;
  color: string;
  waypoints: Px[];
  wpIndex: number;
  pos: Animated.ValueXY;
  px: number;
  py: number;
  anim: Animated.CompositeAnimation | null;
};

function dirOf(from: Px, to: Px): Dir {
  if (to.x > from.x) return "E";
  if (to.x < from.x) return "W";
  if (to.y > from.y) return "S";
  return "N";
}

function CarBody({ color, dir, headlights }: { color: string; dir: Dir; headlights: boolean }) {
  const horizontal = dir === "E" || dir === "W";
  const w = horizontal ? 28 : 15;
  const h = horizontal ? 15 : 28;
  // Windshield sits toward the front of travel
  const shieldStyle = horizontal
    ? {
        width: 9, height: 11, borderRadius: 2,
        left: dir === "E" ? 15 : 4, top: 2,
      }
    : {
        width: 11, height: 9, borderRadius: 2,
        left: 2, top: dir === "S" ? 15 : 4,
      };
  // Headlight beam — a warm glow just ahead of the front bumper, night only
  const beamStyle = horizontal
    ? {
        width: 16, height: 8, borderRadius: 4,
        left: dir === "E" ? w - 2 : -14, top: h / 2 - 4,
      }
    : {
        width: 8, height: 16, borderRadius: 4,
        left: w / 2 - 4, top: dir === "S" ? h - 2 : -14,
      };
  const wheelA = horizontal
    ? { left: 5, top: -3, width: 7, height: 4 }
    : { left: -3, top: 5, width: 4, height: 7 };
  const wheelB = horizontal
    ? { left: 16, top: -3, width: 7, height: 4 }
    : { left: -3, top: 16, width: 4, height: 7 };
  const wheelC = horizontal
    ? { left: 5, top: h - 1, width: 7, height: 4 }
    : { left: w - 1, top: 5, width: 4, height: 7 };
  const wheelD = horizontal
    ? { left: 16, top: h - 1, width: 7, height: 4 }
    : { left: w - 1, top: 16, width: 4, height: 7 };
  return (
    <View style={{ width: w, height: h }}>
      {[wheelA, wheelB, wheelC, wheelD].map((ws, i) => (
        <View key={i} style={[{ position: "absolute", backgroundColor: "#1F2937", borderRadius: 2 }, ws]} />
      ))}
      <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: color }}>
        <View style={[{ position: "absolute", backgroundColor: "rgba(255,255,255,0.75)" }, shieldStyle]} />
      </View>
      {headlights && (
        <View
          style={[
            { position: "absolute", backgroundColor: "#FEF3C7", opacity: 0.9, shadowColor: "#FDE047", shadowRadius: 8, shadowOpacity: 0.9 },
            beamStyle,
          ]}
        />
      )}
    </View>
  );
}

function CityTrafficImpl({ cellSize, carCount = 6, bare }: { cellSize: number; carCount?: number; /** Render entities directly (no container) so the parent can depth-sort them with buildings via zIndex. */ bare?: boolean }) {
  const logicRef = useRef<Record<string, CarLogic>>({});
  const [renderIds, setRenderIds] = useState<string[]>([]);
  const [orients, setOrients] = useState<Record<string, Dir>>({});
  const orientsRef = useRef<Record<string, Dir>>({});
  orientsRef.current = orients;
  const carCountRef = useRef(carCount);
  carCountRef.current = carCount;
  // Night only changes the headlights — cars keep circulating.
  const [isNight, setIsNight] = useState(() => getTimeOfDay() === "night");
  useEffect(() => {
    const id = setInterval(() => {
      const n = getTimeOfDay() === "night";
      setIsNight((prev) => (prev === n ? prev : n));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const toPx = (t: Tile): Px => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize });
    const logic = logicRef.current;

    const spawnCars = () => {
      const n = Math.max(0, Math.min(CAR_LOOPS.length, Math.floor(carCountRef.current)));
      // Full rebuild: stop everything, spawn exactly n cars
      for (const id of Object.keys(logic)) {
        logic[id].anim?.stop();
        delete logic[id];
      }
      // Spawn one car per loop up to the count, staggered along the route
      for (let i = 0; i < n; i++) {
        const id = `car-${i}`;
        const loop = CAR_LOOPS[i];
        const waypoints = loop.map(toPx);
        const startIdx = Math.floor((i * 3) % waypoints.length);
        const start = waypoints[startIdx];
        const car: CarLogic = {
          id,
          color: CAR_COLORS[i % CAR_COLORS.length],
          waypoints,
          wpIndex: (startIdx + 1) % waypoints.length,
          pos: new Animated.ValueXY(start),
          px: start.x, py: start.y,
          anim: null,
        };
        logic[id] = car;
        stepCar(car);
      }
      setRenderIds(Object.keys(logic));
    };

    const stepCar = (car: CarLogic) => {
      const wp = car.waypoints[car.wpIndex % car.waypoints.length];
      const dist = Math.hypot(wp.x - car.px, wp.y - car.py);
      const duration = Math.max(250, (dist / CAR_SPEED_PX_PER_SEC) * 1000);
      const d = dirOf({ x: car.px, y: car.py }, wp);
      if (orientsRef.current[car.id] !== d) {
        orientsRef.current = { ...orientsRef.current, [car.id]: d };
        setOrients(orientsRef.current);
      }
      car.anim?.stop();
      car.anim = Animated.timing(car.pos, {
        toValue: { x: wp.x, y: wp.y },
        duration, easing: Easing.linear, useNativeDriver: true,
      });
      car.anim.start(({ finished }) => {
        if (!finished) return;
        car.px = wp.x; car.py = wp.y;
        car.wpIndex = (car.wpIndex + 1) % car.waypoints.length;
        stepCar(car);
      });
    };

    // Spawn cars on mount / resize, whenever the count changes.
    spawnCars();

    return () => {
      for (const car of Object.values(logic)) car.anim?.stop();
    };
  }, [cellSize, carCount]);

  // Entities as a fragment when bare — the parent depth-sorts them with
  // buildings via zIndex (cars drive BEHIND tall buildings).
  const carEntities = renderIds.map((id) => {
        const car = logicRef.current[id];
        if (!car) return null;
        const dir = orients[id] || "E";
        const horizontal = dir === "E" || dir === "W";
        const cw = horizontal ? 28 : 15;
        const ch = horizontal ? 15 : 28;
        return (
          <Animated.View
            key={id}
            style={{
              position: "absolute",
              left: -cw / 2, top: -ch / 2,
              transform: [{ translateX: car.pos.x }, { translateY: car.pos.y }],
              // Depth sort by Y so cars pass behind tall buildings.
              zIndex: Math.round(car.py),
            }}
            pointerEvents="none"
          >
            <CarBody color={car.color} dir={dir} headlights={isNight} />
          </Animated.View>
        );
      });
  if (bare) return <>{carEntities}</>;
  return (
    <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {carEntities}
    </View>
  );
}

/** Memoized: props are primitives/stable, so ambient layers skip re-renders
 *  when the hometown screen re-renders for unrelated reasons. */
export const CityTraffic = memo(CityTrafficImpl);
