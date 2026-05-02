import './global.css';

import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider, Button } from 'heroui-native';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <View className="flex-1 items-center justify-center bg-background gap-4 px-6">
          <Button onPress={() => console.log('Pressed!')}>
            <Button.Label>Get Started</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => console.log('Secondary')}>
            <Button.Label>Learn More</Button.Label>
          </Button>
          <StatusBar style="auto" />
        </View>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
