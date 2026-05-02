import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs"

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(agents)">
        <Icon sf="square.grid.2x2" />
        <Label>Agents</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
