import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'token';

export const readToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const writeToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
