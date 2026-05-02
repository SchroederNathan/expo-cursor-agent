import { Pressable } from "react-native"
import { Plus } from "lucide-react-native"

type Props = {
  onPress: () => void
}

export function Fab({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-8 right-6 size-14 items-center justify-center rounded-full bg-accent shadow-lg active:opacity-80"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Plus color="white" size={26} />
    </Pressable>
  )
}
