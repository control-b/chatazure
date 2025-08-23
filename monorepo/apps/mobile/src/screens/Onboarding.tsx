import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/store/auth';

export function OnboardingScreen({ navigation }: any) {
  const { setOnboarded } = useAuth();
  return (
    <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700', marginBottom: 12 }}>Welcome to LogiChat</Text>
      <Text style={{ color: Colors.muted, marginBottom: 24 }}>Modern logistics collaboration with geofencing and document signing.</Text>
      <TouchableOpacity onPress={async () => { await setOnboarded(); navigation.replace('SignIn'); }} style={{ backgroundColor: Colors.accent, padding: 14, borderRadius: 12 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>Get Started</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}
