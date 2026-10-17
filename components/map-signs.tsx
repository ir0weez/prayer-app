import { Pressable, Text, View } from "react-native";
import { MAP_INFO, type TownMapId } from "@/lib/hometown";

/**
 * Wooden directional signpost pointing to the neighboring maps:
 * City to the left, Garden of Remembrance up top, School to the right.
 * Tapping an arm switches to that map (or runs the unlock flow).
 * Locked maps show a lock + cost on their arm.
 */

type MapSignsProps = {
  activeMap: TownMapId;
  unlockedMaps: TownMapId[];
  onSelectMap: (id: TownMapId) => void;
};

function SignArm({
  mapId,
  arrow,
  arrowSide,
  active,
  unlocked,
  onPress,
}: {
  mapId: TownMapId;
  arrow: string;
  arrowSide: "left" | "right" | "top";
  active: boolean;
  unlocked: boolean;
  onPress: () => void;
}) {
  const info = MAP_INFO[mapId];
  const label = unlocked ? `${info.icon} ${info.name}` : `${info.icon} ${info.name} 🔒 ${info.unlockCost}🪙`;
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? "#1D4ED8" : "#8B5E34",
        borderColor: active ? "#1E40AF" : "#6B4423",
        borderWidth: 2,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {arrowSide !== "right" && (
        <Text style={{ fontSize: 14, marginRight: 4 }}>{arrow}</Text>
      )}
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>{label}</Text>
      {arrowSide === "right" && (
        <Text style={{ fontSize: 14, marginLeft: 4 }}>{arrow}</Text>
      )}
    </Pressable>
  );
}

export function MapSigns({ activeMap, unlockedMaps, onSelectMap }: MapSignsProps) {
  const arm = (mapId: TownMapId, arrow: string, arrowSide: "left" | "right" | "top") => (
    <SignArm
      mapId={mapId}
      arrow={arrow}
      arrowSide={arrowSide}
      active={activeMap === mapId}
      unlocked={unlockedMaps.includes(mapId)}
      onPress={() => onSelectMap(mapId)}
    />
  );
  return (
    <View style={{ alignItems: "center", marginTop: 2 }}>
      {/* Mall arm on top, pointing up */}
      {arm("mall", "⬆️", "top")}
      {/* Post row: city arm left, wooden post, school arm right */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
        {arm("city", "⬅️", "left")}
        <View
          style={{ width: 10, height: 40, backgroundColor: "#6B4423", borderRadius: 4, marginHorizontal: 8 }}
        />
        {arm("school", "➡️", "right")}
      </View>
      {/* Post base */}
      <View style={{ width: 10, height: 16, backgroundColor: "#6B4423", borderRadius: 4 }} />
    </View>
  );
}
