import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { OAuthProvider, useAuth } from '@/context/AuthContext';

export default function OAuthButtons({ onError }: { onError: (message: string) => void }) {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  const handlePress = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);
    const { error } = await signInWithOAuth(provider);
    setLoadingProvider(null);
    if (error) onError(error);
  };

  return (
    <>
      <Pressable
        style={[styles.button, styles.googleButton]}
        disabled={loadingProvider !== null}
        onPress={() => handlePress('google')}>
        {loadingProvider === 'google' ? (
          <ActivityIndicator color="#1f1f1f" />
        ) : (
          <>
            <FontAwesome6 name="google" size={18} color="#1f1f1f" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>

      {Platform.OS === 'ios' && (
        <Pressable
          style={[styles.button, styles.appleButton]}
          disabled={loadingProvider !== null}
          onPress={() => handlePress('apple')}>
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome6 name="apple" size={18} color="#fff" />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </>
          )}
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 8,
    marginTop: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  googleButtonText: {
    color: '#1f1f1f',
    fontSize: 15,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
