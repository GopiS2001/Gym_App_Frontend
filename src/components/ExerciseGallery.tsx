import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppImage as Image } from '@/components/AppImage';
import { Txt } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Large swipeable images, one per page at the card's full width. The whole
 * image is shown (fitted, never cropped), and the frame takes the shape of
 * the first image so it isn't boxed in empty space. Tapping opens the
 * full-screen viewer.
 */
export function ExerciseGallery({ images }: { images: string[] }) {
  const { theme, radius, spacing } = useTheme();
  const { height: windowH } = useWindowDimensions();
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [rowW, setRowW] = useState(0);
  const [current, setCurrent] = useState(0);

  const [aspect, setAspect] = useState(4 / 3);

  const multi = images.length > 1;
  const cardW = rowW;
  // Follow the image's shape, kept between a wide strip and ~65% of the screen.
  const cardH = cardW
    ? Math.max(Math.round(cardW * 0.5), Math.min(Math.round(cardW / aspect), Math.round(windowH * 0.65)))
    : 0;
  const step = cardW;

  const onScroll = (x: number) => {
    if (!step) return;
    setCurrent(Math.max(0, Math.min(images.length - 1, Math.round(x / step))));
  };

  return (
    <>
      <View onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
        {cardW > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={multi}
            pagingEnabled
            style={{ borderRadius: radius.lg }}
            onScroll={(e) => onScroll(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={32}
          >
            {images.map((uri, i) => (
              <Pressable
                key={`${uri}-${i}`}
                onPress={() => setOpenAt(i)}
                accessibilityLabel={`Open image ${i + 1} of ${images.length}`}
                style={({ pressed }) => ({
                  width: cardW,
                  height: cardH,
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : '#FFFFFF',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  transition={200}
                  onLoad={
                    i === 0
                      ? (ev) => {
                          const { width, height } = ev.source;
                          if (width && height) setAspect(width / height);
                        }
                      : undefined
                  }
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 10,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  }}
                >
                  <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {multi && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 5,
            marginTop: spacing.md,
          }}
        >
          {images.map((uri, i) => (
            <View
              key={`${uri}-dot-${i}`}
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === current ? theme.primary : theme.border,
              }}
            />
          ))}
        </View>
      )}

      <Viewer images={images} index={openAt} onClose={() => setOpenAt(null)} />
    </>
  );
}

function Viewer({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [current, setCurrent] = useState(0);

  // Jump to the tapped image each time the viewer opens.
  useEffect(() => {
    if (index === null) return;
    setCurrent(index);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ x: index * width, animated: false }),
    );
  }, [index, width]);

  const go = (to: number) => {
    const next = Math.max(0, Math.min(images.length - 1, to));
    setCurrent(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const onScrollEnd = (x: number) => setCurrent(Math.round(x / width));

  return (
    <Modal
      visible={index !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => onScrollEnd(e.nativeEvent.contentOffset.x)}
          onScroll={(e) => Platform.OS === 'web' && onScrollEnd(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={64}
        >
          {images.map((uri, i) => (
            <Pressable key={`${uri}-${i}`} onPress={onClose} style={{ width, height }}>
              <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
            </Pressable>
          ))}
        </ScrollView>

        {/* top bar */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Txt variant="small" color="#FFFFFF" style={{ fontWeight: '700' }}>
              {current + 1} / {images.length}
            </Txt>
          </View>
          <RoundButton icon="close" onPress={onClose} label="Close" />
        </View>

        {/* Arrows: swiping already works on touch, these help on web/desktop. */}
        {images.length > 1 && (
          <>
            {current > 0 && (
              <View style={{ position: 'absolute', left: 12, top: height / 2 - 22 }}>
                <RoundButton icon="chevron-back" onPress={() => go(current - 1)} label="Previous" />
              </View>
            )}
            {current < images.length - 1 && (
              <View style={{ position: 'absolute', right: 12, top: height / 2 - 22 }}>
                <RoundButton icon="chevron-forward" onPress={() => go(current + 1)} label="Next" />
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

function RoundButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)',
      })}
    >
      <Ionicons name={icon} size={22} color="#FFFFFF" />
    </Pressable>
  );
}
