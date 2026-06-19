import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';

export interface ContextMenuAction {
  label: string;
  icon: string;
  onPress: () => void;
  color?: string;
  isDestructive?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onDismiss: () => void;
}

export function ContextMenu({
  visible,
  x,
  y,
  actions,
  onDismiss,
}: ContextMenuProps) {
  const colors = useColors();
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

  // Adjust position to keep menu on screen
  const menuWidth = 200;
  const menuHeight = actions.length * 50 + 16;

  let adjustedX = x - menuWidth / 2;
  let adjustedY = y;

  if (adjustedX < 8) adjustedX = 8;
  if (adjustedX + menuWidth > screenWidth - 8) adjustedX = screenWidth - menuWidth - 8;
  if (adjustedY + menuHeight > screenHeight - 100) adjustedY = screenHeight - menuHeight - 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.overlay}
        onPress={onDismiss}
      >
        <View
          style={[
            styles.menu,
            {
              left: adjustedX,
              top: adjustedY,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {actions.map((action, index) => (
            <Pressable
              key={index}
              onPress={() => {
                action.onPress();
                onDismiss();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: colors.primary + '20' },
                index !== actions.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <MaterialIcons
                name={action.icon as any}
                size={20}
                color={action.isDestructive ? colors.error : (action.color || colors.foreground)}
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: action.isDestructive ? colors.error : (action.color || colors.foreground),
                  },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
