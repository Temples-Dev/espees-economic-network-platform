import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from './use-debounced-value';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('holds the old value until the delay has passed', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('restarts the wait when the value changes again', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: 'abc' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });
});
