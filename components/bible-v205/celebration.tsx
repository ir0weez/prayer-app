// ─── v205 "Book Complete!" celebration ───────────────────────────────────────
// The existing celebration, moved into the new Bible surface: the same
// navy-and-gold card, falling confetti and breathing glow (timing
// curves only — no bounce), the same words and the same two doors:
// Choose Next Book (the Books view) or Later. It fires when a chapter
// marked Complete in the new system finishes a book.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

function ConfettiPiece({ left, delay = 0 }: { left: `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(-8)).current;
  const op = useRef(new Animated.Value(0)).current;
  const colors = ['#FF6B9D', '#FFD54F', '#74C0FC', '#B197FC'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 105, duration: 4200, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -8, duration: 1, useNativeDriver: true }),
      ]),
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.9, duration: 3000, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => {
      fall.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(t);
      fall.stop();
      fade.stop();
    };
  }, [delay, y, op]);
  return (
    <Animated.View
      style={{
        position: 'absolute', left, top: 0, width: 7, height: 10, borderRadius: 2,
        backgroundColor: color, opacity: op, transform: [{ translateY: y }, { rotate: '35deg' }],
      }}
    />
  );
}

export function BookCompleteCelebration({
  book,
  bibleComplete,
  onChooseNext,
  onDismiss,
}: {
  book: string;
  bibleComplete: boolean;
  onChooseNext: () => void;
  onDismiss: () => void;
}) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.92)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scaleIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    glow.start();
    return () => glow.stop();
  }, [fadeIn, scaleIn, glowPulse]);

  const glowOpacity = glowPulse.interpolate({ inputRange: [0.5, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ scale: scaleIn }] }}>
      <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, backgroundColor: '#1A2340', padding: 16, alignItems: 'center', gap: 8 }}>
        {[8, 22, 38, 55, 70, 85].map((left, i) => (
          <ConfettiPiece key={i} left={`${left}%` as `${number}%`} delay={i * 150} />
        ))}
        <Animated.View style={{ position: 'absolute', top: 8, width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFD54F', opacity: glowOpacity }} />
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFD54F', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="emoji-events" size={30} color="#1A2340" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>Book Complete!</Text>
        <Text style={{ color: '#FFD54F', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
          {book} · +100 XP
        </Text>
        {bibleComplete && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 4 }}>
            <MaterialIcons name="auto-awesome" size={16} color="#FFD54F" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
              Entire Bible Complete! +1,000 XP
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable
            onPress={onChooseNext}
            style={({ pressed }) => [{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFD54F', borderRadius: 8, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: '#1A2340', fontSize: 13, fontWeight: '700' }}>Choose Next Book</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF40', opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
