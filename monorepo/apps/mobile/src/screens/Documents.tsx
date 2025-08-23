import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/theme/colors';

export function DocumentsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.text }}>Documents</Text>
    </View>
  );
}
