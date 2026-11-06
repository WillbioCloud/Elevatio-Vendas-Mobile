import React, {
  ComponentType,
  createContext,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Types
export type TMaskedTabBarTheme = 'light' | 'dark';
export type TMaskedTabBarLayer = 'base' | 'active';

export interface IMaskedTabBox {
  readonly x: number;
  readonly width: number;
}

export interface IMaskedTabBoxEntry extends IMaskedTabBox {
  readonly value: string;
  readonly disabled: boolean;
}

export interface IMaskedTabBarPalette {
  readonly track: string;
  readonly pill: string;
  readonly inactive: string;
  readonly active: string;
}

export interface IMaskedTabIconState {
  readonly color: string;
  readonly size: number;
  readonly active: boolean;
}

export interface IMaskedTabBarContext {
  value: string;
  setValue: (value: string) => void;
  registerTrigger: (value: string, box: IMaskedTabBox, disabled: boolean) => void;
  boxes: IMaskedTabBoxEntry[];
  listWidth: number;
  setListWidth: (width: number) => void;
  pillX: SharedValue<number>;
  pillWidth: SharedValue<number>;
  press: SharedValue<number>;
  grabbed: SharedValue<boolean>;
  palette: IMaskedTabBarPalette;
  height: number;
  radius: number;
  padding: number;
  gap: number;
  iconSize: number;
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  draggable: boolean;
}

export interface IMaskedTabBarRoot {
  children: ReactNode;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly theme?: TMaskedTabBarTheme;
  readonly palette?: Partial<IMaskedTabBarPalette>;
  readonly height?: number;
  readonly radius?: number;
  readonly padding?: number;
  readonly gap?: number;
  readonly iconSize?: number;
  readonly fontSize?: number;
  readonly fontWeight?: TextStyle['fontWeight'];
  readonly draggable?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export interface IMaskedTabBarList {
  children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export interface IMaskedTabBarTrigger {
  children: ReactNode;
  readonly value: string;
  readonly disabled?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export interface IMaskedTabBarLabel {
  children: ReactNode;
  readonly style?: StyleProp<TextStyle>;
}

export interface IMaskedTabBarIcon {
  children: ReactNode | ((state: IMaskedTabIconState) => ReactNode);
  readonly size?: number;
  readonly style?: StyleProp<ViewStyle>;
}

// Helper createCompoundComponent
function createCompoundComponent<
  T extends ComponentType<any>,
  TCompound extends Record<string, unknown> = {},
>(name: string, component: T, compound: TCompound = {} as TCompound): T & TCompound {
  component.displayName = name;
  return Object.assign(component, compound);
}

// Constants
const DEFAULT_HEIGHT = 58;
const DEFAULT_PADDING = 4;
const DEFAULT_GAP = 4;
const DEFAULT_ICON_SIZE = 19;
const DEFAULT_FONT_SIZE = 11.5;
const DEFAULT_TRIGGER_PADDING_X = 6;
const DEFAULT_TRIGGER_GAP = 4;
const PRESS_GROW = 3;

const PILL_SPRING: WithSpringConfig = {
  damping: 28,
  stiffness: 160,
  mass: 0.5,
};

const PRESS_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 150,
  mass: 1,
};

const FOLLOW_STIFFNESS = 220;
const FOLLOW_DAMPING = 24;
const MAX_FRAME_SECONDS = 1 / 30;

const LIGHT_PALETTE: IMaskedTabBarPalette = {
  track: '#ffffff',
  pill: '#09090b',
  inactive: '#71717a',
  active: '#ffffff',
};

const DARK_PALETTE: IMaskedTabBarPalette = {
  track: '#121215',
  pill: '#0ea5e9',
  inactive: '#a1a1aa',
  active: '#ffffff',
};

const PALETTES: Record<TMaskedTabBarTheme, IMaskedTabBarPalette> = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
};

// Context
const MaskedTabBarContext = createContext<IMaskedTabBarContext | null>(null);

function useMaskedTabBar(part: string): IMaskedTabBarContext {
  const ctx = useContext(MaskedTabBarContext);
  if (!ctx) {
    throw new Error(`<${part}> must be rendered inside <MaskedTabBar>`);
  }
  return ctx;
}

const MaskedTabLayerContext = createContext<TMaskedTabBarLayer>('base');

function useMaskedTabLayer(): TMaskedTabBarLayer {
  return useContext(MaskedTabLayerContext);
}

// Worklets
function clampValue(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function boxAtX(list: IMaskedTabBoxEntry[], x: number): IMaskedTabBoxEntry | null {
  'worklet';
  for (let i = 0; i < list.length; i += 1) {
    const box = list[i];
    if (x >= box.x && x <= box.x + box.width) {
      return box.disabled ? null : box;
    }
  }
  return null;
}

function nearestBox(list: IMaskedTabBoxEntry[], center: number): IMaskedTabBoxEntry | null {
  'worklet';
  let best: IMaskedTabBoxEntry | null = null;
  let bestDistance = Number.MAX_VALUE;
  for (let i = 0; i < list.length; i += 1) {
    const box = list[i];
    if (box.disabled) continue;
    const distance = Math.abs(box.x + box.width / 2 - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = box;
    }
  }
  return best;
}

// Root Component
const MaskedTabBarRoot: React.FC<IMaskedTabBarRoot> = ({
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  theme = 'light',
  palette: paletteProp,
  height = DEFAULT_HEIGHT,
  radius,
  padding = DEFAULT_PADDING,
  gap = DEFAULT_GAP,
  iconSize = DEFAULT_ICON_SIZE,
  fontSize = DEFAULT_FONT_SIZE,
  fontWeight = '600',
  draggable = true,
  style,
}) => {
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? '');
  const value = isControlled ? (valueProp as string) : internalValue;

  const [boxMap, setBoxMap] = useState<Record<string, IMaskedTabBox & { disabled: boolean }>>({});
  const [listWidth, setListWidth] = useState<number>(0);

  const pillX = useSharedValue<number>(0);
  const pillWidth = useSharedValue<number>(0);
  const press = useSharedValue<number>(0);
  const grabbed = useSharedValue<boolean>(false);

  const palette = useMemo<IMaskedTabBarPalette>(
    () => ({ ...PALETTES[theme], ...paletteProp }),
    [theme, paletteProp]
  );

  const setValue = useCallback(
    (next: string) => {
      if (next === value) return;
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [value, isControlled, onValueChange]
  );

  const registerTrigger = useCallback((key: string, box: IMaskedTabBox, disabled: boolean) => {
    setBoxMap((prev) => {
      const current = prev[key];
      if (
        current &&
        current.disabled === disabled &&
        Math.abs(current.x - box.x) < 0.5 &&
        Math.abs(current.width - box.width) < 0.5
      ) {
        return prev;
      }
      return { ...prev, [key]: { ...box, disabled } };
    });
  }, []);

  const boxes = useMemo<IMaskedTabBoxEntry[]>(
    () =>
      Object.entries(boxMap)
        .map(([key, box]) => ({ ...box, value: key }))
        .sort((a, b) => a.x - b.x),
    [boxMap]
  );

  useEffect(() => {
    if (value || boxes.length === 0) return;
    setValue(boxes[0].value);
  }, [value, boxes, setValue]);

  const activeBox = boxMap[value];
  const placedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!activeBox) return;
    if (grabbed.value) return;
    if (!placedRef.current) {
      placedRef.current = true;
      pillX.value = activeBox.x;
      pillWidth.value = activeBox.width;
      return;
    }
    pillX.value = withSpring(activeBox.x, PILL_SPRING);
    pillWidth.value = withSpring(activeBox.width, PILL_SPRING);
  }, [activeBox, pillX, pillWidth, grabbed]);

  const ctx = useMemo<IMaskedTabBarContext>(
    () => ({
      value,
      setValue,
      registerTrigger,
      boxes,
      listWidth,
      setListWidth,
      pillX,
      pillWidth,
      press,
      grabbed,
      palette,
      height,
      radius: radius ?? height / 2,
      padding,
      gap,
      iconSize,
      fontSize,
      fontWeight,
      draggable,
    }),
    [
      value,
      setValue,
      registerTrigger,
      boxes,
      listWidth,
      pillX,
      pillWidth,
      press,
      grabbed,
      palette,
      height,
      radius,
      padding,
      gap,
      iconSize,
      fontSize,
      fontWeight,
      draggable,
    ]
  );

  return (
    <MaskedTabBarContext.Provider value={ctx}>
      <View
        style={[
          styles.root,
          {
            height,
            borderRadius: radius ?? height / 2,
            backgroundColor: palette.track,
            padding,
          },
          style,
        ]}
      >
        {children}
      </View>
    </MaskedTabBarContext.Provider>
  );
};

// List Component
const MaskedTabBarList: React.FC<IMaskedTabBarList> = ({ children, style }) => {
  const {
    boxes,
    setValue,
    setListWidth,
    listWidth,
    pillX,
    pillWidth,
    press,
    grabbed,
    palette,
    radius,
    padding,
    gap,
    draggable,
  } = useMaskedTabBar('MaskedTabBar.List');

  const boxesValue = useSharedValue<IMaskedTabBoxEntry[]>([]);
  useEffect(() => {
    boxesValue.value = boxes;
  }, [boxes, boxesValue]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setListWidth(e.nativeEvent.layout.width),
    [setListWidth]
  );
  const grabOffset = useSharedValue<number>(0);
  const dragTarget = useSharedValue<number>(0);
  const dragVelocity = useSharedValue<number>(0);
  const hoveredValue = useSharedValue<string>('');
  const listWidthValue = useSharedValue<number>(0);

  useEffect(() => {
    listWidthValue.value = listWidth;
  }, [listWidth, listWidthValue]);

  const follow = useFrameCallback((frame) => {
    if (!grabbed.value) return;
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, MAX_FRAME_SECONDS);
    const displacement = dragTarget.value - pillX.value;
    const velocity =
      dragVelocity.value + (FOLLOW_STIFFNESS * displacement - FOLLOW_DAMPING * dragVelocity.value) * dt;
    dragVelocity.value = velocity;
    pillX.value = pillX.value + velocity * dt;
  }, false);

  const setFollowActive = useCallback(
    (active: boolean) => follow.setActive(active),
    [follow]
  );

  useAnimatedReaction(
    () => grabbed.value,
    (isGrabbed, wasGrabbed) => {
      if (isGrabbed !== wasGrabbed) scheduleOnRN(setFollowActive, isGrabbed);
    }
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin((e) => {
          press.value = withSpring(1, PRESS_SPRING);
          hoveredValue.value = '';

          const inside = e.x >= pillX.value && e.x <= pillX.value + pillWidth.value;
          grabbed.value = draggable && inside;
          grabOffset.value = pillX.value - e.x;
          if (grabbed.value) {
            dragTarget.value = pillX.value;
            dragVelocity.value = 0;
            return;
          }

          const tapped = boxAtX(boxesValue.value, e.x);
          if (tapped) scheduleOnRN(setValue, tapped.value);
        })
        .onUpdate((e) => {
          if (!grabbed.value) return;

          dragTarget.value = clampValue(
            e.x + grabOffset.value,
            0,
            Math.max(listWidthValue.value - pillWidth.value, 0)
          );
          const over = nearestBox(boxesValue.value, dragTarget.value + pillWidth.value / 2);
          if (over && over.value !== hoveredValue.value) {
            hoveredValue.value = over.value;
            pillWidth.value = withSpring(over.width, PILL_SPRING);
          }
        })
        .onFinalize(() => {
          press.value = withSpring(0, PRESS_SPRING);
          if (!grabbed.value) return;
          grabbed.value = false;

          const box = nearestBox(boxesValue.value, pillX.value + pillWidth.value / 2);
          if (!box) return;

          pillX.value = withSpring(box.x, {
            ...PILL_SPRING,
            velocity: dragVelocity.value,
          });
          pillWidth.value = withSpring(box.width, PILL_SPRING);
          dragVelocity.value = 0;
          scheduleOnRN(setValue, box.value);
        }),
    [
      boxesValue,
      listWidthValue,
      grabbed,
      grabOffset,
      dragTarget,
      dragVelocity,
      hoveredValue,
      pillX,
      pillWidth,
      press,
      setValue,
      draggable,
    ]
  );

  const clipStyle = useAnimatedStyle<Pick<ViewStyle, 'width' | 'transform'>>(() => {
    const grow = press.value * PRESS_GROW;
    return {
      width: pillWidth.value + grow * 2,
      transform: [{ translateX: pillX.value - grow }],
    };
  });

  const innerStyle = useAnimatedStyle<Pick<ViewStyle, 'transform'>>(() => {
    const grow = press.value * PRESS_GROW;
    return { transform: [{ translateX: -(pillX.value - grow) }] };
  });

  const rowStyle = useMemo<ViewStyle>(() => ({ gap }), [gap]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.list, style]} onLayout={onLayout}>
        <MaskedTabLayerContext.Provider value="base">
          <View style={[styles.row, rowStyle]}>{children}</View>
        </MaskedTabLayerContext.Provider>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.clip,
            {
              borderRadius: Math.max(radius - padding, 0),
              backgroundColor: palette.pill,
            },
            clipStyle,
          ]}
        >
          <Animated.View style={[styles.row, rowStyle, { width: listWidth }, innerStyle]}>
            <MaskedTabLayerContext.Provider value="active">
              {children}
            </MaskedTabLayerContext.Provider>
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

// Trigger Component
const MaskedTabBarTrigger: React.FC<IMaskedTabBarTrigger> = ({
  children,
  value,
  disabled = false,
  style,
}) => {
  const { registerTrigger } = useMaskedTabBar('MaskedTabBar.Trigger');
  const layer = useMaskedTabLayer();

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (layer !== 'base') return;
      const { x, width } = e.nativeEvent.layout;
      registerTrigger(value, { x, width }, disabled);
    },
    [layer, registerTrigger, value, disabled]
  );

  return (
    <View onLayout={onLayout} style={[styles.trigger, disabled ? styles.disabled : null, style]}>
      {children}
    </View>
  );
};

// Label Component
const MaskedTabBarLabel: React.FC<IMaskedTabBarLabel> = ({ children, style }) => {
  const { palette, fontSize, fontWeight } = useMaskedTabBar('MaskedTabBar.Label');
  const layer = useMaskedTabLayer();

  return (
    <Text
      numberOfLines={1}
      style={[
        {
          fontSize,
          fontWeight,
          color: layer === 'active' ? palette.active : palette.inactive,
        } as TextStyle,
        style,
      ]}
    >
      {children}
    </Text>
  );
};

// Icon Component
const MaskedTabBarIcon: React.FC<IMaskedTabBarIcon> = ({ children, size, style }) => {
  const { palette, iconSize } = useMaskedTabBar('MaskedTabBar.Icon');
  const layer = useMaskedTabLayer();
  const active = layer === 'active';
  const resolvedSize = size ?? iconSize;

  const content =
    typeof children === 'function'
      ? children({
          color: active ? palette.active : palette.inactive,
          size: resolvedSize,
          active,
        })
      : children;

  return (
    <View style={[styles.icon, { width: resolvedSize, height: resolvedSize }, style]}>
      {content}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DEFAULT_TRIGGER_GAP,
    paddingHorizontal: DEFAULT_TRIGGER_PADDING_X,
    height: '100%',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

export const MaskedTabBar = createCompoundComponent(
  'MaskedTabBar',
  memo(MaskedTabBarRoot),
  {
    List: createCompoundComponent('MaskedTabBar.List', MaskedTabBarList),
    Trigger: createCompoundComponent('MaskedTabBar.Trigger', MaskedTabBarTrigger),
    Label: createCompoundComponent('MaskedTabBar.Label', MaskedTabBarLabel),
    Icon: createCompoundComponent('MaskedTabBar.Icon', MaskedTabBarIcon),
  }
);

export default MaskedTabBar;
