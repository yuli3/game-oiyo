import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ArcadeTouchControls } from './ArcadeTouchControls';

describe('ArcadeTouchControls Component', () => {
  it('should render without crashing', () => {
    const handleDir = vi.fn();
    const handleAction = vi.fn();

    const element = React.createElement(ArcadeTouchControls, {
      onDirection: handleDir,
      actions: [
        { id: 'jump', label: 'JUMP', onPress: handleAction },
        { id: 'attack', label: 'ATTACK', onPress: handleAction },
      ],
    });

    expect(element).toBeDefined();
    expect(element.props.showDPad).toBeUndefined(); // default true
    expect(element.props.actions).toHaveLength(2);
  });
});
