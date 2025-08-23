import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/store/auth';

export function SignInScreen({ navigation }: any) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    try {
      setLoading(true);
      setError(null);
      await login({ phone, password });
      navigation.replace('App');
    } catch (e: any) {
      setError(e?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700', marginBottom: 12 }}>LogiChat</Text>
      <Text style={{ color: Colors.muted, marginBottom: 24 }}>Sign in to continue</Text>

      <View style={{ gap: 12 }}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor={Colors.muted}
          style={{ backgroundColor: '#0B1220', color: Colors.text, padding: 14, borderRadius: 12, borderColor: '#0E1A2F', borderWidth: 1 }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={Colors.muted}
          style={{ backgroundColor: '#0B1220', color: Colors.text, padding: 14, borderRadius: 12, borderColor: '#0E1A2F', borderWidth: 1 }}
        />
        {error && <Text style={{ color: Colors.error }}>{error}</Text>}
        <TouchableOpacity disabled={loading} onPress={onContinue} style={{ backgroundColor: Colors.accent, padding: 14, borderRadius: 12, opacity: loading ? 0.6 : 1 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>{loading ? 'Signing in…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
