import { useRef } from "react"
import { Text, View } from "react-native"
import { Archive, ArchiveRestore, Trash2 } from "lucide-react-native"
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable"
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated"
import { PressableFeedback } from "heroui-native"

import { AgentCard } from "@/components/AgentCard"
import type { AgentCard as AgentCardType } from "@/lib/cursor/types"

type Props = {
  agent: AgentCardType
  onPress: (agent: AgentCardType) => void
  onArchive: (agent: AgentCardType) => void
  onDelete: (agent: AgentCardType) => void
}

const ACTION_WIDTH = 88

function isArchived(status: string | undefined) {
  return status?.toLowerCase() === "archived"
}

export function SwipeableAgentRow({
  agent,
  onPress,
  onArchive,
  onDelete,
}: Props) {
  const ref = useRef<SwipeableMethods>(null)
  const archived = isArchived(agent.status)

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      leftThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      overshootLeft={false}
      renderLeftActions={(_progress, drag) => (
        <ActionPanel
          drag={drag}
          width={ACTION_WIDTH}
          color="bg-warning"
          icon={
            archived ? (
              <ArchiveRestore size={18} className="text-warning-foreground" />
            ) : (
              <Archive size={18} className="text-warning-foreground" />
            )
          }
          label={archived ? "Unarchive" : "Archive"}
          align="left"
        />
      )}
      renderRightActions={(_progress, drag) => (
        <ActionPanel
          drag={drag}
          width={ACTION_WIDTH}
          color="bg-danger"
          icon={<Trash2 size={18} className="text-danger-foreground" />}
          label="Delete"
          align="right"
        />
      )}
      onSwipeableOpen={(direction) => {
        ref.current?.close()
        if (direction === "left") onArchive(agent)
        else onDelete(agent)
      }}
    >
      <AgentCard agent={agent} onPress={onPress} />
    </ReanimatedSwipeable>
  )
}

function ActionPanel({
  drag,
  width,
  color,
  icon,
  label,
  align,
}: {
  drag: SharedValue<number>
  width: number
  color: string
  icon: React.ReactNode
  label: string
  align: "left" | "right"
}) {
  const style = useAnimatedStyle(() => {
    const translateX = align === "left" ? drag.value - width : drag.value + width
    return { transform: [{ translateX }] }
  })

  return (
    <Animated.View
      style={[{ width, marginBottom: 12 }, style]}
      className={`${color} rounded-2xl items-center justify-center`}
    >
      <PressableFeedback className="items-center justify-center gap-1 py-3 px-2">
        {icon}
        <Text className="text-xs font-medium text-foreground">{label}</Text>
      </PressableFeedback>
    </Animated.View>
  )
}
