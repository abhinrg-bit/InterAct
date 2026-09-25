import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";

export default function App() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!showWelcome) {
    return (
      <SafeAreaView style={styles.splash}>
        <StatusBar barStyle="light-content" />

        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>I</Text>
        </View>

        <Text style={styles.appName}>InterAct</Text>
        <Text style={styles.tagline}>Connect. Communicate. Privately.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>I</Text>
        </View>

        <Text style={styles.title}>Welcome to InterAct</Text>

        <Text style={styles.subtitle}>
          Private communication designed for you and the people you trust.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {}}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>

        <Text style={styles.securityText}>
          🔒 Privacy-focused • Secure • Personal
        </Text>
      </View>

      <Text style={styles.version}>InterAct • Version 1.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "800",
  },

  appName: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: 1,
  },

  tagline: {
    color: "#CBD5E1",
    fontSize: 15,
    marginTop: 8,
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  iconText: {
    color: "#FFFFFF",
    fontSize: 46,
    fontWeight: "800",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#64748B",
    textAlign: "center",
    marginTop: 14,
    maxWidth: 360,
  },

  primaryButton: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 34,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  securityText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 22,
  },

  version: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    paddingBottom: 18,
  },
});