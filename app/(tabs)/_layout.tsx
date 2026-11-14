import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { House, User, Wallet } from 'phosphor-react-native';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: 'rgba(0,0,0,0.4)',
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <BlurView intensity={60} tint="light" style={styles.blur} />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <House size={24} color={color} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, focused }) => <Wallet size={24} color={color} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <User size={24} color={color} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 32 : 20,
    height: 68,
    borderRadius: 34,
    borderTopWidth: 0,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.94)' : 'transparent',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tabBarItem: {
    paddingTop: 12,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
