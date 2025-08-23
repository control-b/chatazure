import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '@/theme/colors';
import { View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { TripsScreen } from '@/screens/Trips';
import { ChannelScreen } from '@/screens/Channel';
import { DocumentsScreen } from '@/screens/Documents';
import { SettingsScreen } from '@/screens/Settings';
import { SignInScreen } from '@/screens/SignIn';
import { OnboardingScreen } from '@/screens/Onboarding';
import { useAuth } from '@/store/auth';
import { TripDetailScreen } from '@/screens/TripDetail';
import { CreateTripScreen } from '@/screens/CreateTrip';

const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function GradientHeaderBackground() {
  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ flex: 1 }}
    />
  );
}

function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: GradientHeaderBackground,
        headerTintColor: Colors.text,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: '#0B1220' },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
      }}
    >
      <Tabs.Screen name="Trips" component={TripsScreen} />
      <Tabs.Screen name="Channel" component={ChannelScreen} />
      <Tabs.Screen name="Documents" component={DocumentsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export default function Navigation() {
  const theme = DarkTheme;
  const { onboarded, userId } = useAuth();
  const initialRoute = !onboarded ? 'Onboarding' : userId ? 'App' : 'SignIn';
  return (
    <NavigationContainer theme={theme}>
      <RootStack.Navigator initialRouteName={initialRoute as any} screenOptions={{
        headerTintColor: Colors.text,
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: GradientHeaderBackground,
        contentStyle: { backgroundColor: Colors.surface },
      }}>
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Trip' }} />
        <RootStack.Screen name="CreateTrip" component={CreateTripScreen} options={{ title: 'Create Trip' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
