import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/theme/colors';

export function ChannelScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.text }}>Channel</Text>
    </View>
  );
}
