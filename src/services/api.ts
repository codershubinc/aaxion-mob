import AsyncStorage from '@react-native-async-storage/async-storage';


export const api = {
  getEndpoint: async () => {
    const baseUrl = await AsyncStorage.getItem('apiBaseUrl');
    return baseUrl;
  },
  getToken: async () => {
    const token = await AsyncStorage.getItem('userToken');
    return token
  },
  getAll: async () => {
    const baseUrl = await AsyncStorage.getItem('apiBaseUrl');
    const token = await AsyncStorage.getItem('userToken');
    return { baseUrl, token }
  }
};
