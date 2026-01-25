import AuthScreen from '@/screens/AuthScreen';
import HomeScreen from '@/screens/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  const checkToken = async () => {
    try {
      // Check for user token in local storage
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
    } catch (e) {
      console.error('Failed to load token', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return userToken ? (
    <HomeScreen />
  ) : (
    <AuthScreen onLogin={(token) => setUserToken(token)} />
  );
}
