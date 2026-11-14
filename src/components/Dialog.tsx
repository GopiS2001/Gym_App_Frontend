import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Txt } from './ui';

export type DialogTone = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Extra lines rendered as a bulleted summary — handy for delete counts. */
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Hides the cancel button, turning this into an acknowledgement. */
  acknowledge?: boolean;
}

interface DialogState extends ConfirmOptions {
  visible: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogContextValue {
  /** Resolves true when confirmed, false when cancelled or dismissed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Single-button notice. Resolves when dismissed. */
  notify: (options: Omit<ConfirmOptions, 'acknowledge'>) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

const DEFAULT_ICONS: Record<DialogTone, keyof typeof Ionicons.glyphMap> = {
  danger: 'trash-outline',
  warning: 'alert-circle-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ visible: false, title: '' });

  const close = useCallback(
    (result: boolean) => {
      state.resolve?.(result);
      setState((s) => ({ ...s, visible: false, resolve: undefined }));
    },
    [state],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, visible: true, resolve });
      }),
    [],
  );

  const notify = useCallback(
    (options: Omit<ConfirmOptions, 'acknowledge'>) =>
      confirm({ ...options, acknowledge: true }),
    [confirm],
  );

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmDialog state={state} onClose={close} />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside a DialogProvider');
  return ctx;
}

/** Shorthand for the common case. */
export function useConfirm() {
  return useDialog().confirm;
}

// ------------------------------------------------------------------ dialog

function ConfirmDialog({
  state,
  onClose,
}: {
  state: DialogState;
  onClose: (result: boolean) => void;
}) {
  const { theme, spacing, radius } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  const tone: DialogTone = state.tone || 'warning';

  useEffect(() => {
    if (!state.visible) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    }).start();

    if (Platform.OS !== 'web') {
      const style =
        tone === 'danger'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success;
      Haptics.notificationAsync(style).catch(() => undefined);
    }
  }, [state.visible, anim, tone]);

  const accent =
    tone === 'danger'
      ? theme.danger
      : tone === 'success'
        ? theme.success
        : tone === 'info'
          ? theme.hydration
          : theme.streak;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => onClose(false)}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        {/* Blurred, dimmed backdrop. Tapping it cancels. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onClose(false)}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,11,0.6)' }]} />
            </BlurView>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,11,0.78)' }]} />
          )}
        </Pressable>

        <Animated.View
          style={{
            width: '100%',
            maxWidth: 380,
            opacity: anim,
            transform: [{ scale }],
          }}
        >
          <View
            style={{
              borderRadius: radius.xxl,
              overflow: 'hidden',
              backgroundColor: theme.cardElevated,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: theme.glassBorder,
              shadowColor: '#000',
              shadowOpacity: 0.45,
              shadowRadius: 34,
              shadowOffset: { width: 0, height: 18 },
              elevation: 24,
            }}
          >
            {/* tone wash behind the icon */}
            <LinearGradient
              colors={[`${accent}2E`, 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
            />

            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${accent}22`,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: `${accent}44`,
                  marginBottom: spacing.base,
                }}
              >
                <Ionicons
                  name={state.icon || DEFAULT_ICONS[tone]}
                  size={27}
                  color={accent}
                />
              </View>

              <Txt variant="h3" align="center">
                {state.title}
              </Txt>

              {state.message ? (
                <Txt
                  variant="small"
                  color={theme.textSecondary}
                  align="center"
                  style={{ marginTop: spacing.sm, lineHeight: 19 }}
                >
                  {state.message}
                </Txt>
              ) : null}

              {state.details?.length ? (
                <ScrollView
                  style={{ maxHeight: 150, alignSelf: 'stretch' }}
                  contentContainerStyle={{
                    marginTop: spacing.base,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: theme.surfaceMuted,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {state.details.map((line, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginBottom: i === state.details!.length - 1 ? 0 : 5,
                      }}
                    >
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: accent,
                          marginTop: 7,
                          marginRight: spacing.sm,
                        }}
                      />
                      <Txt variant="small" color={theme.textSecondary} style={{ flex: 1 }}>
                        {line}
                      </Txt>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginTop: spacing.xl,
                  alignSelf: 'stretch',
                }}
              >
                {!state.acknowledge && (
                  <Button
                    title={state.cancelLabel || 'Cancel'}
                    variant="glass"
                    style={{ flex: 1 }}
                    onPress={() => onClose(false)}
                  />
                )}
                <Button
                  title={state.confirmLabel || (state.acknowledge ? 'OK' : 'Confirm')}
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  style={{ flex: state.acknowledge ? 1 : 1.25 }}
                  onPress={() => onClose(true)}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
