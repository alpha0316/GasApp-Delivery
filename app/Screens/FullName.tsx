import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import BackButton from '../../components/BackButton';

export default function FullName({ navigation, route }) {
  const { phoneNumber } = route?.params ?? {};
  const [fullName, setFullName] = useState('');

  const isButtonDisabled = fullName.trim().length < 2;

  const handleContinue = () => {
    navigation.navigate('ProfilePhoto', { phoneNumber, fullName: fullName.trim() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>This is how customers and stations will see you.</Text>
        </View>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: fullName ? '#000' : 'rgba(0, 0, 0, 0.20)',
              backgroundColor: fullName ? '#fff' : '#F4F4F4',
            },
          ]}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Enter your full name"
          placeholderTextColor="rgba(0,0,0,.5)"
          returnKeyType="done"
        />

        <PrimaryButton title="Continue" disabled={isButtonDisabled} onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  content: {
    marginTop: 64,
    gap: 12,
  },
  titleGroup: {
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
  },
  label: {
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    padding: 8,
    borderRadius: 12,
  },
});
